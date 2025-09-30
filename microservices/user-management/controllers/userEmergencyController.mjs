import emergencyRequestModel from "../../emergency-requests-management/models/emergency-request-schema.mjs";
import userModel from "../models/userSchema.mjs";

export const getUserEmergencies = async (req, res) => {
  try {
    const userId = req.params.id;

    // Verify user exists
    const userExists = await userModel.findOne({ user_id: userId });
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all emergencies for the user with populated responder information
    const emergencies = await emergencyRequestModel
      .find({ user_id: userId })
      .populate(
        "assigned_responders",
        "responder_id name phone_number vehicle_type"
      )
      .populate("assigned_admin_id", "admin_id name")
      .sort({ createdAt: -1 }); // Sort by most recent first

    if (emergencies.length === 0) {
      return res.status(200).json({
        message: "No emergencies found for this user",
        data: [],
      });
    }

    res.status(200).json({
      message: "Emergencies retrieved successfully",
      count: emergencies.length,
      data: emergencies,
    });
  } catch (error) {
    console.error("Error in getUserEmergencies:", error);
    res.status(500).json({
      message: "Internal server error while fetching user emergencies",
      error: error.message,
    });
  }
};
