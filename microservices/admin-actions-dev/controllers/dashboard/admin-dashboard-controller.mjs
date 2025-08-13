import responderModel from "../../../responder-management/models/responder-schema.mjs";
import emergencyRequestModel from "../../../emergency-requests-management/models/emergency-request-schema.mjs";
import agencyModel from "../../models/agencies-schema.mjs";
import mongoose from "mongoose";

/**
 * Get comprehensive dashboard information for admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getDashboardInfo(req, res) {
  try {
    // Get admin's agency information
    const adminId = req.user.admin_id || req.user.user_id;

    if (!adminId) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    // Get the admin's agency
    const agency = await agencyModel.findOne({ admin_id: adminId });

    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const agencyId = agency.agency_id; // Use agency_id field, not _id
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Parallel execution of all dashboard queries for better performance
    const [
      totalResponders,
      availableResponders,
      unavailableResponders,
      emergenciesLast30Days,
      emergenciesLast7Days,
      emergenciesLast3Months,
      monthlyEmergencies,
      agencyResponders,
      recentEmergencies,
      responseTimeStats,
      severityDistribution,
      emergencyTypeDistribution,
    ] = await Promise.all([
      // Total responders under admin agency
      responderModel.countDocuments({ agency_id: agencyId }),

      // Available responders count
      responderModel.countDocuments({
        agency_id: agencyId,
        status: "available",
      }),

      // Unavailable responders count
      responderModel.countDocuments({
        agency_id: agencyId,
        status: "unavailable",
      }),

      // Emergencies in last 30 days involving agency responders
      getAgencyEmergenciesCount(agencyId, thirtyDaysAgo),

      // Emergencies in last 7 days
      getAgencyEmergenciesCount(agencyId, sevenDaysAgo),

      // Emergencies in last 3 months
      getAgencyEmergenciesCount(agencyId, threeMonthsAgo),

      // Monthly emergencies for current month
      getAgencyEmergenciesCount(agencyId, currentMonth),

      // All responders in agency with basic info
      responderModel
        .find({ agency_id: agencyId })
        .select("name email phone status badgeNumber")
        .limit(50),

      // Recent emergencies (last 10)
      getRecentAgencyEmergencies(agencyId, 10),

      // Response time statistics
      getResponseTimeStats(agencyId, thirtyDaysAgo),

      // Severity distribution
      getSeverityDistribution(agencyId, thirtyDaysAgo),

      // Emergency type distribution
      getEmergencyTypeDistribution(agencyId, thirtyDaysAgo),
    ]);

    // Calculate vehicles by agency type
    const vehicleCount = getVehicleCount(agency.agency_type, totalResponders);

    // Prepare dashboard response
    const dashboardData = {
      agency: {
        name: agency.name,
        branch: agency.branch,
        type: agency.agency_type,
        location: agency.location,
      },
      overview: {
        total_responders: totalResponders,
        available_responders: availableResponders,
        unavailable_responders: unavailableResponders,
        availability_rate:
          totalResponders > 0
            ? Math.round((availableResponders / totalResponders) * 100)
            : 0,
        estimated_vehicles: vehicleCount,
      },
      emergencies: {
        last_30_days: emergenciesLast30Days,
        last_7_days: emergenciesLast7Days,
        last_3_months: emergenciesLast3Months,
        current_month: monthlyEmergencies,
      },
      performance: {
        average_response_time: responseTimeStats.averageTime,
        fastest_response_time: responseTimeStats.fastestTime,
        total_responses: responseTimeStats.totalResponses,
        response_efficiency: responseTimeStats.efficiency,
      },
      analytics: {
        severity_distribution: severityDistribution,
        emergency_types: emergencyTypeDistribution,
      },
      recent_activity: {
        responders: agencyResponders.slice(0, 10),
        recent_emergencies: recentEmergencies,
      },
    };

    res.status(200).json({
      message: "Dashboard data retrieved successfully",
      data: dashboardData,
      generated_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard info:", error);
    res.status(500).json({
      message: "Error retrieving dashboard information",
      error: error.message,
    });
  }
}

/**
 * Get count of emergencies involving agency responders within time period
 */
async function getAgencyEmergenciesCount(agencyId, fromDate) {
  return await emergencyRequestModel.countDocuments({
    $or: [
      {
        "selected_responders.ambulances.responder_id": {
          $in: await getAgencyResponderIds(agencyId),
        },
      },
      {
        "selected_responders.fire_trucks.responder_id": {
          $in: await getAgencyResponderIds(agencyId),
        },
      },
      {
        "selected_responders.police_units.responder_id": {
          $in: await getAgencyResponderIds(agencyId),
        },
      },
    ],
    createdAt: { $gte: fromDate },
  });
}

