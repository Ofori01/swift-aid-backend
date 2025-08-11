import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import responderModel from "../microservices/responder-management/models/responder-schema.mjs";

configDotenv();

async function fixCoordinates() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://oforidarkwah7:LJCEywRkNOaWIa4U@swift-aid.zk4ze.mongodb.net/swift-aid?retryWrites=true&w=majority&appName=Swift-Aid");
    console.log("✅ Connected to MongoDB to fix");

    // Get all responders
    const responders = await responderModel.find({});
    console.log(`📍 Found ${responders.length} responders to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const responder of responders) {
      const currentCoords = responder.current_location.coordinates;

      // Check if coordinates are in [lat, lng] format (latitude first)
      // Ghana latitude: ~4° to ~11°N, longitude: ~4°W to ~2°E
      // So if first coordinate is > 2, it's probably latitude
      if (
        currentCoords[0] > 2 &&
        currentCoords[1] < 2 &&
        currentCoords[1] > -4
      ) {
        // Flip coordinates from [lat, lng] to [lng, lat]
        const flippedCoords = [currentCoords[1], currentCoords[0]];

        console.log(`🔄 Updating ${responder.name}:`);
        console.log(
          `   Before: [${currentCoords[0]}, ${currentCoords[1]}] (lat, lng)`
        );
        console.log(
          `   After:  [${flippedCoords[0]}, ${flippedCoords[1]}] (lng, lat)`
        );

        // Update the responder
        await responderModel.updateOne(
          { _id: responder._id },
          {
            $set: {
              "current_location.coordinates": flippedCoords,
            },
          }
        );

        updatedCount++;
      } else {
        console.log(
          `✅ ${responder.name} coordinates already correct: [${currentCoords[0]}, ${currentCoords[1]}]`
        );
        skippedCount++;
      }
    }

    console.log(`\n🎉 Coordinate fix completed:`);
    console.log(`   ✅ Updated: ${updatedCount} responders`);
    console.log(`   ⏭️  Skipped: ${skippedCount} responders (already correct)`);
    console.log(`   📊 Total: ${responders.length} responders processed`);

    // Verify the changes
    console.log(`\n🔍 Verification - First 5 responders after update:`);
    const verifyResponders = await responderModel.find({}).limit(5);
    verifyResponders.forEach((responder) => {
      const coords = responder.current_location.coordinates;
      console.log(
        `   ${responder.name}: [${coords[0]}, ${coords[1]}] (lng, lat)`
      );
    });
  } catch (error) {
    console.error("❌ Error fixing coordinates:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
console.log("🚀 Starting coordinate fix script...");
console.log(
  "📋 This script will convert coordinates from [lat, lng] to [lng, lat] format for Mapbox compatibility"
);
fixCoordinates();
