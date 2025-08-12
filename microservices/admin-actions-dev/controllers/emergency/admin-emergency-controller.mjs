import emergencyRequestModel from "../../../emergency-requests-management/models/emergency-request-schema.mjs";
import responderModel from "../../../responder-management/models/responder-schema.mjs";
import agencyModel from "../../models/agencies-schema.mjs";

/**
 * Get all emergencies involving admin's agency
 */
export async function getAgencyEmergencies(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const {
      page = 1,
      limit = 20,
      status,
      emergency_type,
      severity,
      sort_by = "createdAt",
      sort_order = "desc",
    } = req.query;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const agencyId = agency._id.toString();
    const responderIds = await getAgencyResponderIds(agencyId);

    // Build query filters
    const matchQuery = {
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
    };

    if (status) matchQuery.status = status;
    if (emergency_type) matchQuery.emergency_type = emergency_type;
    if (severity) matchQuery.severity = severity;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortQuery = {};
    sortQuery[sort_by] = sort_order === "asc" ? 1 : -1;

    const [emergencies, totalCount] = await Promise.all([
      emergencyRequestModel
        .find(matchQuery)
        .populate("user_id", "name phone_number")
        .select("-__v")
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit)),
      emergencyRequestModel.countDocuments(matchQuery),
    ]);

    // Get agency responders involved in each emergency
    const emergenciesWithResponders = await Promise.all(
      emergencies.map(async (emergency) => {
        const involvedResponders = await getInvolvedResponders(
          emergency,
          agencyId
        );
        return {
          ...emergency.toObject(),
          agency_responders: involvedResponders,
        };
      })
    );

    res.status(200).json({
      message: "Agency emergencies retrieved successfully",
      data: {
        emergencies: emergenciesWithResponders,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
        filters: {
          status,
          emergency_type,
          severity,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching agency emergencies:", error);
    res.status(500).json({
      message: "Error retrieving agency emergencies",
      error: error.message,
    });
  }
}

/**
 * Get detailed information about a specific emergency
 */
export async function getEmergencyDetails(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { emergencyId } = req.params;

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const emergency = await emergencyRequestModel
      .findById(emergencyId)
      .populate("user_id", "name phone_number email")
      .populate("assigned_responders", "name badgeNumber phone status");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // Check if this emergency involves the admin's agency
    const agencyId = agency._id.toString();
    const responderIds = await getAgencyResponderIds(agencyId);
    const isInvolved = await checkAgencyInvolvement(emergency, responderIds);

    if (!isInvolved) {
      return res.status(403).json({
        message: "This emergency does not involve your agency's responders",
      });
    }

    // Get detailed responder information
    const involvedResponders = await getInvolvedResponders(emergency, agencyId);

    res.status(200).json({
      message: "Emergency details retrieved successfully",
      data: {
        emergency: emergency,
        agency_responders: involvedResponders,
        agency_info: {
          name: agency.name,
          type: agency.agency_type,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching emergency details:", error);
    res.status(500).json({
      message: "Error retrieving emergency details",
      error: error.message,
    });
  }
}

/**
 * Update emergency status (admin can mark as completed, etc.)
 */
export async function updateEmergencyStatus(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { emergencyId } = req.params;
    const { status, admin_notes } = req.body;

    if (!status || !["Accepted", "Declined", "Completed"].includes(status)) {
      return res.status(400).json({
        message: "Valid status required (Accepted, Declined, Completed)",
      });
    }

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const emergency = await emergencyRequestModel.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // Check if this emergency involves the admin's agency
    const responderIds = await getAgencyResponderIds(agency._id.toString());
    const isInvolved = await checkAgencyInvolvement(emergency, responderIds);

    if (!isInvolved) {
      return res.status(403).json({
        message:
          "You can only update emergencies involving your agency's responders",
      });
    }

    // Update emergency
    const updatedEmergency = await emergencyRequestModel.findByIdAndUpdate(
      emergencyId,
      {
        $set: {
          status: status,
          assigned_admin_id: adminId,
          admin_notes: admin_notes,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Emergency status updated successfully",
      data: {
        emergency: updatedEmergency,
        updated_by: {
          admin_id: adminId,
          agency_name: agency.name,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error updating emergency status:", error);
    res.status(500).json({
      message: "Error updating emergency status",
      error: error.message,
    });
  }
}

/**
 * Assign specific responders to an emergency
 */
export async function assignResponders(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { emergencyId } = req.params;
    const { responder_ids } = req.body;

    if (!responder_ids || !Array.isArray(responder_ids)) {
      return res.status(400).json({
        message: "Array of responder IDs required",
      });
    }

    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const emergency = await emergencyRequestModel.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // Verify all responders belong to admin's agency
    const agencyResponders = await responderModel.find({
      _id: { $in: responder_ids },
      agency_id: agency._id.toString(),
    });

    if (agencyResponders.length !== responder_ids.length) {
      return res.status(400).json({
        message: "Some responders do not belong to your agency",
      });
    }

    // Update emergency with assigned responders
    const updatedEmergency = await emergencyRequestModel
      .findByIdAndUpdate(
        emergencyId,
        {
          $addToSet: { assigned_responders: { $each: responder_ids } },
          $set: {
            assigned_admin_id: adminId,
            status: "Accepted",
            updatedAt: new Date(),
          },
        },
        { new: true }
      )
      .populate("assigned_responders", "name badgeNumber phone status");

    res.status(200).json({
      message: "Responders assigned successfully",
      data: {
        emergency: updatedEmergency,
        assigned_responders: agencyResponders,
      },
    });
  } catch (error) {
    console.error("❌ Error assigning responders:", error);
    res.status(500).json({
      message: "Error assigning responders",
      error: error.message,
    });
  }
}

// Helper functions
async function getAgencyResponderIds(agencyId) {
  const responders = await responderModel
    .find({ agency_id: agencyId })
    .select("_id");
  return responders.map((r) => r._id);
}

async function checkAgencyInvolvement(emergency, responderIds) {
  const selectedResponders = emergency.selected_responders;

  const isInvolved = [
    ...(selectedResponders.ambulances || []),
    ...(selectedResponders.fire_trucks || []),
    ...(selectedResponders.police_units || []),
  ].some((responder) =>
    responderIds.some(
      (id) => id.toString() === responder.responder_id.toString()
    )
  );

  return isInvolved;
}

async function getInvolvedResponders(emergency, agencyId) {
  const selectedResponders = emergency.selected_responders;
  const allInvolvedIds = [
    ...(selectedResponders.ambulances || []).map((r) => r.responder_id),
    ...(selectedResponders.fire_trucks || []).map((r) => r.responder_id),
    ...(selectedResponders.police_units || []).map((r) => r.responder_id),
  ];

  const responders = await responderModel
    .find({
      _id: { $in: allInvolvedIds },
      agency_id: agencyId,
    })
    .select("name badgeNumber phone status");

  return responders;
}
