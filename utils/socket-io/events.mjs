import { io } from "../../server/index.mjs";
import responderModel from "../../microservices/responder-management/models/responder-schema.mjs";
import emergencyRequestModel from "../../microservices/emergency-requests-management/models/emergency-request-schema.mjs";
import { authorizeRoomAccess } from "./socketAuth.mjs";
import {
  trackRoomJoin,
  trackRoomLeave,
  logConnectionEvent,
} from "./connectionMonitor.mjs";

// ============================
// CORE ROOM MANAGEMENT
// ============================

/**
 * Join a room (user joins emergency room, responder joins their personal room, admin joins emergency room)
 */
export function joinRoomEvent(socket) {
  return socket.on("join-room", async ({ roomId, userType, userId }) => {
    try {
      // Validate room access authorization
      const isAuthorized = await authorizeRoomAccess(
        socket,
        roomId,
        userType,
        userId
      );
      if (!isAuthorized) {
        console.log(
          `🚫 Unauthorized room access attempt: ${userType} ${userId} -> room ${roomId}`
        );
        socket.emit("error", {
          message: "Unauthorized: Cannot join this room",
          roomId,
          userType,
        });
        return;
      }

      // Join the room
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Track room join
      trackRoomJoin(roomId, userType);
      logConnectionEvent("room_join", socket, roomId);

      console.log(
        `🏠 Room joined successfully: ${userType} -> ${roomId} | Socket: ${socket.id}`
      );

      // For debugging - show all current rooms
      if (userType === "responder") {
        console.log(
          `📊 Current rooms after responder join:`,
          Array.from(io.sockets.adapter.rooms.keys())
        );
      }

      // Store connection info for reconnection
      socket.connectionInfo = {
        roomId,
        userType,
        userId,
        joinedAt: new Date().toISOString(),
      };

      // Notify room about new member (except for responder personal rooms)
      if (userType === "admin") {
        socket.to(roomId).emit("admin-joined", {
          adminId: userId,
          adminName: socket.userData?.name || "Admin",
          timestamp: new Date().toISOString(),
        });
      }

      // Send confirmation to the joining client
      socket.emit("room-joined", {
        roomId,
        userType,
        timestamp: new Date().toISOString(),
        message: `Successfully joined room ${roomId}`,
      });
    } catch (error) {
      console.error(
        `❌ Error joining room ${roomId} for ${userType} ${userId}:`,
        error
      );
      socket.emit("error", {
        message: "Failed to join room",
        roomId,
        error: error.message,
      });
    }
  });
}

/**
 * Leave a room gracefully
 */
