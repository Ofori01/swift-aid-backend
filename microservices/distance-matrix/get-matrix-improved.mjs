import { configDotenv } from "dotenv";
import axios from "axios";
configDotenv();

// Calculate straight-line distance between two coordinates in kilometers
function calculateStraightLineDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

export async function getDistanceMatrix(req, res, next) {
  const { recommendations, available_resources, emergency_location } = req.body;
  const MAPBOX_TOKEN =
    "sk.eyJ1IjoidWJhaWRhIiwiYSI6ImNtZTdlNHQzbTAzN2MyanM2bHFkNmFnajUifQ.C3-XGhzMsv8sGZU1g03ciw";

  try {
    const emergency_coords = JSON.parse(emergency_location);
    const selectedResponders = {};

    for (const agency in available_resources) {
      const responders = available_resources[agency];

      // Calculate travel time for each responder
      const respondersWithTime = await Promise.all(
        responders.map(async (responder) => {
          try {
            const responderCoords = responder.current_location.coordinates;

            // First try Matrix API (better for multiple calculations)
            const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${responderCoords[0]},${responderCoords[1]};${emergency_coords[0]},${emergency_coords[1]}?sources=0&destinations=1&access_token=${MAPBOX_TOKEN}`;

            console.log(`Trying Matrix API for ${responder.name}`);

            let response = await axios.get(matrixUrl);
            let routeData = response.data;

            console.log(
              `Matrix API response for ${responder.name}:`,
              JSON.stringify(routeData, null, 2)
            );

            let travelTime = Infinity;

            // Check Matrix API response
            if (
              routeData.durations &&
              routeData.durations[0] &&
              routeData.durations[0][0] > 0
            ) {
              travelTime = routeData.durations[0][0];
              console.log(`✅ Valid matrix route for ${responder.name}:`, {
                from: responderCoords,
                to: emergency_coords,
                duration: travelTime,
                distance: routeData.distances
                  ? routeData.distances[0][0]
                  : "N/A",
              });
            } else {
              // Fallback to Directions API
              console.log(
                `⚠️ Matrix API failed for ${responder.name}, trying Directions API...`
              );

              const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${responderCoords[0]},${responderCoords[1]};${emergency_coords[0]},${emergency_coords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

              try {
                response = await axios.get(directionsUrl);
                routeData = response.data;

                if (
                  routeData.routes &&
                  routeData.routes.length > 0 &&
                  routeData.routes[0].duration > 0
                ) {
                  travelTime = routeData.routes[0].duration;
                  console.log(
                    `✅ Valid directions route for ${responder.name}:`,
                    {
                      from: responderCoords,
                      to: emergency_coords,
                      duration: travelTime,
                      distance: routeData.routes[0].distance,
                    }
                  );
                } else {
                  // Both APIs failed, use straight-line distance
                  const distance = calculateStraightLineDistance(
                    responderCoords,
                    emergency_coords
                  );
                  travelTime = (distance / 30) * 3600; // 30 km/h average speed
                  console.log(
                    `🔄 Both APIs failed for ${responder.name}, using straight-line distance:`,
                    {
                      from: responderCoords,
                      to: emergency_coords,
                      straightLineDistance: distance,
                      estimatedTravelTime: travelTime,
                    }
                  );
                }
              } catch (directionsError) {
                // Directions API also failed, use straight-line distance
                const distance = calculateStraightLineDistance(
                  responderCoords,
                  emergency_coords
                );
                travelTime = (distance / 30) * 3600;
                console.log(
                  `🔄 Directions API error for ${responder.name}, using straight-line:`,
                  {
                    error:
                      directionsError.response?.data || directionsError.message,
                    straightLineDistance: distance,
                    estimatedTravelTime: travelTime,
                  }
                );
              }
            }

            return { responder, travelTime };
          } catch (error) {
            console.warn(
              `❌ Failed to get route for responder ${responder.name}:`,
              error.response?.data || error.message
            );

            // Final fallback to straight-line distance
            const distance = calculateStraightLineDistance(
              responder.current_location.coordinates,
              emergency_coords
            );
            const travelTime = (distance / 30) * 3600;

            return { responder, travelTime };
          }
        })
      );

      // Sort by travel time (shortest first)
      respondersWithTime.sort((a, b) => a.travelTime - b.travelTime);

      // Select the required number of responders for this agency
      const count = recommendations.recommended_resources[agency] || 0;
      selectedResponders[agency] = respondersWithTime
        .slice(0, count)
        .map((item) => ({
          ...item.responder._doc,
          travelTime:
            item.travelTime === Infinity
              ? null
              : item.travelTime < 1
              ? Math.max(1, Math.ceil(item.travelTime))
              : Math.round(item.travelTime),
        }));
    }

    //! notify all responders using socket io and add emergency details

    if (selectedResponders) {
      const response = {
        responders: selectedResponders,
        emergency_id: req.body.request_id,
        emergency_details: {
          emergency_type: req.body.emergency_type,
          emergency_description: req.body.user_description,
          emergency_location: req.body.emergency_location,
        },
      };

      res.status(200).send({
        message:
          "Emergency request created successfully. We will notify you on help headed your way!",
        response,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error calculating distance matrix",
      error: error.message,
    });
    console.error(
      "Error Finding responders close to you. Please try again later:",
      error
    );
  }
}
