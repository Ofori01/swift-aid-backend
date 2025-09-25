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

    // Fix date calculations to ensure proper boundaries
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);

    const currentMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0
    );

    console.log(
      `📅 Date ranges - Today: ${now.toISOString()}, 30 days: ${thirtyDaysAgo.toISOString()}, 7 days: ${sevenDaysAgo.toISOString()}, Current month: ${currentMonth.toISOString()}`
    );

    // Parallel execution of all dashboard queries for better performance
    const [
      totalResponders,
      availableResponders,
      unavailableResponders,
      emergenciesTrendToday,
      emergenciesTrendLast30Days,
      emergenciesTrendLast7Days,
      emergenciesTrendLast3Months,
      emergenciesTrendCurrentMonth,
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

      // Emergencies trend data (daily breakdown) for charts
      getEmergenciesTodayTrend(agencyId),
      getEmergenciesTrendData(agencyId, 30),
      getEmergenciesTrendData(agencyId, 7),
      getEmergenciesTrendData(agencyId, 90),
      getCurrentMonthTrendData(agencyId),

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
        trends: {
          today: emergenciesTrendToday,
          last_30_days: emergenciesTrendLast30Days,
          last_7_days: emergenciesTrendLast7Days,
          last_3_months: emergenciesTrendLast3Months,
          current_month: emergenciesTrendCurrentMonth,
        },
        totals: {
          today: emergenciesTrendToday.total_count,
          last_30_days: emergenciesTrendLast30Days.reduce(
            (sum, day) => sum + day.count,
            0
          ),
          last_7_days: emergenciesTrendLast7Days.reduce(
            (sum, day) => sum + day.count,
            0
          ),
          last_3_months: emergenciesTrendLast3Months.reduce(
            (sum, day) => sum + day.count,
            0
          ),
          current_month: emergenciesTrendCurrentMonth.reduce(
            (sum, day) => sum + day.count,
            0
          ),
        },
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

  console.log(
    `🔍 Getting recent emergencies for agency ${agencyId} with ${responderIds.length} responders`
  );

  return await emergencyRequestModel
    .find({
      $or: [
        // Check assigned_responders array
        {
          assigned_responders: { $in: responderIds },
        },
        // Check selected_responders nested arrays
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
          // Check assigned_responders array
          {
            assigned_responders: { $in: responderIds },
          },
          // Check selected_responders nested arrays
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
          // Check assigned_responders array
          {
            assigned_responders: { $in: responderIds },
          },
          // Check selected_responders nested arrays
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
          // Check assigned_responders array
          {
            assigned_responders: { $in: responderIds },
          },
          // Check selected_responders nested arrays
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
    .select("_id responder_id name");

  console.log(
    `👥 Found ${responders.length} responders for agency ${agencyId}:`,
    responders.map((r) => ({
      id: r._id.toString(),
      responder_id: r.responder_id,
      name: r.name,
    }))
  );

  // Check the Sep 23rd emergency responder IDs specifically
  const sep23EmergencyResponderIds = [
    "67fe3b1ea1dc96ecb6e4cf67",
    "67fe3b4da1dc96ecb6e4cf6b",
  ];

  // Check what agencies these Sep 23rd responders belong to
  const sep23Responders = await responderModel
    .find({ _id: { $in: sep23EmergencyResponderIds } })
    .select("_id name agency_id");

  console.log(
    `� Sep 23rd emergency responders and their agencies:`,
    sep23Responders.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      agency_id: r.agency_id,
    }))
  );

  // Get agency names for these responders
  if (sep23Responders.length > 0) {
    const agencyIds = [...new Set(sep23Responders.map((r) => r.agency_id))];
    const agencies = await agencyModel
      .find({ agency_id: { $in: agencyIds } })
      .select("agency_id name");

    console.log(
      `🏢 Agencies that Sep 23rd emergency responders belong to:`,
      agencies.map((a) => ({
        agency_id: a.agency_id,
        name: a.name,
      }))
    );
  }

  // Check both _id and responder_id for matching
  const agencyResponderIds = responders.map((r) => r._id.toString());
  const agencyResponderIdFields = responders.map((r) =>
    r.responder_id.toString()
  );

  console.log(
    `🔍 Sep 23rd emergency responder IDs that match this agency (_id): ${
      sep23EmergencyResponderIds.filter((id) => agencyResponderIds.includes(id))
        .length
    }/${sep23EmergencyResponderIds.length}`
  );
  console.log(
    `🔍 Sep 23rd emergency responder IDs that match this agency (responder_id): ${
      sep23EmergencyResponderIds.filter((id) =>
        agencyResponderIdFields.includes(id)
      ).length
    }/${sep23EmergencyResponderIds.length}`
  );

  // Return responder_id instead of _id for emergency matching
  return responders.map((r) => r.responder_id);
}

/**
 * Get daily emergency trend data for charts
 * @param {string} agencyId - The agency ID
 * @param {number} days - Number of days to look back
 * @returns {Array} Array of {date: string, count: number} objects
 */
