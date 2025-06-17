import { getRecommendation } from "../../Ai-requests/recommendations.mjs";
import { filterAvailableResponders, getAvailableResources } from "../../responder-management/services/responder.mjs";
import emergencyRequestModel from "../models/emergency-request-schema.mjs";


export async function getAiRecommendations(req, res,next) {
    try {
        //! To improve speed pass req info in the the request body instead of fetching from db again. Maybe later
        const {request_id} = req.body;
        //fetch request from db
        const request = await emergencyRequestModel.findOne({request_id});

        //find available responders in specified range
        const available_resources = await getAvailableResources(request.emergency_location.coordinates[1], request.emergency_location.coordinates[0]);
        // console.log("Available Resources 30km", available_resources )
        if (!available_resources){
            throw new Error("Available responders not found 30km around emergency location")
        }

        
        //get recommendations based on available resources
        const recommendations =  await getRecommendation(request.description, request.image, available_resources.available_resources);

        // console.log("AI recommendations", recommendations)
        req.body.recommendations = recommendations
        req.body.available_resources = filterAvailableResponders(available_resources,recommendations.recommended_resources);

        // console.log("Filtered Responders",req.body.available_resources)
        next();
        //! consider saving recommendations to the database for future reference
    } catch (error) {
        console.log('Error getting recommendations',error);
        return res.status(500).json({ message: 'Error Finding responders, Please try again later' });
    }
} 