import emergencyRequestModel from "../models/emergency-request-schema.mjs";

export async function createEmergencyRequest(req, res, next) {
  const { user_description, emergency_location, imageUrl, emergency_type } =
    req.body;
  if (!user_description || !emergency_location || !emergency_type) {
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  }

  // Check if user is authenticated
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const locationArray = JSON.parse(emergency_location);
    const formattedLocation = {
      type: "Point",
      coordinates: locationArray,
    };
    const request = new emergencyRequestModel({
      description: user_description,
      emergency_location: formattedLocation,
      image: imageUrl,
      emergency_type,
      user_id: req.user.user_id,
    });
    const savedRequest = await request.save();
    req.body.request_id = savedRequest.request_id;

    console.log(`✅ Emergency request created for user ${req.user.user_id}:`, {
      request_id: savedRequest.request_id,
      emergency_type: emergency_type,
      location: formattedLocation.coordinates,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error processing emergency. Please try again later" });
  }
  next();
}
