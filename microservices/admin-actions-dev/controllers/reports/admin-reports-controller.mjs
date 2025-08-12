import responderModel from "../../../responder-management/models/responder-schema.mjs";
import emergencyRequestModel from "../../../emergency-requests-management/models/emergency-request-schema.mjs";
import agencyModel from "../../models/agencies-schema.mjs";

/**
 * Generate comprehensive agency report
 */
export async function generateAgencyReport(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const {
      reportType = "comprehensive",
      startDate,
      endDate,
      format = "json",
    } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    // Date range setup
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const reportData = await generateReportData(agency, start, end, reportType);

    if (format === "csv") {
      generateCSVReport(res, reportData, agency);
    } else {
      res.status(200).json({
        message: "Agency report generated successfully",
        report_type: reportType,
        period: {
          start_date: start,
          end_date: end,
        },
        agency: {
          name: agency.name,
          type: agency.agency_type,
          branch: agency.branch,
        },
        data: reportData,
        generated_at: new Date(),
      });
    }
  } catch (error) {
    console.error("❌ Error generating agency report:", error);
    res.status(500).json({
      message: "Error generating agency report",
      error: error.message,
    });
  }
}

/**
 * Get emergency response efficiency report
 */
export async function getEfficiencyReport(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { period = 30 } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const daysBack = parseInt(period);
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const agencyId = agency._id.toString();

    const efficiencyMetrics = await calculateEfficiencyMetrics(
      agencyId,
      fromDate
    );

    res.status(200).json({
      message: "Efficiency report generated successfully",
      period: `${daysBack} days`,
      agency: {
        name: agency.name,
        type: agency.agency_type,
      },
      metrics: efficiencyMetrics,
      generated_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error generating efficiency report:", error);
    res.status(500).json({
      message: "Error generating efficiency report",
      error: error.message,
    });
  }
}

/**
 * Get responder performance report
 */
export async function getResponderPerformanceReport(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { period = 30, limit = 50 } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const daysBack = parseInt(period);
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const agencyId = agency._id.toString();

    const performanceData = await getResponderPerformanceData(
      agencyId,
      fromDate,
      parseInt(limit)
    );

    res.status(200).json({
      message: "Responder performance report generated successfully",
      period: `${daysBack} days`,
      agency: {
        name: agency.name,
        type: agency.agency_type,
      },
      data: performanceData,
      generated_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error generating responder performance report:", error);
    res.status(500).json({
      message: "Error generating responder performance report",
      error: error.message,
    });
  }
}

/**
 * Get emergency types analysis report
 */
export async function getEmergencyTypesReport(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { period = 90 } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const daysBack = parseInt(period);
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const agencyId = agency._id.toString();

    const typesAnalysis = await getEmergencyTypesAnalysis(agencyId, fromDate);

    res.status(200).json({
      message: "Emergency types analysis generated successfully",
      period: `${daysBack} days`,
      agency: {
        name: agency.name,
        type: agency.agency_type,
      },
      analysis: typesAnalysis,
      generated_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error generating emergency types report:", error);
    res.status(500).json({
      message: "Error generating emergency types report",
      error: error.message,
    });
  }
}

// Helper functions
async function generateReportData(agency, startDate, endDate, reportType) {
  const agencyId = agency._id.toString();
  const responderIds = await getAgencyResponderIds(agencyId);

  const [emergenciesData, respondersData, performanceData, efficiencyData] =
    await Promise.all([
      getEmergenciesData(responderIds, startDate, endDate),
      getRespondersData(agencyId),
      getPerformanceData(responderIds, startDate, endDate),
      calculateEfficiencyMetrics(agencyId, startDate),
    ]);

  return {
    overview: {
      total_emergencies: emergenciesData.total,
      active_responders: respondersData.active,
      total_responders: respondersData.total,
      average_response_time: performanceData.averageResponseTime,
      success_rate: efficiencyData.successRate,
    },
    emergencies: emergenciesData,
    responders: respondersData,
    performance: performanceData,
    efficiency: efficiencyData,
  };
}

async function getEmergenciesData(responderIds, startDate, endDate) {
  const emergencies = await emergencyRequestModel.find({
    $or: [
      { "selected_responders.ambulances.responder_id": { $in: responderIds } },
      { "selected_responders.fire_trucks.responder_id": { $in: responderIds } },
      {
        "selected_responders.police_units.responder_id": { $in: responderIds },
      },
    ],
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const typeDistribution = emergencies.reduce((acc, emergency) => {
    acc[emergency.emergency_type] = (acc[emergency.emergency_type] || 0) + 1;
    return acc;
  }, {});

  const severityDistribution = emergencies.reduce((acc, emergency) => {
    const severity = emergency.severity || "Unknown";
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  return {
    total: emergencies.length,
    type_distribution: typeDistribution,
    severity_distribution: severityDistribution,
    recent_emergencies: emergencies.slice(-10),
  };
}

async function getRespondersData(agencyId) {
  const responders = await responderModel.find({ agency_id: agencyId });

  const statusDistribution = responders.reduce((acc, responder) => {
    acc[responder.status] = (acc[responder.status] || 0) + 1;
    return acc;
  }, {});

  return {
    total: responders.length,
    active: responders.filter((r) => r.status === "available").length,
    status_distribution: statusDistribution,
    responders: responders.map((r) => ({
      name: r.name,
      badgeNumber: r.badgeNumber,
      status: r.status,
      phone: r.phone,
    })),
  };
}

async function getPerformanceData(responderIds, startDate, endDate) {
  const performanceStats = await emergencyRequestModel.aggregate([
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
        createdAt: { $gte: startDate, $lte: endDate },
        "response_metrics.average_response_time": { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        averageResponseTime: {
          $avg: "$response_metrics.average_response_time",
        },
        fastestResponse: { $min: "$response_metrics.fastest_responder_time" },
        slowestResponse: { $max: "$response_metrics.average_response_time" },
        totalResponses: { $sum: 1 },
      },
    },
  ]);

  const stats = performanceStats[0] || {};
  return {
    averageResponseTime: Math.round(stats.averageResponseTime || 0),
    fastestResponse: stats.fastestResponse || null,
    slowestResponse: Math.round(stats.slowestResponse || 0),
    totalResponses: stats.totalResponses || 0,
  };
}

async function calculateEfficiencyMetrics(agencyId, fromDate) {
  const responderIds = await getAgencyResponderIds(agencyId);

  const [totalEmergencies, completedEmergencies] = await Promise.all([
    emergencyRequestModel.countDocuments({
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
      createdAt: { $gte: fromDate },
    }),
    emergencyRequestModel.countDocuments({
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
      createdAt: { $gte: fromDate },
      status: "Completed",
    }),
  ]);

  return {
    totalEmergencies,
    completedEmergencies,
    successRate:
      totalEmergencies > 0
        ? Math.round((completedEmergencies / totalEmergencies) * 100)
        : 0,
    pendingEmergencies: totalEmergencies - completedEmergencies,
  };
}

async function getResponderPerformanceData(agencyId, fromDate, limit) {
  return await responderModel.aggregate([
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
        performance_score: {
          $multiply: [
            { $size: "$emergencies" },
            { $cond: [{ $eq: ["$status", "available"] }, 1.2, 0.8] },
          ],
        },
      },
    },
    {
      $sort: { performance_score: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        name: 1,
        badgeNumber: 1,
        status: 1,
        emergency_count: 1,
        performance_score: 1,
      },
    },
  ]);
}

async function getEmergencyTypesAnalysis(agencyId, fromDate) {
  const responderIds = await getAgencyResponderIds(agencyId);

  return await emergencyRequestModel.aggregate([
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
        averageResponseTime: {
          $avg: "$response_metrics.average_response_time",
        },
        averagePriority: { $avg: "$ai_recommendations.priority_score" },
        successfulResponses: {
          $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        successRate: {
          $multiply: [{ $divide: ["$successfulResponses", "$count"] }, 100],
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
}

function generateCSVReport(res, reportData, agency) {
  const csvData = [];

  // Header information
  csvData.push(["Agency Report"]);
  csvData.push(["Agency Name", agency.name]);
  csvData.push(["Agency Type", agency.agency_type]);
  csvData.push(["Branch", agency.branch]);
  csvData.push(["Generated At", new Date().toISOString()]);
  csvData.push([]);

  // Overview data
  csvData.push(["Overview"]);
  csvData.push(["Metric", "Value"]);
  csvData.push(["Total Emergencies", reportData.overview.total_emergencies]);
  csvData.push(["Active Responders", reportData.overview.active_responders]);
  csvData.push(["Total Responders", reportData.overview.total_responders]);
  csvData.push([
    "Average Response Time",
    `${reportData.overview.average_response_time}s`,
  ]);
  csvData.push(["Success Rate", `${reportData.overview.success_rate}%`]);

  // Convert to CSV format
  const csvContent = csvData
    .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
    .join("\n");

  // Set response headers for CSV file
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=agency_report_${Date.now()}.csv`
  );

  res.send(csvContent);
}

async function getAgencyResponderIds(agencyId) {
  const responders = await responderModel
    .find({ agency_id: agencyId })
    .select("_id");
  return responders.map((r) => r._id);
}
