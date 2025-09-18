import emergencyRequestModel from "../../../emergency-requests-management/models/emergency-request-schema.mjs";
import responderModel from "../../models/responder-schema.mjs";
import {
  validateResponderAssignment,
  getResponderEmergencies,
  updateResponderResponse,
  getResponderEmergencyStats,
} from "../../services/emergency.mjs";

/**
 * Get emergency details by emergency ID for assigned responders
 * @route GET /api/responders/emergency/:emergencyId
 * @access Private (Responder only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Emergency details with responder-specific information
 */
export async function getEmergencyDetails(req, res, next) {
  try {
    const { emergencyId } = req.params;
    const responderInfo = req.user; // From auth middleware

    // Input validation
    if (!emergencyId) {
      return res.status(400).json({
        success: false,
        message: "Emergency ID is required",
        code: "MISSING_EMERGENCY_ID",
      });
    }

    // Validate emergency ID format
    if (!emergencyId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency ID format",
        code: "INVALID_EMERGENCY_ID",
      });
    }

    // Get responder details for authorization check
    const responder = await responderModel.findOne({
      badgeNumber: responderInfo.badgeNumber,
    });

    if (!responder) {
      return res.status(404).json({
        success: false,
        message: "Responder not found",
        code: "RESPONDER_NOT_FOUND",
      });
    }

    // Fetch emergency details with populated references
    const emergency = await emergencyRequestModel
      .findById(emergencyId)
      .populate("user_id", "name phone email")
      .populate("assigned_admin_id", "name")
      .lean();

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
        code: "EMERGENCY_NOT_FOUND",
      });
    }

    // Validate that the responder is assigned to this emergency
    const isAssigned = await validateResponderAssignment(
      emergency,
      responder.responder_id
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not assigned to this emergency",
        code: "ACCESS_DENIED",
      });
    }

    // Get responder-specific assignment details
    const responderAssignment = getResponderAssignmentDetails(
      emergency,
      responder.responder_id
    );

    // Format response with responder-relevant information
    const emergencyDetails = {
      id: emergency._id,
      description: emergency.description,
      severity: emergency.severity,
      status: emergency.status,
      emergency_type: emergency.emergency_type,
      location: {
        type: emergency.emergency_location.type,
        coordinates: emergency.emergency_location.coordinates,
        // Add human-readable address if available
        address: emergency.address || null,
      },
      user: {
        name: emergency.user_id?.name || "Anonymous",
        phone: emergency.user_id?.phone || "Not provided",
        // Don't expose email for privacy
      },
      admin_notes: emergency.admin_notes,
      assigned_admin: emergency.assigned_admin_id?.name || null,
      assignment_details: responderAssignment,
      ai_recommendations: emergency.ai_recommendations,
      created_at: emergency.createdAt,
      updated_at: emergency.updatedAt,
      // Add time-sensitive information
      time_elapsed: calculateTimeElapsed(emergency.createdAt),
      priority_level: determinePriorityLevel(emergency),
    };

    console.log(
      `✅ Emergency details retrieved for responder ${responder.name} (${responder.badgeNumber}) - Emergency: ${emergencyId}`
    );

    return res.status(200).json({
      success: true,
      message: "Emergency details retrieved successfully",
      data: emergencyDetails,
    });
  } catch (error) {
    console.error(`❌ Error retrieving emergency details:`, error);

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving emergency details",
      code: "INTERNAL_ERROR",
    });
  }
}

/**
 * Get responder's assignment details within an emergency
 * @param {Object} emergency - Emergency document
 * @param {String} responderId - Responder's ID
 * @returns {Object} Assignment details specific to the responder
 */
function getResponderAssignmentDetails(emergency, responderId) {
  const allCategories = ["ambulances", "fire_trucks", "police_units"];

  for (const category of allCategories) {
    const responders = emergency.selected_responders?.[category] || [];
    const assignment = responders.find(
      (r) => r.responder_id.toString() === responderId.toString()
    );

    if (assignment) {
      return {
        category: category.replace("_", " "),
        travel_time: assignment.travelTime,
        route_type: assignment.routeType,
        estimated_arrival: assignment.travelTime
          ? new Date(Date.now() + assignment.travelTime * 60000).toISOString()
          : null,
      };
    }
  }

  return null;
}

/**
 * Calculate time elapsed since emergency creation
 * @param {Date} createdAt - Emergency creation timestamp
 * @returns {String} Human-readable time elapsed
 */
