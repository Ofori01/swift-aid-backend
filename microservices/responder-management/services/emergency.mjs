import emergencyRequestModel from "../../emergency-requests-management/models/emergency-request-schema.mjs";

/**
 * Emergency service functions for responder management
 * Handles business logic for emergency-related operations
 */

/**
 * Validate if a responder is assigned to a specific emergency
 * @param {Object} emergency - Emergency document
 * @param {String} responderId - Responder's ID to validate
 * @returns {Boolean} True if responder is assigned, false otherwise
 */
export async function validateResponderAssignment(emergency, responderId) {
  try {
    if (!emergency || !emergency.selected_responders) {
      return false;
    }

    const { selected_responders } = emergency;
    const allCategories = ["ambulances", "fire_trucks", "police_units"];

    // Check if responder is assigned in any category
    for (const category of allCategories) {
      const responders = selected_responders[category] || [];
      const isAssigned = responders.some(
        (responder) =>
          responder.responder_id.toString() === responderId.toString()
      );

      if (isAssigned) {
        console.log(
          `✅ Responder ${responderId} found in ${category} for emergency ${emergency._id}`
        );
        return true;
      }
    }

    console.log(
      `❌ Responder ${responderId} not assigned to emergency ${emergency._id}`
    );
    return false;
  } catch (error) {
    console.error(`❌ Error validating responder assignment:`, error);
    return false;
  }
}

/**
 * Get all emergencies assigned to a specific responder
 * @param {String} responderId - Responder's ID
 * @param {Object} filters - Optional filters (status, date range, etc.)
 * @returns {Array} List of assigned emergencies
 */
export async function getResponderEmergencies(responderId, filters = {}) {
  try {
    const query = {
      $or: [
        { "selected_responders.ambulances.responder_id": responderId },
        { "selected_responders.fire_trucks.responder_id": responderId },
        { "selected_responders.police_units.responder_id": responderId },
      ],
    };

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.emergency_type) {
      query.emergency_type = filters.emergency_type;
    }

    if (filters.from_date || filters.to_date) {
      query.createdAt = {};
      if (filters.from_date) {
        query.createdAt.$gte = new Date(filters.from_date);
      }
      if (filters.to_date) {
        query.createdAt.$lte = new Date(filters.to_date);
      }
    }

    const emergencies = await emergencyRequestModel
      .find(query)
      .populate("user_id", "name phone")
      .populate("assigned_admin_id", "name")
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      `✅ Found ${emergencies.length} emergencies for responder ${responderId}`
    );
    return emergencies;
  } catch (error) {
    console.error(`❌ Error getting responder emergencies:`, error);
    throw error;
  }
}

/**
 * Update responder's response status for an emergency
 * @param {String} emergencyId - Emergency ID
 * @param {String} responderId - Responder's ID
 * @param {String} status - Response status (accepted, declined, en_route, arrived, completed)
 * @param {Object} additionalData - Additional data (ETA, notes, etc.)
 * @returns {Object} Updated emergency document
 */
export async function updateResponderResponse(
  emergencyId,
  responderId,
  status,
  additionalData = {}
) {
  try {
    const emergency = await emergencyRequestModel.findById(emergencyId);

    if (!emergency) {
      throw new Error("Emergency not found");
    }

    // Validate responder assignment
    const isAssigned = await validateResponderAssignment(
      emergency,
      responderId
    );
    if (!isAssigned) {
      throw new Error("Responder not assigned to this emergency");
    }

    // Update responder status in the appropriate category
    const allCategories = ["ambulances", "fire_trucks", "police_units"];
    let updated = false;

    for (const category of allCategories) {
      const responders = emergency.selected_responders[category] || [];
      const responderIndex = responders.findIndex(
        (r) => r.responder_id.toString() === responderId.toString()
      );

      if (responderIndex !== -1) {
        // Update responder status and additional data
        emergency.selected_responders[category][responderIndex].status = status;

        if (additionalData.eta) {
          emergency.selected_responders[category][responderIndex].eta =
            additionalData.eta;
        }

        if (additionalData.notes) {
          emergency.selected_responders[category][responderIndex].notes =
            additionalData.notes;
        }

        emergency.selected_responders[category][responderIndex].last_updated =
          new Date();
        updated = true;
        break;
      }
    }

    if (!updated) {
      throw new Error("Failed to update responder status");
    }

    // Save the updated emergency
    const updatedEmergency = await emergency.save();

    console.log(
      `✅ Updated responder ${responderId} status to ${status} for emergency ${emergencyId}`
    );
    return updatedEmergency;
  } catch (error) {
    console.error(`❌ Error updating responder response:`, error);
    throw error;
  }
}

/**
 * Get emergency statistics for a responder
 * @param {String} responderId - Responder's ID
 * @param {Object} dateRange - Date range for statistics
 * @returns {Object} Statistics object
 */
export async function getResponderEmergencyStats(responderId, dateRange = {}) {
  try {
    const matchQuery = {
      $or: [
        { "selected_responders.ambulances.responder_id": responderId },
        { "selected_responders.fire_trucks.responder_id": responderId },
        { "selected_responders.police_units.responder_id": responderId },
      ],
    };

    if (dateRange.from || dateRange.to) {
      matchQuery.createdAt = {};
      if (dateRange.from) matchQuery.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) matchQuery.createdAt.$lte = new Date(dateRange.to);
    }

    const stats = await emergencyRequestModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total_assigned: { $sum: 1 },
          by_status: {
            $push: "$status",
          },
          by_type: {
            $push: "$emergency_type",
          },
          by_severity: {
            $push: "$severity",
          },
          avg_response_time: {
            $avg: "$response_metrics.average_response_time",
          },
        },
      },
    ]);

    if (!stats.length) {
      return {
        total_assigned: 0,
        by_status: {},
        by_type: {},
        by_severity: {},
        avg_response_time: 0,
      };
    }

    const result = stats[0];

    // Process arrays into counts
    const statusCounts = result.by_status.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const typeCounts = result.by_type.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const severityCounts = result.by_severity.reduce((acc, severity) => {
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    return {
      total_assigned: result.total_assigned,
      by_status: statusCounts,
      by_type: typeCounts,
      by_severity: severityCounts,
      avg_response_time: Math.round(result.avg_response_time || 0),
    };
  } catch (error) {
    console.error(`❌ Error getting responder emergency stats:`, error);
    throw error;
  }
}
