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

      try {
        // Build coordinates array for Matrix API
        const coordinates = [];

        // Add all responder locations as sources (indices 0, 1, 2, ...)
        responders.forEach((responder) => {
          coordinates.push([
            responder.current_location.coordinates[0],
            responder.current_location.coordinates[1],
          ]);
        });

        // Add emergency location as destination (last index)
        const destinationIndex = coordinates.length;
        coordinates.push([emergency_coords[0], emergency_coords[1]]);

        // Create sources and destinations strings
        const sources = responders.map((_, index) => index).join(";"); // "0;1;2;3..."
        const destinations = destinationIndex.toString(); // "4" (for example)

        // Build coordinates string for API
        const coordinatesStr = coordinates
          .map((coord) => coord.join(","))
          .join(";");

        // Call Matrix API with all responders at once
        const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinatesStr}?sources=${sources}&destinations=${destinations}&access_token=${MAPBOX_TOKEN}`;

        console.log(
          `🔄 Calling Matrix API for ${agency} (${responders.length} responders)`
        );

        const response = await axios.get(matrixUrl);
        const matrixData = response.data;

        // Process the matrix response
        const respondersWithTime = responders.map((responder, i) => {
          let travelTime = Infinity;
          let routeType = "estimated"; // 'routed' or 'estimated'

          if (
            matrixData.durations &&
            matrixData.durations[i] &&
            matrixData.durations[i][0] !== null
          ) {
            travelTime = matrixData.durations[i][0];
            routeType = "routed";
          } else {
            // Fallback to straight-line distance for this responder
            const distance = calculateStraightLineDistance(
              responder.current_location.coordinates,
              emergency_coords
            );
            travelTime = (distance / 30) * 3600; // 30 km/h average speed
            routeType = "estimated";
          }

          return { responder, travelTime, routeType };
        });

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
            routeType: item.routeType, // 'routed' for actual routes, 'estimated' for straight-line
          }));
      } catch (error) {
        console.error(
          `❌ Matrix API failed for ${agency}:`,
          error.response?.data || error.message
        );

        // Fallback: calculate straight-line distance for all responders in this agency
        const respondersWithTime = responders.map((responder) => {
          const distance = calculateStraightLineDistance(
            responder.current_location.coordinates,
            emergency_coords
          );
          const travelTime = (distance / 30) * 3600;

          return { responder, travelTime, routeType: "estimated" };
        });

        // Sort and select as usual
        respondersWithTime.sort((a, b) => a.travelTime - b.travelTime);
        const count = recommendations.recommended_resources[agency] || 0;
        selectedResponders[agency] = respondersWithTime
          .slice(0, count)
          .map((item) => ({
            ...item.responder._doc,
            travelTime:
              item.travelTime < 1
                ? Math.max(1, Math.ceil(item.travelTime))
                : Math.round(item.travelTime),
            routeType: item.routeType,
          }));
      }
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

      // Attach response data to req.body for saveEmergencyInfo middleware
      req.body.response = response;

      next();
    } else {
      res.status(404).json({
        message: "No responders found in the area",
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
