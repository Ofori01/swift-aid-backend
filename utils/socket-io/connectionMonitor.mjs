/**
 * Socket connection monitoring and logging utilities
 */

const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  userConnections: 0,
  responderConnections: 0,
  adminConnections: 0,
  roomStats: new Map(),
  disconnectionReasons: new Map(),
};

/**
 * Track new connection
 */
export function trackConnection(socket) {
  connectionStats.totalConnections++;
  connectionStats.activeConnections++;

  switch (socket.userType) {
    case "user":
      connectionStats.userConnections++;
      break;
    case "responder":
      connectionStats.responderConnections++;
      break;
    case "admin":
      connectionStats.adminConnections++;
      break;
  }

  logConnectionStats();
}

/**
 * Track disconnection
 */
export function trackDisconnection(socket, reason) {
  connectionStats.activeConnections--;

  switch (socket.userType) {
    case "user":
      connectionStats.userConnections--;
      break;
    case "responder":
      connectionStats.responderConnections--;
      break;
    case "admin":
      connectionStats.adminConnections--;
      break;
  }

  // Track disconnection reasons
  const reasonCount = connectionStats.disconnectionReasons.get(reason) || 0;
  connectionStats.disconnectionReasons.set(reason, reasonCount + 1);

  logConnectionStats();
}

/**
 * Track room join
 */
export function trackRoomJoin(roomId, userType) {
  const roomKey = `${roomId}:${userType}`;
  const current = connectionStats.roomStats.get(roomKey) || 0;
  connectionStats.roomStats.set(roomKey, current + 1);
}

/**
 * Track room leave
 */
export function trackRoomLeave(roomId, userType) {
  const roomKey = `${roomId}:${userType}`;
  const current = connectionStats.roomStats.get(roomKey) || 0;
  if (current > 0) {
    connectionStats.roomStats.set(roomKey, current - 1);
  }
}

/**
 * Log current connection statistics
 */
export function logConnectionStats() {
  console.log(
    `📊 Connection Stats: Active: ${connectionStats.activeConnections} | Users: ${connectionStats.userConnections} | Responders: ${connectionStats.responderConnections} | Admins: ${connectionStats.adminConnections}`
  );
}

/**
 * Get detailed connection statistics
 */
export function getConnectionStats() {
  return {
    ...connectionStats,
    roomStats: Object.fromEntries(connectionStats.roomStats),
    disconnectionReasons: Object.fromEntries(
      connectionStats.disconnectionReasons
    ),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log connection events with proper formatting
 */
export function logConnectionEvent(type, socket, additionalInfo = "") {
  const userInfo =
    socket.userData?.name || socket.userData?.username || "Unknown";
  const timestamp = new Date().toISOString();

  switch (type) {
    case "connect":
      console.log(
        `🟢 [${timestamp}] CONNECT: ${socket.userType} ${userInfo} (${socket.userId}) | Socket: ${socket.id} ${additionalInfo}`
      );
      break;
    case "disconnect":
      console.log(
        `🔴 [${timestamp}] DISCONNECT: ${socket.userType} ${userInfo} (${socket.userId}) | Socket: ${socket.id} ${additionalInfo}`
      );
      break;
    case "room_join":
      console.log(
        `🏠 [${timestamp}] ROOM JOIN: ${socket.userType} ${userInfo} -> Room: ${additionalInfo}`
      );
      break;
    case "room_leave":
      console.log(
        `🚪 [${timestamp}] ROOM LEAVE: ${socket.userType} ${userInfo} <- Room: ${additionalInfo}`
      );
      break;
    case "error":
      console.log(
        `❌ [${timestamp}] ERROR: ${socket.userType} ${userInfo} | ${additionalInfo}`
      );
      break;
    case "auth_success":
      console.log(
        `✅ [${timestamp}] AUTH SUCCESS: ${socket.userType} ${userInfo} | ${additionalInfo}`
      );
      break;
    case "auth_failed":
      console.log(`🚫 [${timestamp}] AUTH FAILED: ${additionalInfo}`);
      break;
  }
}

/**
 * Periodic stats logging (call this every 5 minutes)
 */
export function startPeriodicLogging(intervalMs = 300000) {
  setInterval(() => {
    const stats = getConnectionStats();
    console.log("\n📈 PERIODIC STATS REPORT:");
    console.log(`   Total Connections Today: ${stats.totalConnections}`);
    console.log(`   Currently Active: ${stats.activeConnections}`);
    console.log(
      `   Users: ${stats.userConnections} | Responders: ${stats.responderConnections} | Admins: ${stats.adminConnections}`
    );
    console.log(`   Active Rooms: ${Object.keys(stats.roomStats).length}`);

    if (
      stats.disconnectionReasons &&
      Object.keys(stats.disconnectionReasons).length > 0
    ) {
      console.log("   Disconnection Reasons:", stats.disconnectionReasons);
    }
    console.log(""); // Empty line for readability
  }, intervalMs);
}

/**
 * Monitor for potential issues
 */
export function monitorConnectionHealth() {
  const checkInterval = 60000; // 1 minute

  setInterval(() => {
    const stats = getConnectionStats();

    // Alert if too many disconnections
    const totalDisconnections = Array.from(
      connectionStats.disconnectionReasons.values()
    ).reduce((sum, count) => sum + count, 0);

    if (
      totalDisconnections > 50 &&
      totalDisconnections > stats.totalConnections * 0.5
    ) {
      console.log(
        `🚨 HIGH DISCONNECTION RATE: ${totalDisconnections} disconnections vs ${stats.totalConnections} total connections`
      );
    }

    // Alert if no responders online during business hours
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 20 && stats.responderConnections === 0) {
      console.log(
        `⚠️  NO RESPONDERS ONLINE during business hours (${hour}:00)`
      );
    }
  }, checkInterval);
}
