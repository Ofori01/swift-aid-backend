import responderModel from "../models/responder-schema.mjs";


export async function findResponderByEmail(email){
    try {
        const responder = await responderModel.findOne({email})
        return responder;
    }catch(error){
        console.log(error);
        throw new Error("Error finding responder by email");
    }
}

export async function findResponderByBadgeNumber(number){
    try {
        const responder  = await responderModel.findOne({badgeNumber: number})
        return responder
        
    } catch (error) {
        throw new Error("Error finding responder")
        
    }
}


export async function getAvailableResources(latitude, longitude) {
    try {
        const maxDistance = 30000; 
        const responders = await responderModel.find({
            status: "available",
            current_location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [longitude, latitude] },
                    $maxDistance: maxDistance
                }
            }
        },{email:0, password:0, __v:0, status:0, created_at:0, updated_at:0, name: 0, phone: 0});

        const resourceCounts = {
            ambulances: responders.filter(r => r.agency === "Ambulance").length,
            fire_trucks: responders.filter(r => r.agency === "Fire Service").length,
            police_units: responders.filter(r => r.agency === "Police").length
        };

        return {
            available_resources: resourceCounts,
            responders
        }
    } catch (error) {
        console.error("Error fetching available resources:", error);
        throw new Error("Error fetching available resources");}
};


export function filterAvailableResponders(availableResponders, recommendedResources) {
    try {
        const agencyMap = {
            fire_trucks: "Fire Service",
            police_units: "Police",
            ambulances: "Ambulance"
        };

        const groupedResponders = {};

        for (const key of Object.keys(recommendedResources)) {
            if (recommendedResources[key] > 0) { // Only filter if recommended count is greater than 0
                const agencyName = agencyMap[key];
                const responders = availableResponders.responders.filter(
                    responder => responder.agency === agencyName 
                );
                groupedResponders[key] = responders;
            }
        }

        return groupedResponders;
    } catch (error) {
        console.error("Error grouping responders:", error);
        throw new Error("Failed to group responders");
    }
}
