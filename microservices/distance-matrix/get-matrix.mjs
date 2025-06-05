import { configDotenv } from "dotenv";
import googleDistanceMatrix from "google-distance-matrix";
configDotenv();


export async function getDistanceMatrix(req, res, next) {
    const { recommendations, available_resources, emergency_location } = req.body;
    console.log(recommendations, emergency_location);
    googleDistanceMatrix.key(process.env.DISTANCE_MATRIX_KEY)
    
    try {
        const emergency_coords = JSON.parse(emergency_location);
        const selectedResponders = {};
        for (const agency in available_resources) {
            const responders = available_resources[agency];
            const origins = responders.map(r => r.current_location.coordinates.join(','));
            const destination = emergency_coords.join(',');
            const destinations = [destination];
            googleDistanceMatrix.mode = 'driving';
            
            const distanceMatrix = await new Promise((resolve, reject) => {
                googleDistanceMatrix.matrix(origins, destinations, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            console.log('Distance Matrix response:', JSON.stringify(distanceMatrix, null, 2));
            
            const respondersWithTime = responders.map((responder, i) => {
                const element = distanceMatrix.rows[i]?.elements[0];
                if (!element || element.status !== 'OK') {
                    console.warn(`No valid travel time for origin index ${i}:`, element);
                }
                const travelTime = element && element.duration && element.duration.value ? element.duration.value : Infinity;
                return { responder, travelTime };
            });
            respondersWithTime.sort((a, b) => a.travelTime - b.travelTime);
            console.log(respondersWithTime)
            
            const count = recommendations.recommended_resources[agency] || 0;
            selectedResponders[agency] = respondersWithTime.slice(0, count).map(item => item.responder);
        }
        // res.json({ selectedResponders });
        console.log('Selected Responders:', selectedResponders);
    } catch (error) {
        res.status(500).json({ message: 'Error calculating distance matrix', error });
        console.error('Error calculating distance matrix:', error);
    }
}
