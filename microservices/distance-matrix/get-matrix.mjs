import { configDotenv } from "dotenv";
import googleDistanceMatrix from "google-distance-matrix";
configDotenv();
export async function getDistanceMatrix(req, res, next) {
    const { recommendations, available_resources, emergency_location } = req.body;
    console.log(recommendations, available_resources.responders[0].current_location, emergency_location);

    var origins = ["San Francisco CA", "40.7421,-73.9914"];
    var destinations = [
        "New York NY",
        "Montreal",
        "41.8337329,-87.7321554",
        "Honolulu",
    ];
    googleDistanceMatrix.key(process.env.DISTANCE_MATRIX_KEY);

    googleDistanceMatrix.matrix(origins, destinations, function (err, distances) {
        if (err) {
            return console.log(err);
        }
        if (!distances) {
            return console.log("no distances");
        }
        if (distances.status == "OK") {
            // console.log(distances);
            for (let i = 0; i < origins.length; i++) {
                for (let j = 0; j < destinations.length; j++) {
                    const origin = distances.origin_addresses[i];
                    const destination = distances.destination_addresses[j];
                    const element = distances.rows[i].elements[j];
                    if (element.status === "OK") {
                        // Get travel time from the duration field
                        const travelTime = element.duration.text;
                        console.log(`Travel time from ${origin} to ${destination} is ${travelTime}`);
                    } else {
                        console.log(`${destination} is not reachable by land from ${origin}`);
                    }
                }
            }
        }
    });
}
