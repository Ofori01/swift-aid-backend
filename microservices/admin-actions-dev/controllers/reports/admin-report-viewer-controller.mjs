import responderReportModel from "../../../responder-management/models/responder-report-schema.mjs";
import emergencyRequestModel from "../../../emergency-requests-management/models/emergency-request-schema.mjs";
import agencyModel from "../../models/agencies-schema.mjs";

/**
 * Get completed emergencies with reports for admin's agency
 */
export async function getCompletedEmergenciesWithReports(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const {
      page = 1,
      limit = 20,
      emergency_type,
      severity,
      date_from,
      date_to,
      outcome,
      sort_by = "completed_at",
      sort_order = "desc",
    } = req.query;

    // Get admin's agency
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    // Build query for completed emergencies involving agency responders
    const matchQuery = {
      status: "Completed",
    };

    if (emergency_type) matchQuery.emergency_type = emergency_type;
    if (severity) matchQuery.severity = severity;
    if (date_from || date_to) {
      matchQuery.updatedAt = {};
      if (date_from) matchQuery.updatedAt.$gte = new Date(date_from);
      if (date_to) matchQuery.updatedAt.$lte = new Date(date_to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortQuery = {};
    sortQuery[sort_by === "completed_at" ? "updatedAt" : sort_by] =
      sort_order === "asc" ? 1 : -1;

    // Get completed emergencies
    const completedEmergencies = await emergencyRequestModel
      .find(matchQuery)
      .populate("user_id", "name phone_number email")
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    // Get reports for these emergencies, filtered by agency responders
    const emergencyIds = completedEmergencies.map((e) => e._id);

    const reportsWithResponders = await responderReportModel.aggregate([
      {
        $match: {
          emergency_id: { $in: emergencyIds },
        },
      },
      {
        $lookup: {
          from: "responders",
          localField: "responder_id",
          foreignField: "_id",
          as: "responder",
        },
      },
      {
        $unwind: "$responder",
      },
      {
        $match: {
          "responder.agency_id": agency.agency_id,
        },
      },
      {
        $project: {
          emergency_id: 1,
          responder_id: 1,
          arrival_time: 1,
          departure_time: 1,
          actions_taken: 1,
          casualties: 1,
          property_damage: 1,
          resources_used: 1,
          outcome: 1,
          severity_assessment: 1,
          additional_notes: 1,
          location_details: 1,
          follow_up_required: 1,
          follow_up_details: 1,
          submitted_at: 1,
          status: 1,
          "responder.name": 1,
          "responder.badgeNumber": 1,
          "responder.phone": 1,
        },
      },
    ]);

    // Filter outcomes if specified
    const filteredReports = outcome
      ? reportsWithResponders.filter((report) => report.outcome === outcome)
      : reportsWithResponders;

    // Group reports by emergency
    const emergenciesWithReports = completedEmergencies
      .map((emergency) => {
        const emergencyReports = filteredReports.filter(
          (report) =>
            report.emergency_id.toString() === emergency._id.toString()
        );

        return {
          ...emergency.toObject(),
          reports: emergencyReports,
          report_count: emergencyReports.length,
          completion_summary: generateCompletionSummary(emergencyReports),
        };
      })
      .filter((emergency) => emergency.reports.length > 0); // Only include emergencies with reports from this agency

    const totalCount = emergenciesWithReports.length;

    res.status(200).json({
      message: "Completed emergencies with reports retrieved successfully",
      data: {
        completed_emergencies: emergenciesWithReports,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
        summary: {
          total_completed: totalCount,
          agency_name: agency.name,
          agency_type: agency.agency_type,
        },
        filters: {
          emergency_type,
          severity,
          outcome,
          date_from,
          date_to,
        },
      },
    });
  } catch (error) {
    console.error(
      "❌ Error fetching completed emergencies with reports:",
      error
    );
    res.status(500).json({
      message: "Error retrieving completed emergencies",
      error: error.message,
    });
  }
}

/**
 * Get detailed view of a specific emergency with all reports
 */
export async function getEmergencyWithReports(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { emergencyId } = req.params;

    // Get admin's agency
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    // Get emergency details
    const emergency = await emergencyRequestModel
      .findById(emergencyId)
      .populate("user_id", "name phone_number email");

    if (!emergency) {
      return res.status(404).json({
        message: "Emergency not found",
      });
    }

    // Get all reports for this emergency from agency responders
    const reports = await responderReportModel.aggregate([
      {
        $match: {
          emergency_id: emergency._id,
        },
      },
      {
        $lookup: {
          from: "responders",
          localField: "responder_id",
          foreignField: "_id",
          as: "responder",
        },
      },
      {
        $unwind: "$responder",
      },
      {
        $match: {
          "responder.agency_id": agency.agency_id,
        },
      },
      {
        $sort: {
          submitted_at: -1,
        },
      },
    ]);

    if (reports.length === 0) {
      return res.status(403).json({
        message: "No reports found for this emergency from your agency",
      });
    }

    // Generate comprehensive summary
    const summary = {
      ...generateCompletionSummary(reports),
      timeline: generateTimeline(reports),
      resource_utilization: generateResourceSummary(reports),
    };

    res.status(200).json({
      message: "Emergency details with reports retrieved successfully",
      data: {
        emergency: emergency,
        reports: reports,
        summary: summary,
        agency_info: {
          name: agency.name,
          type: agency.agency_type,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching emergency with reports:", error);
    res.status(500).json({
      message: "Error retrieving emergency details",
      error: error.message,
    });
  }
}

/**
 * Get report statistics for admin dashboard
 */
export async function getReportStatistics(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { period = "30" } = req.query; // days

    // Get admin's agency
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(period));

    // Aggregate statistics
    const stats = await responderReportModel.aggregate([
      {
        $lookup: {
          from: "responders",
          localField: "responder_id",
          foreignField: "_id",
          as: "responder",
        },
      },
      {
        $unwind: "$responder",
      },
      {
        $match: {
          "responder.agency_id": agency.agency_id,
          submitted_at: { $gte: dateFrom },
        },
      },
      {
        $group: {
          _id: null,
          total_reports: { $sum: 1 },
          outcomes: {
            $push: "$outcome",
          },
          severity_assessments: {
            $push: "$severity_assessment",
          },
          total_casualties: {
            $sum: {
              $add: [
                "$casualties.injured",
                "$casualties.deceased",
                "$casualties.rescued",
              ],
            },
          },
          total_injured: { $sum: "$casualties.injured" },
          total_deceased: { $sum: "$casualties.deceased" },
          total_rescued: { $sum: "$casualties.rescued" },
          property_damages: {
            $push: "$property_damage",
          },
          follow_ups_required: {
            $sum: { $cond: ["$follow_up_required", 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      total_reports: 0,
      outcomes: [],
      severity_assessments: [],
      total_casualties: 0,
      total_injured: 0,
      total_deceased: 0,
      total_rescued: 0,
      property_damages: [],
      follow_ups_required: 0,
    };

    // Process arrays into counts
    const outcomeStats = result.outcomes.reduce((acc, outcome) => {
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});

    const severityStats = result.severity_assessments.reduce(
      (acc, severity) => {
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {}
    );

    const damageStats = result.property_damages.reduce((acc, damage) => {
      acc[damage] = (acc[damage] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      message: "Report statistics retrieved successfully",
      data: {
        period_days: parseInt(period),
        agency_info: {
          name: agency.name,
          type: agency.agency_type,
        },
        summary: {
          total_reports: result.total_reports,
          total_casualties: result.total_casualties,
          total_injured: result.total_injured,
          total_deceased: result.total_deceased,
          total_rescued: result.total_rescued,
          follow_ups_required: result.follow_ups_required,
        },
        breakdowns: {
          outcomes: outcomeStats,
          severity_assessments: severityStats,
          property_damage: damageStats,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching report statistics:", error);
    res.status(500).json({
      message: "Error retrieving report statistics",
      error: error.message,
    });
  }
}

// Helper Functions

function generateCompletionSummary(reports) {
  const summary = {
    total_reports: reports.length,
    outcomes: {},
    severity_levels: {},
    total_casualties: { injured: 0, deceased: 0, rescued: 0 },
    follow_up_required: 0,
    average_response_duration: 0,
  };

  let totalDuration = 0;

  reports.forEach((report) => {
    // Count outcomes
    summary.outcomes[report.outcome] =
      (summary.outcomes[report.outcome] || 0) + 1;

    // Count severity levels
    summary.severity_levels[report.severity_assessment] =
      (summary.severity_levels[report.severity_assessment] || 0) + 1;

    // Sum casualties
    summary.total_casualties.injured += report.casualties?.injured || 0;
    summary.total_casualties.deceased += report.casualties?.deceased || 0;
    summary.total_casualties.rescued += report.casualties?.rescued || 0;

    // Count follow-ups
    if (report.follow_up_required) summary.follow_up_required++;

    // Calculate duration
    if (report.arrival_time && report.departure_time) {
      const duration =
        new Date(report.departure_time) - new Date(report.arrival_time);
      totalDuration += duration;
    }
  });

  // Calculate average duration in minutes
  if (reports.length > 0 && totalDuration > 0) {
    summary.average_response_duration = Math.round(
      totalDuration / (reports.length * 60000)
    ); // Convert to minutes
  }

  return summary;
}

function generateTimeline(reports) {
  return reports
    .map((report) => ({
      responder: report.responder?.name || "Unknown",
      badge_number: report.responder?.badgeNumber || "N/A",
      arrival_time: report.arrival_time,
      departure_time: report.departure_time,
      duration_minutes:
        report.arrival_time && report.departure_time
          ? Math.round(
              (new Date(report.departure_time) -
                new Date(report.arrival_time)) /
                60000
            )
          : null,
      outcome: report.outcome,
      actions_taken: report.actions_taken,
    }))
    .sort((a, b) => new Date(a.arrival_time) - new Date(b.arrival_time));
}

function generateResourceSummary(reports) {
  const resources = {
    total_personnel: 0,
    equipment_used: new Set(),
    vehicles_used: new Set(),
  };

  reports.forEach((report) => {
    if (report.resources_used) {
      resources.total_personnel += report.resources_used.personnel_count || 0;

      if (report.resources_used.equipment) {
        report.resources_used.equipment.forEach((item) =>
          resources.equipment_used.add(item)
        );
      }

      if (report.resources_used.vehicles_used) {
        report.resources_used.vehicles_used.forEach((vehicle) =>
          resources.vehicles_used.add(vehicle)
        );
      }
    }
  });

  return {
    total_personnel: resources.total_personnel,
    equipment_used: Array.from(resources.equipment_used),
    vehicles_used: Array.from(resources.vehicles_used),
  };
}
