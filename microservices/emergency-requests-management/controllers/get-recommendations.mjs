import { getRecommendation } from "../../Ai-requests/recommendations.mjs";
import { filterAvailableResponders, getAvailableResources } from "../../responder-management/services/responder.mjs";
import emergencyRequestModel from "../models/emergency-request-schema.mjs";


export async function getAiRecommendations(req, res,next) {
    try {
        const {request_id} = req.body;
        //fetch request from db
        const request = await emergencyRequestModel.findOne({request_id});

        //find available responders in specified range
        const available_resources = await getAvailableResources(request.emergency_location.coordinates[1], request.emergency_location.coordinates[0]);
        if (!available_resources){
            throw new Error("Available responders not found 30km around emergency location")
        }

        
        //get recommendations based on available resources
        const recommendations =  await getRecommendation(request.description, request.image, available_resources.available_resources);
        req.body.recommendations = recommendations
        console.log(filterAvailableResponders(available_resources,recommendations.recommended_resources));
      
        req.body.available_resources = available_resources;
        next();
        // consider saving recommendations to the database for future reference
    } catch (error) {
        console.log('Error getting recommendations',error);
        return res.status(500).json({ message: 'Error Finding responders, Please try again later' });
    }
} 