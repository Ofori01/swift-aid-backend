import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import responderModel from "../microservices/responder-management/models/responder-schema.mjs";
import agencyModel from "../microservices/admin-actions-dev/models/agencies-schema.mjs";

configDotenv();

/**
 * Script to update all responders with correct agency_id based on agency type
 */
async function updateRespondersAgencyIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("📊 Connected to database");

    // Define the agency mappings from your data - convert to ObjectId
    const agencyMappings = {
      Police: new mongoose.Types.ObjectId("683f6589c851cd6eb2989b40"),
      Ambulance: new mongoose.Types.ObjectId("684061934877dea0548dfa60"),
      "Fire Service": new mongoose.Types.ObjectId("68406aa95c5c7c141278be7e"),
    };

    console.log("🔍 Starting responder agency_id update process...");

    // Get all responders to see what we're working with
    const allResponders = await responderModel.find({});
    console.log(`📋 Found ${allResponders.length} total responders`);

    let updateCount = 0;
    let errorCount = 0;

    // Process each responder
    for (const responder of allResponders) {
      try {
        const currentAgency = responder.agency;
        const correctAgencyId = agencyMappings[currentAgency];

        if (!correctAgencyId) {
          console.log(
            `⚠️  Unknown agency type: "${currentAgency}" for responder ${responder.name} (${responder.badgeNumber})`
          );
          errorCount++;
          continue;
        }

        // Check if update is needed (compare ObjectId properly)
        const currentAgencyIdString = responder.agency_id
          ? responder.agency_id.toString()
          : null;
        const correctAgencyIdString = correctAgencyId.toString();

        if (currentAgencyIdString !== correctAgencyIdString) {
          const oldAgencyId = responder.agency_id;

          // Update the responder
          await responderModel.findByIdAndUpdate(responder._id, {
            $set: {
              agency_id: correctAgencyId,
            },
          });

          console.log(
            `✅ Updated ${responder.name} (${responder.badgeNumber})`
          );
          console.log(`   Agency: ${currentAgency}`);
          console.log(`   Old agency_id: ${oldAgencyId}`);
          console.log(`   New agency_id: ${correctAgencyId}`);
          console.log("");

          updateCount++;
        } else {
          console.log(
            `✓ ${responder.name} (${responder.badgeNumber}) - Already has correct agency_id`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error updating responder ${responder.name}:`,
          error.message
        );
        errorCount++;
      }
    }

    // Summary
    console.log("\n📊 Update Summary:");
    console.log(`   Total responders: ${allResponders.length}`);
    console.log(`   Successfully updated: ${updateCount}`);
    console.log(`   Errors/Skipped: ${errorCount}`);
    console.log(
      `   Already correct: ${allResponders.length - updateCount - errorCount}`
    );

    // Verify the updates by checking agency distribution
    console.log("\n🔍 Verification - Responder distribution by agency:");
    for (const [agencyType, agencyId] of Object.entries(agencyMappings)) {
      const count = await responderModel.countDocuments({
        agency_id: agencyId,
      });
      console.log(`   ${agencyType}: ${count} responders`);
    }

    // Check for any responders with unrecognized agency_ids
    const validAgencyIds = Object.values(agencyMappings);
    const invalidResponders = await responderModel.find({
      agency_id: { $nin: validAgencyIds },
    });

    if (invalidResponders.length > 0) {
      console.log(
        `\n⚠️  Warning: ${invalidResponders.length} responders still have invalid agency_ids:`
      );
      invalidResponders.forEach((responder) => {
        console.log(
          `   - ${responder.name} (${responder.badgeNumber}): agency_id = ${responder.agency_id}, agency = ${responder.agency}`
        );
      });
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("📊 Database connection closed");
    process.exit(0);
  }
}

/**
 * Alternative function to verify agency data matches expected format
 */
async function verifyAgencyData() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("📊 Connected to database for verification");

    const agencies = await agencyModel.find({});
    console.log("\n🏢 Current agencies in database:");

    agencies.forEach((agency) => {
      console.log(`\nAgency: ${agency.name}`);
      console.log(`  Type: ${agency.agency_type}`);
      console.log(`  ID: ${agency._id}`);
      console.log(`  Agency_ID: ${agency.agency_id}`);
      console.log(`  Admin_ID: ${agency.admin_id}`);
    });
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the script
if (process.argv.includes("--verify")) {
  verifyAgencyData();
} else {
  updateRespondersAgencyIds();
}
