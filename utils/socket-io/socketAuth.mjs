import jwt from "jsonwebtoken";
import responderModel from "../../microservices/responder-management/models/responder-schema.mjs";
import adminModel from "../../microservices/admin-actions-dev/models/adminSchema.mjs";
import userModel from "../../microservices/user-management/models/userSchema.mjs";
import emergencyRequestModel from "../../microservices/emergency-requests-management/models/emergency-request-schema.mjs";

/**
 * Socket authentication middleware
 */
export function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log(`❌ Socket ${socket.id} - No token provided`);
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user_id || decoded.admin_id || decoded.responder_id;
    socket.userType = decoded.role; // 'user', 'responder', 'admin'
    socket.tokenData = decoded;

    console.log(
      `✅ Socket ${socket.id} authenticated as ${socket.userType}: ${socket.userId}`
    );
    next();
  } catch (error) {
    console.log(
      `❌ Socket ${socket.id} - Token verification failed:`,
      error.message
    );
    next(new Error("Authentication error: Invalid token"));
  }
}

/**
 * Validate user exists in database
 */
export async function validateUserExists(socket, next) {
  try {
    let user = null;

    switch (socket.userType) {
      case "responder":
        // For responders, the JWT contains responder_id field, not _id
        user = await responderModel.findOne({ responder_id: socket.userId });
        break;
      case "admin":
        user = await adminModel.findOne({ admin_id: socket.userId });
        break;
      case "user":
        // For users, the JWT contains user_id which maps to _id
        user = await userModel.findById(socket.userId);
        break;
    }

    if (!user) {
      console.log(
        `❌ Socket ${socket.id} - ${socket.userType} ${socket.userId} not found in database`
      );
      return next(new Error(`User not found: ${socket.userType}`));
    }

    socket.userData = user;
    console.log(
      `✅ Socket ${socket.id} - ${socket.userType} validated: ${
        user.name || user.username || "Unknown"
      }`
    );
    next();
  } catch (error) {
    console.log(
      `❌ Socket ${socket.id} - Database validation error:`,
      error.message
    );
    next(new Error("Database validation error"));
  }
}

/**
 * Rate limiting for socket events
 */
export function createRateLimiter(
  eventName,
  maxRequests = 10,
  windowMs = 60000
) {
  const clients = new Map();

  return (socket, next) => {
    const clientKey = socket.userId;
    const now = Date.now();

    if (!clients.has(clientKey)) {
      clients.set(clientKey, { requests: 1, resetTime: now + windowMs });
      return next();
    }

    const client = clients.get(clientKey);

    if (now > client.resetTime) {
      // Reset the counter
      client.requests = 1;
      client.resetTime = now + windowMs;
      return next();
    }

    if (client.requests >= maxRequests) {
      console.log(
        `🚫 Rate limit exceeded for ${socket.userType} ${socket.userId} on event: ${eventName}`
      );
      socket.emit("error", {
        message: `Rate limit exceeded for ${eventName}`,
        retryAfter: Math.ceil((client.resetTime - now) / 1000),
      });
      return;
    }

    client.requests++;
    next();
  };
}

/**
 * Authorize room access
 */
export async function authorizeRoomAccess(socket, roomId, userType, userId) {
  try {
    switch (userType) {
      case "responder":
        // Responders can join their personal room or emergency rooms they're assigned to
        if (roomId === userId.toString()) {
          return true; // Personal room
        }

        // Check if responder is assigned to this emergency
        const emergency = await emergencyRequestModel.findById(roomId);
        if (emergency && emergency.responders_assigned?.includes(userId)) {
          return true;
        }
        break;

      case "user":
        // Users can join their personal room or emergency rooms they created
        if (roomId === userId.toString()) {
          return true; // Personal room
        }

        // Check if user created this emergency
        const userEmergency = await emergencyRequestModel.findOne({
          _id: roomId,
          user_id: userId,
        });
        if (userEmergency) {
          return true;
        }
        break;

      case "admin":
        // Admins can join any emergency room (monitoring)
        const adminEmergency = await emergencyRequestModel.findById(roomId);
        if (adminEmergency) {
          return true;
        }
        break;
    }

    return false;
  } catch (error) {
    console.error("Error authorizing room access:", error);
    return false;
  }
}