async function getEmergenciesTrendData(agencyId, days) {
  const responderIds = await getAgencyResponderIds(agencyId);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Generate date range array
  const dateRange = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dateRange.push({
      date: date.toISOString().split("T")[0], // YYYY-MM-DD format
      start: new Date(date),
      end: new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1), // End of day
    });
  }

  // Get emergency counts for each day
  const trendData = await Promise.all(
    dateRange.map(async ({ date, start, end }) => {
      const query = {
        $or: [
          // Check assigned_responders array
          {
            assigned_responders: { $in: responderIds },
          },
          // Check selected_responders nested arrays
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
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };

      const count = await emergencyRequestModel.countDocuments(query);

      // Debug specific dates
      if (
        date === "2025-09-23" ||
        date === "2025-09-24" ||
        date === "2025-09-25"
      ) {
        console.log(`🔍 DEBUG ${date}: Found ${count} emergencies`);

        // Get actual emergency documents for debugging
        const emergencies = await emergencyRequestModel
          .find(query)
          .select("_id createdAt selected_responders assigned_responders")
          .limit(3);
        console.log(
          `📄 Sample emergencies for ${date}:`,
          emergencies.map((e) => ({
            id: e._id.toString(),
            createdAt: e.createdAt,
            hasAssignedResponders: e.assigned_responders?.length > 0,
            hasSelectedResponders: {
              ambulances: e.selected_responders?.ambulances?.length > 0,
              fire_trucks: e.selected_responders?.fire_trucks?.length > 0,
              police_units: e.selected_responders?.police_units?.length > 0,
            },
          }))
        );
      }

      return {
        date,
        count,
        day: start.toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue, etc.
        month: start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }), // Jan 15, Feb 3, etc.
      };
    })
  );

  return trendData;
}

/**
 * Get today's emergency trend data with hourly breakdown
 * @param {string} agencyId - The agency ID
 * @returns {Object} Today's emergency data with hourly breakdown and total count
 */
async function getEmergenciesTodayTrend(agencyId) {
  const responderIds = await getAgencyResponderIds(agencyId);
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

  // Create hourly time slots for today
  const hourlyData = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourStart = new Date(startOfDay);
    hourStart.setHours(hour, 0, 0, 0);

    const hourEnd = new Date(startOfDay);
    hourEnd.setHours(hour, 59, 59, 999);

    // Format time for display (e.g., "6:00 AM", "2:00 PM")
    const timeLabel = hourStart
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      })
      .replace(":00", "");

    const count = await emergencyRequestModel.countDocuments({
      $or: [
        // Check assigned_responders array
        {
          assigned_responders: { $in: responderIds },
        },
        // Check selected_responders nested arrays
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
      createdAt: {
        $gte: hourStart,
        $lte: hourEnd,
      },
    });

    hourlyData.push({
      hour,
      time: timeLabel,
      count,
      period: hour < 12 ? "AM" : "PM",
    });
  }

  // Calculate total count for today
  const totalCount = hourlyData.reduce((sum, hour) => sum + hour.count, 0);

  console.log(
    `📊 Today's emergency count for agency ${agencyId}: ${totalCount} emergencies`
  );
  console.log(
    `🕐 Hourly breakdown:`,
    hourlyData.filter((h) => h.count > 0)
  );

  return {
    date: today.toISOString().split("T")[0], // YYYY-MM-DD format
    day: today.toLocaleDateString("en-US", { weekday: "long" }), // Monday, Tuesday, etc.
    total_count: totalCount,
    hourly_data: hourlyData,
    peak_hour: hourlyData.reduce((peak, current) =>
      current.count > peak.count ? current : peak
    ),
    summary: {
      morning_count: hourlyData
        .slice(6, 12)
        .reduce((sum, h) => sum + h.count, 0), // 6 AM - 12 PM
      afternoon_count: hourlyData
        .slice(12, 18)
        .reduce((sum, h) => sum + h.count, 0), // 12 PM - 6 PM
      evening_count: hourlyData
        .slice(18, 24)
        .reduce((sum, h) => sum + h.count, 0), // 6 PM - 12 AM
      night_count: hourlyData.slice(0, 6).reduce((sum, h) => sum + h.count, 0), // 12 AM - 6 AM
    },
  };
}

/**
 * Get current month's emergency trend data
 * @param {string} agencyId - The agency ID
 * @returns {Array} Array of daily data for current month
 */
async function getCurrentMonthTrendData(agencyId) {
  const responderIds = await getAgencyResponderIds(agencyId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Generate date range for current month
  const dateRange = [];
  for (
    let d = new Date(startOfMonth);
    d <= endOfMonth;
    d.setDate(d.getDate() + 1)
  ) {
    const date = new Date(d);
    dateRange.push({
      date: date.toISOString().split("T")[0], // YYYY-MM-DD format
      start: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0
      ),
      end: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999
      ),
    });
  }

  // Get emergency counts for each day in current month
  const trendData = await Promise.all(
    dateRange.map(async ({ date, start, end }) => {
      const count = await emergencyRequestModel.countDocuments({
        $or: [
          // Check assigned_responders array
          {
            assigned_responders: { $in: responderIds },
          },
          // Check selected_responders nested arrays
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
        createdAt: {
          $gte: start,
          $lte: end,
        },
      });

      return {
        date,
        count,
        day: start.toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue, etc.
        month: start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }), // Jan 15, Feb 3, etc.
      };
    })
  );

  return trendData;
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