export function leaveRoomEvent(socket) {
  return socket.on("leave-room", ({ roomId, userType, userId }) => {
    socket.leave(roomId);
    console.log(`${userType} ${userId} left room: ${roomId}`);

    if (userType === "admin") {
      socket.to(roomId).emit("admin-left", {
        adminId: userId,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// ============================
// EMERGENCY MANAGEMENT
// ============================

/**
 * Server-side function to add responders to emergency room when emergency is created
 */
export async function addRespondersToEmergencyRoom(
  emergencyId,
  responderIds,
  emergencyDetails
) {
  console.log(
    `🔔 Attempting to notify ${responderIds.length} responders for emergency ${emergencyId}`
  );
  console.log(`📋 Responder IDs received:`, responderIds);

  // These IDs could be either MongoDB _id or responder_id values
  // Try both approaches to find the responders
  const responderIdMappings = [];

  for (const receivedId of responderIds) {
    try {
      // First try finding by responder_id (more likely to be correct)
      let responder = await responderModel.findOne({
        responder_id: receivedId,
      });

      // If not found, try finding by MongoDB _id
      if (!responder) {
        responder = await responderModel.findById(receivedId);
      }

      if (responder && responder.responder_id) {
        responderIdMappings.push({
          mongoId: receivedId.toString(),
          responderId: responder.responder_id.toString(),
          name: responder.name,
        });
        console.log(
          `✅ Found responder ${responder.name} with responder_id: ${responder.responder_id}`
        );
      } else {
        console.log(`⚠️  Responder not found for ID: ${receivedId}`);
      }
    } catch (error) {
      console.error(`❌ Error looking up responder ${receivedId}:`, error);
    }
  }

  console.log(`🔄 Converted to responder_id mappings:`, responderIdMappings);

  responderIdMappings.forEach(({ mongoId, responderId, name }) => {
    const responderRoomId = responderId;
    console.log(
      `🔍 Looking for responder ${name} (${responderId}) in room: ${responderRoomId}`
    );

    // Check if responder room exists and has connected sockets
    const responderRoom = io.sockets.adapter.rooms.get(responderRoomId);
    console.log(
      `📍 Room ${responderRoomId} exists:`,
      !!responderRoom,
      `| Members:`,
      responderRoom ? responderRoom.size : 0
    );

    // Notify each responder about the emergency assignment
    io.to(responderRoomId).emit("emergency-assigned", {
      emergencyId,
      emergencyDetails: {
        location: emergencyDetails.emergency_location,
        type: emergencyDetails.emergency_type,
        severity: emergencyDetails.severity,
        description: emergencyDetails.description,
        timestamp: emergencyDetails.createdAt,
      },
      message: "You have been assigned to a new emergency",
    });

    console.log(
      `📤 Emergency assignment sent to responder ${name} in room: ${responderRoomId}`
    );

    // Add responder to emergency room if they are connected
    const responderSockets = io.sockets.adapter.rooms.get(responderRoomId);
    if (responderSockets) {
      responderSockets.forEach((socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(emergencyId);
          console.log(
            `✅ Responder ${name} (${responderId}) added to emergency room: ${emergencyId}`
          );
        }
      });
    } else {
      console.log(
        `⚠️  Responder ${name} (${responderId}) not connected or not in personal room`
      );
    }
  });
}

/**
 * When responder accepts emergency assignment
 */
export function acceptEmergencyEvent(socket) {
  return socket.on(
    "accept-emergency",
    async ({ emergencyId, responderId, estimatedArrival }) => {
      try {
        // Notify user and admin in emergency room
        socket.to(emergencyId).emit("responder-accepted", {
          responderId,
          estimatedArrival,
          timestamp: new Date().toISOString(),
          message: "A responder has accepted your emergency request",
        });

        console.log(
          `Responder ${responderId} accepted emergency ${emergencyId}`
        );
      } catch (error) {
        console.error("Error in accept emergency:", error);
        socket.emit("error", { message: "Failed to accept emergency" });
      }
    }
  );
}

/**
 * When responder declines emergency assignment
 */
export function declineEmergencyEvent(socket) {
  return socket.on(
    "decline-emergency",
    ({ emergencyId, responderId, reason }) => {
      // Remove responder from emergency room
      socket.leave(emergencyId);

      // Notify admin about declined assignment
      socket.to(emergencyId).emit("responder-declined", {
        responderId,
        reason,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `Responder ${responderId} declined emergency ${emergencyId}: ${reason}`
      );
    }
  );
}

// ============================
// REAL-TIME LOCATION & ETA UPDATES
// ============================

/**
 * Handle responder location updates
 */
export function updateLocationEvent(socket) {
  return socket.on(
    "update-location",
    async ({ responderId, location, emergencyId }) => {
      try {
        // Update responder location in database using responder_id field
        await responderModel.findOneAndUpdate(
          { responder_id: responderId },
          {
            current_location: {
              type: "Point",
              coordinates: [location.longitude, location.latitude],
            },
          }
        );

        // If responder is in an emergency, broadcast location to emergency room
        if (emergencyId) {
          // Check if this is the first location update for this emergency
          const emergency = await emergencyRequestModel.findById(emergencyId);

          if (emergency && emergency.status === "Assigned") {
            // First location broadcast - update status to "In Progress"
            await emergencyRequestModel.findByIdAndUpdate(emergencyId, {
              status: "In Progress",
              updatedAt: new Date(),
            });

            // Broadcast status change to all room members
            socket.to(emergencyId).emit("emergency-status-changed", {
              emergencyId,
              newStatus: "In Progress",
              responderId,
              timestamp: new Date().toISOString(),
              message:
                "Emergency status updated to 'In Progress' - Responder is en route",
            });

            console.log(
              `🚨 Emergency ${emergencyId} status changed to 'In Progress' on first location broadcast by responder ${responderId}`
            );
          }

          // Broadcast location update to emergency room
          socket.to(emergencyId).emit("responder-location-update", {
            responderId,
            location,
            timestamp: new Date().toISOString(),
          });
        }

        console.log(`📍 Updated location for responder ${responderId}`);
      } catch (error) {
        console.error("Error updating responder location:", error);
        socket.emit("error", { message: "Failed to update location" });
      }
    }
  );
}

/**
 * Handle ETA updates from responders
 */
export function updateEtaEvent(socket) {
  return socket.on(
    "update-eta",
    ({ emergencyId, responderId, eta, distance }) => {
      // Broadcast ETA update to emergency room (user and admin)
      socket.to(emergencyId).emit("eta-update", {
        responderId,
        eta,
        distance,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `ETA update for responder ${responderId} in emergency ${emergencyId}: ${eta} minutes`
      );
    }
  );
}

/**
 * When responder arrives at emergency location
 */
export function responderArrivedEvent(socket) {
  return socket.on("responder-arrived", ({ emergencyId, responderId }) => {
    socket.to(emergencyId).emit("responder-arrived", {
      responderId,
      timestamp: new Date().toISOString(),
      message: "Responder has arrived at the emergency location",
    });

    console.log(`Responder ${responderId} arrived at emergency ${emergencyId}`);
  });
}

// ============================
// STATUS UPDATES
// ============================

/**
 * Emergency status updates (from admin)
 */
export function updateEmergencyStatusEvent(socket) {
  return socket.on(
    "update-emergency-status",
    ({ emergencyId, status, adminId, notes }) => {
      // Broadcast status update to all room members
      io.to(emergencyId).emit("emergency-status-update", {
        emergencyId,
        status,
        adminId,
        notes,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `Emergency ${emergencyId} status updated to ${status} by admin ${adminId}`
      );
    }
  );
}

/**
 * Responder status updates (available/unavailable)
 */
export function updateResponderStatusEvent(socket) {
  return socket.on(
    "update-responder-status",
    async ({ responderId, status }) => {
      try {
        // Update responder status in database using responder_id field
        await responderModel.findOneAndUpdate(
          { responder_id: responderId },
          { status }
        );

        // Notify any listening admin dashboards
        socket.broadcast.emit("responder-status-update", {
          responderId,
          status,
          timestamp: new Date().toISOString(),
        });

        console.log(`Responder ${responderId} status updated to ${status}`);
      } catch (error) {
        console.error("Error updating responder status:", error);
        socket.emit("error", { message: "Failed to update status" });
      }
    }
  );
}

// ============================
// MESSAGING & COMMUNICATION
// ============================

/**
 * Emergency room chat/messaging
 */
export function sendEmergencyMessageEvent(socket) {
  return socket.on(
    "send-message",
    ({ emergencyId, message, senderType, senderId }) => {
      socket.to(emergencyId).emit("new-message", {
        emergencyId,
        message,
        senderType,
        senderId,
        timestamp: new Date().toISOString(),
      });
    }
  );
}

// ============================
// CONNECTION MANAGEMENT
// ============================

/**
 * Handle auto-rejoin for responders after reconnection
 */
export function handleRejoinEvent(socket) {
  return socket.on("rejoin-rooms", async ({ lastRooms }) => {
    try {
      console.log(
        `🔄 ${socket.userType} ${socket.userId} requesting to rejoin rooms:`,
        lastRooms
      );

      if (!Array.isArray(lastRooms)) {
        socket.emit("error", { message: "Invalid rooms data for rejoin" });
        return;
      }

      const rejoinedRooms = [];

      for (const roomId of lastRooms) {
        try {
          const isAuthorized = await authorizeRoomAccess(
            socket,
            roomId,
            socket.userType,
            socket.userId
          );

          if (isAuthorized) {
            socket.join(roomId);
            rejoinedRooms.push(roomId);
            console.log(`✅ Rejoined room: ${roomId}`);
          } else {
            console.log(`🚫 Not authorized to rejoin room: ${roomId}`);
          }
        } catch (error) {
          console.error(`❌ Error rejoining room ${roomId}:`, error);
        }
      }

      // Send confirmation with successfully rejoined rooms
      socket.emit("rooms-rejoined", {
        rejoinedRooms,
        timestamp: new Date().toISOString(),
        message: `Successfully rejoined ${rejoinedRooms.length} room(s)`,
      });
    } catch (error) {
      console.error(
        `❌ Error handling rejoin for ${socket.userType} ${socket.userId}:`,
        error
      );
      socket.emit("error", { message: "Failed to rejoin rooms" });
    }
  });
}

/**
 * Handle client disconnection with better logging
 */
// ============================
// UTILITY FUNCTIONS
// ============================

/**
 * Server-side function to notify user when emergency is created
 */
export function notifyEmergencyCreated(userId, emergencyDetails) {
  io.to(userId.toString()).emit("emergency-created", {
    emergencyId: emergencyDetails._id,
    status: "Pending",
    message:
      "Your emergency request has been received and responders are being dispatched",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Server-side function to broadcast emergency completion
 */
export function notifyEmergencyCompleted(emergencyId, completionDetails) {
  io.to(emergencyId).emit("emergency-completed", {
    emergencyId,
    completionDetails,
    timestamp: new Date().toISOString(),
    message: "Emergency has been marked as completed",
  });
}
