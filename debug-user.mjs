import mongoose from "mongoose";
import emergencyRequestModel from "./microservices/emergency-requests-management/models/emergency-request-schema.mjs";

try {
  // Connect to database
  await mongoose.connect(
    "mongodb+srv://swiftaid:swiftaid123@cluster0.p1k3c.mongodb.net/SwiftAid?retryWrites=true&w=majority"
  );
  console.log("✅ Connected to MongoDB");

  // Find the emergency and populate user
  const emergencyId = "68d5bc6d9ad4c4520330b90b";
  console.log(`🔍 Looking for emergency: ${emergencyId}`);

  const emergency = await emergencyRequestModel
    .findById(emergencyId)
    .populate("user_id", "name phone_number email")
    .lean();

  if (emergency) {
    console.log("🔍 Emergency found:", {
      id: emergency._id,
      user_id_raw: emergency.user_id,
      has_user_id: !!emergency.user_id,
      user_data: emergency.user_id,
    });

    // Also try to find the user directly
    if (emergency.user_id && typeof emergency.user_id === "object") {
      console.log("✅ User data populated successfully");
    } else if (emergency.user_id) {
      console.log("⚠️ User ID exists but not populated:", emergency.user_id);

      // Try to find user manually
      const UserModel = mongoose.model(
        "User",
        new mongoose.Schema({}, { strict: false })
      );
      const user = await UserModel.findById(emergency.user_id);
      console.log("🔍 Manual user lookup:", user);
    } else {
      console.log("❌ No user_id in emergency document");
    }
  } else {
    console.log("❌ Emergency not found");
  }
} catch (error) {
  console.error("❌ Error:", error.message);
} finally {
  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}
