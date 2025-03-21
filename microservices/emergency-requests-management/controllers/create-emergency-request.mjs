import emergencyRequestModel from "../models/emergency-request-schema.mjs";

export async function createEmergencyRequest(req, res,next) {
    const { user_description,emergency_location, imageUrl, emergency_type,  } = req.body;
    if (!user_description || !emergency_location || !emergency_type) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    try {
        const locationArray = JSON.parse(emergency_location);
        const formattedLocation = {
            type: "Point",
            coordinates: locationArray
        };
        const request = new emergencyRequestModel({
            description: user_description,
            emergency_location: formattedLocation,
            image: imageUrl,
            emergency_type,
            user_id: "60e4ca62d5713d4328d1b2c3"
        })
        const savedRequest = await request.save();
        req.body.request_id = savedRequest.request_id;
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error processing emergency. Please try again later'});
    }
    next();
    
}