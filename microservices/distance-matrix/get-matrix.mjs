import { configDotenv } from "dotenv";
import googleDistanceMatrix from "google-distance-matrix";
configDotenv();


export async function getDistanceMatrix(req, res, next) {
    const { recommendations, available_resources, emergency_location } = req.body;
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
            // console.log('Distance Matrix response:', JSON.stringify(distanceMatrix, null, 2));
            
            const respondersWithTime = responders.map((responder, i) => {
                const element = distanceMatrix.rows[i]?.elements[0];
                if (!element || element.status !== 'OK') {
                    console.warn(`No valid travel time for origin index ${i}:`, element);
                }
                const travelTime = element && element.duration && element.duration.value ? element.duration.value : Infinity;
                return { responder, travelTime };
            });
            respondersWithTime.sort((a, b) => a.travelTime - b.travelTime);
            
            const count = recommendations.recommended_resources[agency] || 0;
            selectedResponders[agency] = respondersWithTime.slice(0, count).map(item => ({
                ...item.responder._doc,
                travelTime: item.travelTime
            }));
        }
        // res.json({ selectedResponders });

        //! notify all responders using socket io and add emergency details


        if(selectedResponders){
            const response = {
                responders : selectedResponders,
                emergency_id : req.body.request_id, 
                emergency_details: {
                    emergency_type: req.body.emergency_type,
                    emergency_description : req.body.user_description,
                    emergency_location: req.body.emergency_location
                }
            }

            res.status(200).send({message: "Emergency request created successfully. We will notify you on help headed your way!", response})
        }
    } catch (error) {
        res.status(500).json({ message: 'Error calculating distance matrix', error });
        console.error('Error Finding responders close to you. Please try again later:', error);
    }
}
