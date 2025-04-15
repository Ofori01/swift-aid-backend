import { getRecommendation } from "../../Ai-requests/recommendations.mjs";
import { filterAvailableResponders, getAvailableResources } from "../../responder-management/services/responder.mjs";
import emergencyRequestModel from "../models/emergency-request-schema.mjs";


export async function getAiRecommendations(req, res) {
    try {
        const {request_id} = req.body;
        //fetch request from db
        const request = await emergencyRequestModel.findOne({request_id});

        //find available responders in specified range
        const available_resources = await getAvailableResources(request.emergency_location.coordinates[1], request.emergency_location.coordinates[0]);
        
        //get recommendations based on available resources
        const recommendations =  await getRecommendation(request.description, request.image, available_resources);
        console.log(recommendations, available_resources)
        console.log(filterAvailableResponders(available_resources,recommendations.recommended_resources));
        res.status(201).json({ message: 'Emergency request created successfully' });

    } catch (error) {
        console.log('Error finding getting ai recommendation',error);
        return res.status(500).json({ message: 'Error getting responders' });
    }
} 