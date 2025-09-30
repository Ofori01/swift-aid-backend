import { io } from "../../server/index.mjs";
import {
  addRespondersToEmergencyRoom,
  notifyEmergencyCreated,
  notifyEmergencyCompleted,
} from "./events.mjs";

/**
 * Socket Service Class for managing real-time communications
 * This provides a clean interface for other parts of the application to use sockets
 */
class SocketService {
  /**
   * Initialize emergency room and notify relevant parties
   * Called when an emergency request is successfully created and responders are dispatched
   */
  static async initializeEmergencyRoom(emergencyData, selectedResponders) {
    const {
      _id: emergencyId,
      user_id,
      emergency_type,
      severity,
      description,
      emergency_location,
      createdAt,
    } = emergencyData;

    // Extract all responder IDs from selected responders
    const responderIds = [];

    if (selectedResponders.ambulances) {
      responderIds.push(
        ...selectedResponders.ambulances.map((r) => r.responder_id)
      );
    }
    if (selectedResponders.fire_trucks) {
      responderIds.push(
        ...selectedResponders.fire_trucks.map((r) => r.responder_id)
      );
    }
    if (selectedResponders.police_units) {
      responderIds.push(
        ...selectedResponders.police_units.map((r) => r.responder_id)
      );
    }

    // Prepare emergency details for responders
    const emergencyDetails = {
      _id: emergencyId,
      emergency_type,
      severity,
      description,
      emergency_location,
      createdAt,
    };

    // Add responders to emergency room and notify them
    addRespondersToEmergencyRoom(
      emergencyId.toString(),
      responderIds,
      emergencyDetails
    );

    // Notify user that emergency was created
    notifyEmergencyCreated(user_id, emergencyData);

    // Return room info for potential additional use
    return {
      emergencyRoomId: emergencyId.toString(),
      responderIds,
      userRoomId: user_id.toString(),
    };
  }

  /**
   * Update emergency status and notify all room members
   */
  static updateEmergencyStatus(emergencyId, status, adminId, notes = null) {
    const payload = {
      emergencyId: emergencyId.toString(),
      status,
      adminId,
      notes,
      timestamp: new Date().toISOString(),
    };

    io.to(emergencyId.toString()).emit("emergency-status-update", payload);

    // If completed, also send completion notification
    if (status === "Completed") {
      notifyEmergencyCompleted(emergencyId.toString(), { status, notes });
    }

    return payload;
  }

  /**
   * Notify specific responders about new emergency assignment
   */
  static notifyRespondersAssignment(responderIds, emergencyDetails) {
    responderIds.forEach((responderId) => {
      io.to(responderId.toString()).emit("emergency-assigned", {
        emergencyId: emergencyDetails._id.toString(),
        emergencyDetails: {
          location: emergencyDetails.emergency_location,
          type: emergencyDetails.emergency_type,
          severity: emergencyDetails.severity,
          description: emergencyDetails.description,
          timestamp: emergencyDetails.createdAt,
        },
        message: "You have been assigned to a new emergency",
      });
    });
  }

  /**
   * Broadcast message to emergency room
   */
  static sendEmergencyRoomMessage(emergencyId, message, senderType, senderId) {
    const payload = {
      emergencyId: emergencyId.toString(),
      message,
      senderType,
      senderId,
      timestamp: new Date().toISOString(),
    };

    io.to(emergencyId.toString()).emit("new-message", payload);
    return payload;
  }

  /**
   * Get room information (for debugging/monitoring)
   */
  static getRoomInfo(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    return {
      roomId,
      memberCount: room ? room.size : 0,
      members: room ? Array.from(room) : [],
    };
  }

  /**
   * Force disconnect user from room (admin action)
   */
  static disconnectUserFromRoom(userId, roomId) {
    const userSockets = io.sockets.adapter.rooms.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
        }
      });
    }
  }

  /**
   * Broadcast system-wide announcement (admin feature)
   */
  static broadcastSystemAnnouncement(message, targetType = "all") {
    const payload = {
      type: "system-announcement",
      message,
      timestamp: new Date().toISOString(),
      targetType,
    };

    io.emit("system-announcement", payload);
    return payload;
  }

  /**
   * Get connected users count by type
   */
  static getConnectedUsersStats() {
    const sockets = Array.from(io.sockets.sockets.values());
    const stats = {
      total: sockets.length,
      users: sockets.filter((s) => s.userType === "user").length,
      responders: sockets.filter((s) => s.userType === "responder").length,
      admins: sockets.filter((s) => s.userType === "admin").length,
      rooms: io.sockets.adapter.rooms.size,
    };

    return stats;
  }
}

export default SocketService;
