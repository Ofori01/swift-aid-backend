import responderReportModel from "../models/responder-report-schema.mjs";
import emergencyRequestModel from "../../emergency-requests-management/models/emergency-request-schema.mjs";
import responderModel from "../models/responder-schema.mjs";
import SocketService from "../../../utils/socket-io/socketService.mjs";

/**
 * Submit a responder report for a completed emergency
 */
export async function submitReport(req, res) {
  try {
    const responderId = req.user.responder_id || req.user.user_id;
    const {
      emergency_id,
      arrival_time,
      departure_time,
      actions_taken,
      casualties,
      property_damage,
      resources_used,
      outcome,
      severity_assessment,
      additional_notes,
      location_details,
      follow_up_required,
      follow_up_details,
    } = req.body;

    // Validate required fields
    if (
      !emergency_id ||
      !arrival_time ||
      !departure_time ||
      !actions_taken ||
      !outcome ||
      !severity_assessment
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        required: [
          "emergency_id",
          "arrival_time",
          "departure_time",
          "actions_taken",
          "outcome",
          "severity_assessment",
        ],
      });
    }

    // Validate times
    if (new Date(arrival_time) >= new Date(departure_time)) {
      return res.status(400).json({
        message: "Departure time must be after arrival time",
      });
    }

    // Check if emergency exists and responder was assigned
    const emergency = await emergencyRequestModel.findById(emergency_id);
    if (!emergency) {
      return res.status(404).json({
        message: "Emergency request not found",
      });
    }

    // Check if responder was actually assigned to this emergency
    const responderAssigned = await checkResponderAssignment(
      emergency_id,
      responderId
    );
    if (!responderAssigned) {
      return res.status(403).json({
        message: "You were not assigned to this emergency",
      });
    }

    // Check if report already exists
    const existingReport = await responderReportModel.findOne({
      emergency_id,
      responder_id: responderId,
    });

    if (existingReport) {
      return res.status(409).json({
        message: "Report already submitted for this emergency",
        report_id: existingReport._id,
      });
    }

    // Create the report
    const reportData = {
      emergency_id,
      responder_id: responderId,
      arrival_time: new Date(arrival_time),
      departure_time: new Date(departure_time),
      actions_taken,
      casualties: casualties || { injured: 0, deceased: 0, rescued: 0 },
      property_damage: property_damage || "None",
      resources_used: resources_used || {
        equipment: [],
        personnel_count: 1,
        vehicles_used: [],
      },
      outcome,
      severity_assessment,
      additional_notes: additional_notes || "",
      location_details: location_details || {},
      follow_up_required: follow_up_required || false,
      follow_up_details: follow_up_details || "",
    };

    const newReport = new responderReportModel(reportData);
    const savedReport = await newReport.save();

    // Check if this is the first report and update emergency status to "Completed"
    const existingReports = await responderReportModel.countDocuments({
      emergency_id,
    });

    if (existingReports === 1) {
      // This is the first report
      await emergencyRequestModel.findByIdAndUpdate(emergency_id, {
        status: "Completed",
        updated_at: new Date(),
      });

      // Notify via socket that emergency is completed
      try {
        SocketService.updateEmergencyStatus(
          emergency_id,
          "Completed",
          null, // No admin involvement
          `Emergency marked as completed after responder report submission`
        );
      } catch (socketError) {
        console.error("❌ Error sending socket notification:", socketError);
      }

      console.log(
        `✅ Emergency ${emergency_id} marked as completed after first responder report`
      );
    }

    res.status(201).json({
      message: "Report submitted successfully",
      data: {
        report: savedReport,
        emergency_status_updated: existingReports === 1,
      },
    });
  } catch (error) {
    console.error("❌ Error submitting report:", error);
    res.status(500).json({
      message: "Error submitting report",
      error: error.message,
    });
  }
}

/**
 * Get reports submitted by the authenticated responder
 */
export async function getMyReports(req, res) {
  try {
    const responderId = req.user.responder_id || req.user.user_id;
    const { page = 1, limit = 10, status, outcome } = req.query;

    const query = { responder_id: responderId };
    if (status) query.status = status;
    if (outcome) query.outcome = outcome;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, totalCount] = await Promise.all([
      responderReportModel
        .find(query)
        .populate(
          "emergency_id",
          "description emergency_type severity emergency_location createdAt"
        )
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      responderReportModel.countDocuments(query),
    ]);

    res.status(200).json({
      message: "Reports retrieved successfully",
      data: {
        reports,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching reports:", error);
    res.status(500).json({
      message: "Error retrieving reports",
      error: error.message,
    });
  }
}

/**
 * Get a specific report by ID (responder can only view their own reports)
 */
export async function getReportById(req, res) {
  try {
    const responderId = req.user.responder_id || req.user.user_id;
    const { reportId } = req.params;

    const report = await responderReportModel
      .findOne({ _id: reportId, responder_id: responderId })
      .populate(
        "emergency_id",
        "description emergency_type severity emergency_location createdAt user_id"
      )
      .populate("responder_id", "name badgeNumber phone");

    if (!report) {
      return res.status(404).json({
        message: "Report not found or access denied",
      });
    }

    res.status(200).json({
      message: "Report retrieved successfully",
      data: {
        report,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching report:", error);
    res.status(500).json({
      message: "Error retrieving report",
      error: error.message,
    });
  }
}

/**
 * Update a report (only if status is Draft)
 */
export async function updateReport(req, res) {
  try {
    const responderId = req.user.responder_id || req.user.user_id;
    const { reportId } = req.params;
    const updateData = req.body;

    // Find the report
    const existingReport = await responderReportModel.findOne({
      _id: reportId,
      responder_id: responderId,
    });

    if (!existingReport) {
      return res.status(404).json({
        message: "Report not found or access denied",
      });
    }

    // Only allow updates if report is in Draft status
    if (existingReport.status !== "Draft") {
      return res.status(403).json({
        message: "Cannot update submitted report",
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData.report_id;
    delete updateData.emergency_id;
    delete updateData.responder_id;
    delete updateData.submitted_at;

    // Add updated timestamp
    updateData.updated_at = new Date();

    const updatedReport = await responderReportModel.findByIdAndUpdate(
      reportId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Report updated successfully",
      data: {
        report: updatedReport,
      },
    });
  } catch (error) {
    console.error("❌ Error updating report:", error);
    res.status(500).json({
      message: "Error updating report",
      error: error.message,
    });
  }
}

// Helper Functions

/**
 * Check if responder was assigned to the emergency
 */
async function checkResponderAssignment(emergencyId, responderId) {
  const emergency = await emergencyRequestModel.findById(emergencyId);
  if (!emergency) return false;

  // Check in selected_responders
  const allResponderIds = [
    ...(emergency.selected_responders?.ambulances || []).map((r) =>
      r.responder_id?.toString()
    ),
    ...(emergency.selected_responders?.fire_trucks || []).map((r) =>
      r.responder_id?.toString()
    ),
    ...(emergency.selected_responders?.police_units || []).map((r) =>
      r.responder_id?.toString()
    ),
  ];

  return allResponderIds.includes(responderId.toString());
}

export { checkResponderAssignment };
