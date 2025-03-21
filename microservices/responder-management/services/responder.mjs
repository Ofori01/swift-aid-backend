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


export const getAvailableResources = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const maxDistance = 30000; 

        const responders = await responderModel.find({
            status: "available",
            current_location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [longitude, latitude] },
                    $maxDistance: maxDistance
                }
            }
        });

        const resourceCounts = {
            ambulances: responders.filter(r => r.agency === "Ambulance").length,
            fire_trucks: responders.filter(r => r.agency === "Fire Service").length,
            police_units: responders.filter(r => r.agency === "Police").length
        };

        return res.status(200).json({
            message: "Available responders found",
            available_resources: resourceCounts,
            responders
        });
    } catch (error) {
        console.error("Error fetching available resources:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getExactResponders = async (req, res) => {
    try {
        const { latitude, longitude, recommendedResources } = req.body;
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

        return res.status(200).json({
            message: "Assigned responders based on AI recommendation",
            assigned_responders: assignedResponders
        });
    } catch (error) {
        console.error("Error fetching exact responders:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};