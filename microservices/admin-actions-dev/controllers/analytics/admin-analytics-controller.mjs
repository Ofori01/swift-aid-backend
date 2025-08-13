import responderModel from "../../../responder-management/models/responder-schema.mjs";
import emergencyRequestModel from "../../../emergency-requests-management/models/emergency-request-schema.mjs";
import agencyModel from "../../models/agencies-schema.mjs";

/**
 * Get detailed performance analytics for admin agency
 */
export async function getPerformanceAnalytics(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { period = "30", type = "overview" } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const daysBack = parseInt(period);
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const agencyId = agency.agency_id; // Use agency_id instead of _id

    let analyticsData = {};

    switch (type) {
      case "performance":
        analyticsData = await getPerformanceMetrics(agencyId, fromDate);
        break;
      case "trends":
        analyticsData = await getTrendAnalytics(agencyId, fromDate, daysBack);
        break;
      case "responders":
        analyticsData = await getResponderAnalytics(agencyId, fromDate);
        break;
      default:
        analyticsData = await getOverviewAnalytics(agencyId, fromDate);
    }

    res.status(200).json({
      message: "Analytics data retrieved successfully",
      period: `${daysBack} days`,
      type: type,
      agency: {
        name: agency.name,
        type: agency.agency_type,
      },
      data: analyticsData,
      generated_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error fetching analytics:", error);
    res.status(500).json({
      message: "Error retrieving analytics data",
      error: error.message,
    });
  }
}

/**
 * Get response time trends and patterns
 */
export async function getResponseTimeTrends(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { days = 30 } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const daysBack = parseInt(days);
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const responderIds = await getAgencyResponderIds(agency.agency_id); // Use agency_id instead of _id

    const trends = await emergencyRequestModel.aggregate([
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
          "response_metrics.average_response_time": { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            hour: { $hour: "$createdAt" },
          },
          avgResponseTime: { $avg: "$response_metrics.average_response_time" },
          minResponseTime: { $min: "$response_metrics.fastest_responder_time" },
          maxResponseTime: { $max: "$response_metrics.average_response_time" },
          emergencyCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1, "_id.hour": 1 },
      },
    ]);

    res.status(200).json({
      message: "Response time trends retrieved successfully",
      period: `${daysBack} days`,
      data: {
        trends: trends,
        summary: {
          total_emergencies: trends.reduce(
            (sum, item) => sum + item.emergencyCount,
            0
          ),
          average_response_time:
            trends.length > 0
              ? Math.round(
                  trends.reduce((sum, item) => sum + item.avgResponseTime, 0) /
                    trends.length
                )
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching response time trends:", error);
    res.status(500).json({
      message: "Error retrieving response time trends",
      error: error.message,
    });
  }
}

/**
 * Get responder utilization statistics
 */
export async function getResponderUtilization(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { period = 30 } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const daysBack = parseInt(period);
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const agencyId = agency.agency_id; // Use agency_id instead of _id

    const utilization = await responderModel.aggregate([
      {
        $match: { agency_id: agencyId },
      },
      {
        $lookup: {
          from: "emergencyrequests",
          let: { responderId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $in: [
                        "$$responderId",
                        "$selected_responders.ambulances.responder_id",
                      ],
                    },
                    {
                      $in: [
                        "$$responderId",
                        "$selected_responders.fire_trucks.responder_id",
                      ],
                    },
                    {
                      $in: [
                        "$$responderId",
                        "$selected_responders.police_units.responder_id",
                      ],
                    },
                  ],
                },
                createdAt: { $gte: fromDate },
              },
            },
          ],
          as: "emergencies",
        },
      },
      {
        $addFields: {
          emergency_count: { $size: "$emergencies" },
          utilization_score: {
            $cond: [
              { $eq: ["$status", "available"] },
              { $multiply: [{ $size: "$emergencies" }, 10] },
              0,
            ],
          },
        },
      },
      {
        $sort: { emergency_count: -1 },
      },
    ]);

    res.status(200).json({
      message: "Responder utilization data retrieved successfully",
      period: `${daysBack} days`,
      data: {
        responders: utilization,
        summary: {
          total_responders: utilization.length,
          active_responders: utilization.filter((r) => r.emergency_count > 0)
            .length,
          average_utilization:
            utilization.length > 0
              ? Math.round(
                  utilization.reduce((sum, r) => sum + r.utilization_score, 0) /
                    utilization.length
                )
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching responder utilization:", error);
    res.status(500).json({
      message: "Error retrieving responder utilization data",
      error: error.message,
    });
  }
}

// Helper functions
async function getPerformanceMetrics(agencyId, fromDate) {
  const responderIds = await getAgencyResponderIds(agencyId);

  const metrics = await emergencyRequestModel.aggregate([
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
        _id: null,
        totalEmergencies: { $sum: 1 },
        averageResponseTime: {
          $avg: "$response_metrics.average_response_time",
        },
        successfulResponses: {
          $sum: {
            $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
          },
        },
        highPriorityEmergencies: {
          $sum: {
            $cond: [{ $gte: ["$ai_recommendations.priority_score", 80] }, 1, 0],
          },
        },
      },
    },
  ]);

  const result = metrics[0] || {};
  return {
    total_emergencies: result.totalEmergencies || 0,
    average_response_time: Math.round(result.averageResponseTime || 0),
    success_rate: result.totalEmergencies
      ? Math.round((result.successfulResponses / result.totalEmergencies) * 100)
      : 0,
    high_priority_emergencies: result.highPriorityEmergencies || 0,
  };
}

async function getTrendAnalytics(agencyId, fromDate, daysBack) {
  const responderIds = await getAgencyResponderIds(agencyId);

  const trends = await emergencyRequestModel.aggregate([
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
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
        avgPriority: { $avg: "$ai_recommendations.priority_score" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return {
    daily_trends: trends,
    period_summary: {
      total_days: daysBack,
      average_daily_emergencies:
        trends.length > 0
          ? Math.round(
              trends.reduce((sum, day) => sum + day.count, 0) / trends.length
            )
          : 0,
    },
  };
}

async function getResponderAnalytics(agencyId) {
  const analytics = await responderModel.aggregate([
    {
      $match: { agency_id: agencyId },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    status_distribution: analytics.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    total_responders: analytics.reduce((sum, item) => sum + item.count, 0),
  };
}

async function getOverviewAnalytics(agencyId, fromDate) {
  const [performance, trends, responders] = await Promise.all([
    getPerformanceMetrics(agencyId, fromDate),
    getTrendAnalytics(agencyId, fromDate, 30),
    getResponderAnalytics(agencyId),
  ]);

  return {
    performance,
    trends,
    responders,
  };
}

async function getAgencyResponderIds(agencyId) {
  const responders = await responderModel
    .find({ agency_id: agencyId })
    .select("_id");
  return responders.map((r) => r._id);
}
