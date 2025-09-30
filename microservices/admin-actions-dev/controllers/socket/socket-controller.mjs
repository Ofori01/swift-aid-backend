import SocketService from "../../../../utils/socket-io/socketService.mjs";

/**
 * Get real-time socket statistics for admin monitoring
 */
export async function getSocketStats(req, res) {
  try {
    const stats = SocketService.getConnectedUsersStats();

    res.status(200).json({
      message: "Socket statistics retrieved successfully",
      data: {
        realtime_stats: stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error getting socket stats:", error);
    res.status(500).json({
      message: "Error retrieving socket statistics",
      error: error.message,
    });
  }
}

/**
 * Get information about specific room
 */
export async function getRoomInfo(req, res) {
  try {
    const { roomId } = req.params;
    const roomInfo = SocketService.getRoomInfo(roomId);

    res.status(200).json({
      message: "Room information retrieved successfully",
      data: roomInfo,
    });
  } catch (error) {
    console.error("❌ Error getting room info:", error);
    res.status(500).json({
      message: "Error retrieving room information",
      error: error.message,
    });
  }
}

/**
 * Send system-wide announcement (admin only)
 */
export async function sendSystemAnnouncement(req, res) {
  try {
    const { message, targetType = "all" } = req.body;

    if (!message) {
      return res.status(400).json({
        message: "Announcement message is required",
      });
    }

    const announcement = SocketService.broadcastSystemAnnouncement(
      message,
      targetType
    );

    res.status(200).json({
      message: "System announcement sent successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("❌ Error sending announcement:", error);
    res.status(500).json({
      message: "Error sending system announcement",
      error: error.message,
    });
  }
}
