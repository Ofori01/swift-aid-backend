import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import responderModel from "../microservices/responder-management/models/responder-schema.mjs";
import agencyModel from "../microservices/admin-actions-dev/models/agencies-schema.mjs";

configDotenv();

/**
 * Enhanced script to update responders with correct agency_id
 * This version automatically fetches agency data and creates mappings
 */
async function updateRespondersWithDynamicAgencyMapping() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("📊 Connected to database");

    console.log("🔍 Fetching current agencies from database...");

    // Get all agencies from database
    const agencies = await agencyModel.find({});
    console.log(`🏢 Found ${agencies.length} agencies:`);

    agencies.forEach((agency) => {
      console.log(
        `   - ${agency.name} (${agency.agency_type}) - ID: ${agency._id}`
      );
    });

    // Create dynamic mapping based on agency_type
    const agencyTypeToId = {};
    const agencyNameToId = {};

    agencies.forEach((agency) => {
      agencyTypeToId[agency.agency_type] = agency._id.toString();
      agencyNameToId[agency.name.toLowerCase()] = agency._id.toString();
    });

    console.log("\n📋 Agency type mappings:");
    Object.entries(agencyTypeToId).forEach(([type, id]) => {
      console.log(`   ${type} -> ${id}`);
    });

    // Get all responders
    const allResponders = await responderModel.find({});
    console.log(`\n👥 Found ${allResponders.length} responders to process`);

    let updateCount = 0;
    let errorCount = 0;
    let alreadyCorrect = 0;

    // Process each responder
    for (const responder of allResponders) {
      try {
        let correctAgencyId = null;

        // Try to match by agency type first
        if (agencyTypeToId[responder.agency]) {
          correctAgencyId = agencyTypeToId[responder.agency];
        }
        // If not found, try to match by partial name matching
        else {
          const responderAgencyLower = responder.agency.toLowerCase();

          // Look for partial matches
          for (const [agencyName, agencyId] of Object.entries(agencyNameToId)) {
            if (
              agencyName.includes(responderAgencyLower) ||
              responderAgencyLower.includes(
                agencyName.split(" ")[0].toLowerCase()
              )
            ) {
              correctAgencyId = agencyId;
              break;
            }
          }
        }

        if (!correctAgencyId) {
          console.log(
            `⚠️  Could not find matching agency for responder ${responder.name} (${responder.badgeNumber})`
          );
          console.log(`   Responder agency: "${responder.agency}"`);
          console.log(`   Current agency_id: ${responder.agency_id}`);
          errorCount++;
          continue;
        }

        // Check if update is needed
        if (responder.agency_id !== correctAgencyId) {
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
          console.log(`   Agency: ${responder.agency}`);
          console.log(`   Old agency_id: ${oldAgencyId}`);
          console.log(`   New agency_id: ${correctAgencyId}`);
          console.log("");

          updateCount++;
        } else {
          alreadyCorrect++;
          console.log(
            `✓ ${responder.name} (${responder.badgeNumber}) - Already correct`
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
    console.log("\n📊 Final Update Summary:");
    console.log(`   Total responders processed: ${allResponders.length}`);
    console.log(`   Successfully updated: ${updateCount}`);
    console.log(`   Already correct: ${alreadyCorrect}`);
    console.log(`   Errors/Unmatched: ${errorCount}`);

    // Final verification
    console.log("\n🔍 Final verification - Responder distribution:");
    for (const [agencyType, agencyId] of Object.entries(agencyTypeToId)) {
      const count = await responderModel.countDocuments({
        agency_id: agencyId,
      });
      const agencyInfo = agencies.find((a) => a._id.toString() === agencyId);
      console.log(`   ${agencyType} (${agencyInfo.name}): ${count} responders`);
    }

    console.log("\n✅ Enhanced migration completed successfully!");
  } catch (error) {
    console.error("❌ Enhanced migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("📊 Database connection closed");
    process.exit(0);
  }
}

// Alternative: Manual mapping function for specific cases
async function manualAgencyMapping() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("📊 Connected to database for manual mapping");

    // Manual mappings based on your provided data
    const specificMappings = {
      Police: "683f6589c851cd6eb2989b40",
      Ambulance: "684061934877dea0548dfa60",
      "Fire Service": "68406aa95c5c7c141278be7e",
      // Add variations that might exist
      police: "683f6589c851cd6eb2989b40",
      ambulance: "684061934877dea0548dfa60",
      "fire service": "68406aa95c5c7c141278be7e",
      fire: "68406aa95c5c7c141278be7e",
    };

    const responders = await responderModel.find({});
    let updated = 0;

    for (const responder of responders) {
      const agencyKey = responder.agency.toLowerCase();
      const correctId =
        specificMappings[agencyKey] || specificMappings[responder.agency];

      if (correctId && responder.agency_id !== correctId) {
        await responderModel.findByIdAndUpdate(responder._id, {
          $set: { agency_id: correctId },
        });
        console.log(
          `✅ Updated ${responder.name}: ${responder.agency} -> ${correctId}`
        );
        updated++;
      }
    }

    console.log(
      `\n✅ Manual mapping completed. Updated ${updated} responders.`
    );
  } catch (error) {
    console.error("❌ Manual mapping failed:", error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run based on command line arguments
const args = process.argv.slice(2);

if (args.includes("--manual")) {
  console.log("🔧 Running manual agency mapping...");
  manualAgencyMapping();
} else {
  console.log("🚀 Running dynamic agency mapping...");
  updateRespondersWithDynamicAgencyMapping();
}