/**
 * Get recent emergencies involving agency responders
 */
async function getRecentAgencyEmergencies(agencyId, limit = 10) {
  const responderIds = await getAgencyResponderIds(agencyId);

  return await emergencyRequestModel
    .find({
      $or: [
        {
          "selected_responders.ambulances.responder_id": { $in: responderIds },
        },
        {
          "selected_responders.fire_trucks.responder_id": { $in: responderIds },
        },
        {
          "selected_responders.police_units.responder_id": {
            $in: responderIds,
          },
        },
      ],
    })
    .select(
      "emergency_type severity status ai_recommendations.priority_score createdAt emergency_location"
    )
    .sort({ createdAt: -1 })
    .limit(limit);
}

/**
 * Get response time statistics for agency
 */
async function getResponseTimeStats(agencyId, fromDate) {
  const responderIds = await getAgencyResponderIds(agencyId);

  const stats = await emergencyRequestModel.aggregate([
    {
      $match: {
        $or: [
          {
            "selected_responders.ambulances.responder_id": {
              $in: responderIds,
            },
          },
          {
            "selected_responders.fire_trucks.responder_id": {
              $in: responderIds,
            },
          },
          {
            "selected_responders.police_units.responder_id": {
              $in: responderIds,
            },
          },
        ],
        createdAt: { $gte: fromDate },
        "response_metrics.average_response_time": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: "$response_metrics.average_response_time" },
        minTime: { $min: "$response_metrics.fastest_responder_time" },
        totalResponses: { $sum: 1 },
      },
    },
  ]);

  const result = stats[0] || {};
  return {
    averageTime: Math.round(result.avgTime || 0),
    fastestTime: result.minTime || null,
    totalResponses: result.totalResponses || 0,
    efficiency: result.avgTime
      ? Math.max(0, Math.min(100, 100 - (result.avgTime / 600) * 100))
      : 0,
  };
}

/**
 * Get severity distribution for agency emergencies
 */
async function getSeverityDistribution(agencyId, fromDate) {
  const responderIds = await getAgencyResponderIds(agencyId);

  const distribution = await emergencyRequestModel.aggregate([
    {
      $match: {
        $or: [
          {
            "selected_responders.ambulances.responder_id": {
              $in: responderIds,
            },
          },
          {
            "selected_responders.fire_trucks.responder_id": {
              $in: responderIds,
            },
          },
          {
            "selected_responders.police_units.responder_id": {
              $in: responderIds,
            },
          },
        ],
        createdAt: { $gte: fromDate },
      },
    },
    {
      $group: {
        _id: "$severity",
        count: { $sum: 1 },
      },
    },
  ]);

  return distribution.reduce((acc, item) => {
    acc[item._id || "Unknown"] = item.count;
    return acc;
  }, {});
}

/**
 * Get emergency type distribution
 */
async function getEmergencyTypeDistribution(agencyId, fromDate) {
  const responderIds = await getAgencyResponderIds(agencyId);

  const distribution = await emergencyRequestModel.aggregate([
    {
      $match: {
        $or: [
          {
            "selected_responders.ambulances.responder_id": {
              $in: responderIds,
            },
          },
          {
            "selected_responders.fire_trucks.responder_id": {
              $in: responderIds,
            },
          },
          {
            "selected_responders.police_units.responder_id": {
              $in: responderIds,
            },
          },
        ],
        createdAt: { $gte: fromDate },
      },
    },
    {
      $group: {
        _id: "$emergency_type",
        count: { $sum: 1 },
      },
    },
  ]);

  return distribution.reduce((acc, item) => {
    acc[item._id || "Unknown"] = item.count;
    return acc;
  }, {});
}

/**
 * Get all responder IDs for an agency
 */
async function getAgencyResponderIds(agencyId) {
  const responders = await responderModel
    .find({ agency_id: agencyId })
    .select("_id");
  return responders.map((r) => r._id);
}

/**
 * Estimate vehicle count based on agency type and responder count
 */
function getVehicleCount(agencyType, responderCount) {
  switch (agencyType) {
    case "Police":
      return Math.ceil(responderCount / 2); // 2 officers per vehicle average
    case "Fire Service":
      return Math.ceil(responderCount / 4); // 4 firefighters per truck average
    case "Ambulance":
      return Math.ceil(responderCount / 2); // 2 paramedics per ambulance average
    case "Nadmo":
      return Math.ceil(responderCount / 3); // 3 personnel per rescue vehicle average
    default:
      return Math.ceil(responderCount / 3);
  }
}
