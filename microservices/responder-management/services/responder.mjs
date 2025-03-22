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
        },{email:0, password:0, __v:0, current_location:0, status:0, created_at:0, updated_at:0, name: 0, phone: 0});

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


export async function getExactResponders(latitude, longitude, recommendedResources) {
    try {
        
        let assignedResponders = [];

        for (const [agency, count] of Object.entries(recommendedResources)) {
            const responders = await responderModel.find({
                status: "available",
                agency: agency === "fire_trucks" ? "Fire Service" : 
                        agency === "police_units" ? "Police" : "Ambulance",
                current_location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [longitude, latitude] },
                        $maxDistance: 30000 
                    }
                }
            }).limit(count); // Get the exact number of responders needed

            assignedResponders.push(...responders);
        }

        return assignedResponders;
    } catch (error) {
        console.error("Error fetching exact responders:", error);
        throw new Error("Error fetching exact responders");}
};