function calculateTimeElapsed(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

/**
 * Determine priority level based on severity and time
 * @param {Object} emergency - Emergency document
 * @returns {String} Priority level
 */
function determinePriorityLevel(emergency) {
  const severityMap = {
    Critical: "URGENT",
    High: "HIGH",
    Medium: "MEDIUM",
    Low: "LOW",
  };

  const basePriority = severityMap[emergency.severity] || "MEDIUM";

  // Escalate priority if emergency is old and still pending
  const ageMinutes = (Date.now() - new Date(emergency.createdAt)) / (1000 * 60);
  if (emergency.status === "Pending" && ageMinutes > 30) {
    return basePriority === "LOW" ? "MEDIUM" : "URGENT";
  }

  return basePriority;
}

/**
 * Get all emergencies assigned to the authenticated responder
 * @route GET /api/responders/emergencies
 * @access Private (Responder only)
 */
export async function getMyEmergencies(req, res, next) {
  try {
    const responderInfo = req.user;
    const {
      status,
      emergency_type,
      from_date,
      to_date,
      limit = 20,
      page = 1,
    } = req.query;

    // Get responder details
    const responder = await responderModel.findOne({
      badgeNumber: responderInfo.badgeNumber,
    });

    if (!responder) {
      return res.status(404).json({
        success: false,
        message: "Responder not found",
        code: "RESPONDER_NOT_FOUND",
      });
    }

    // Prepare filters
    const filters = {};
    if (status) filters.status = status;
    if (emergency_type) filters.emergency_type = emergency_type;
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;

    // Get emergencies
    const emergencies = await getResponderEmergencies(
      responder.responder_id,
      filters
    );

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEmergencies = emergencies.slice(startIndex, endIndex);

    // Format response
    const formattedEmergencies = paginatedEmergencies.map((emergency) => ({
      id: emergency._id,
      description: emergency.description,
      severity: emergency.severity,
      status: emergency.status,
      emergency_type: emergency.emergency_type,
      location: emergency.emergency_location,
      created_at: emergency.createdAt,
      time_elapsed: calculateTimeElapsed(emergency.createdAt),
      priority_level: determinePriorityLevel(emergency),
    }));

    return res.status(200).json({
      success: true,
      message: "Emergencies retrieved successfully",
      data: {
        emergencies: formattedEmergencies,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(emergencies.length / limit),
          total_count: emergencies.length,
          per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error(`❌ Error getting responder emergencies:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}

/**
 * Update responder's response to an emergency
 * @route PUT /api/responders/emergency/:emergencyId/response
 * @access Private (Responder only)
 */
export async function updateEmergencyResponse(req, res, next) {
  try {
    const { emergencyId } = req.params;
    const { status, eta, notes } = req.body;
    const responderInfo = req.user;

    // Input validation
    if (!emergencyId || !status) {
      return res.status(400).json({
        success: false,
        message: "Emergency ID and status are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    const validStatuses = [
      "accepted",
      "declined",
      "en_route",
      "arrived",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
        code: "INVALID_STATUS",
      });
    }

    // Get responder details
    const responder = await responderModel.findOne({
      badgeNumber: responderInfo.badgeNumber,
    });

    if (!responder) {
      return res.status(404).json({
        success: false,
        message: "Responder not found",
        code: "RESPONDER_NOT_FOUND",
      });
    }

    // Update response
    const additionalData = {};
    if (eta) additionalData.eta = eta;
    if (notes) additionalData.notes = notes;

    const updatedEmergency = await updateResponderResponse(
      emergencyId,
      responder.responder_id,
      status,
      additionalData
    );

    console.log(
      `✅ Responder ${responder.name} updated status to ${status} for emergency ${emergencyId}`
    );

    return res.status(200).json({
      success: true,
      message: "Response updated successfully",
      data: {
        emergency_id: emergencyId,
        status: status,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`❌ Error updating emergency response:`, error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "NOT_FOUND",
      });
    }

    if (error.message.includes("not assigned")) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: "ACCESS_DENIED",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}

/**
 * Get emergency statistics for the authenticated responder
 * @route GET /api/responders/emergency-stats
 * @access Private (Responder only)
 */
export async function getMyEmergencyStats(req, res, next) {
  try {
    const responderInfo = req.user;
    const { from_date, to_date } = req.query;

    // Get responder details
    const responder = await responderModel.findOne({
      badgeNumber: responderInfo.badgeNumber,
    });

    if (!responder) {
      return res.status(404).json({
        success: false,
        message: "Responder not found",
        code: "RESPONDER_NOT_FOUND",
      });
    }

    // Prepare date range
    const dateRange = {};
    if (from_date) dateRange.from = from_date;
    if (to_date) dateRange.to = to_date;

    // Get statistics
    const stats = await getResponderEmergencyStats(
      responder.responder_id,
      dateRange
    );

    return res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        responder_id: responder.responder_id,
        responder_name: responder.name,
        date_range: dateRange,
        statistics: stats,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`❌ Error getting emergency statistics:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
