import express from "express";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { createServer } from "http";
import { Server } from "socket.io";
import adminRouter from "../microservices/admin-actions-dev/routes/adminRoutes.mjs";
import adminAuthRouter from "../microservices/admin-actions-dev/routes/adminAuthRoutes.mjs";
import userRouter from "../microservices/user-management/routes/userRoute.mjs";
import otpRouter from "../microservices/user-management/routes/otpRoute.mjs";
import responderAuth from "../microservices/responder-management/routes/auth.mjs";
import responders from "../microservices/responder-management/routes/responders.mjs";
import emergencyRequestRouter from "../microservices/emergency-requests-management/routes/emergency-request.mjs";
import {
  joinRoomEvent,
  leaveRoomEvent,
  acceptEmergencyEvent,
  declineEmergencyEvent,
  updateLocationEvent,
  updateEtaEvent,
  responderArrivedEvent,
  updateEmergencyStatusEvent,
  updateResponderStatusEvent,
  sendEmergencyMessageEvent,
  handleRejoinEvent,
} from "../utils/socket-io/events.mjs";
import {
  authenticateSocket,
  validateUserExists,
} from "../utils/socket-io/socketAuth.mjs";
import {
  trackConnection,
  trackDisconnection,
  logConnectionEvent,
  startPeriodicLogging,
  monitorConnectionHealth,
} from "../utils/socket-io/connectionMonitor.mjs";

const app = express();
app.use(express.json());

// Admin routes
app.use("/admin/auth", adminAuthRouter);
app.use("/admin", adminRouter);

// Other routes
app.use(userRouter);
app.use("/responders/auth", responderAuth);
app.use("/responders", responders);
app.use("/emergency", emergencyRequestRouter);
app.use("/otp", otpRouter);

const httpServer = createServer(app);
configDotenv();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket authentication middleware
io.use(authenticateSocket);
io.use(validateUserExists);

app.set("io", io);

io.on("connection", (socket) => {
  // Track connection and log
  trackConnection(socket);
  logConnectionEvent(
    "connect",
    socket,
    `Token: ${socket.tokenData?.role || "Unknown"}`
  );

  // Core room management
  joinRoomEvent(socket);
  leaveRoomEvent(socket);
  handleRejoinEvent(socket);

  // Emergency management
  acceptEmergencyEvent(socket);
  declineEmergencyEvent(socket);

  // Real-time updates
  updateLocationEvent(socket);
  updateEtaEvent(socket);
  responderArrivedEvent(socket);

  // Status updates
  updateEmergencyStatusEvent(socket);
  updateResponderStatusEvent(socket);

  // Communication
  sendEmergencyMessageEvent(socket);

  // Enhanced disconnection handling
  socket.on("disconnect", (reason) => {
    trackDisconnection(socket, reason);
    logConnectionEvent("disconnect", socket, `Reason: ${reason}`);

    // Handle disconnection logic directly
    const disconnectType =
      reason === "client namespace disconnect" ||
      reason === "server namespace disconnect"
        ? "🔄 Planned"
        : "⚠️ Unplanned";

    console.log(
      `${disconnectType} disconnection: ${socket.userType} ${
        socket.userData?.name || "Unknown"
      } (${socket.userId}) | Reason: ${reason} | Room: ${socket.currentRoom}`
    );

    // Only notify for emergency rooms, not personal rooms
    if (
      socket.userType === "responder" &&
      socket.currentRoom &&
      socket.currentRoom !== socket.userId.toString()
    ) {
      socket.to(socket.currentRoom).emit("responder-disconnected", {
        responderId: socket.userId,
        responderName: socket.userData?.name || "Unknown",
        timestamp: new Date().toISOString(),
      });
    }

    // Clean up any pending tasks or room memberships if needed
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
    }
  });

  // Handle authentication errors
  socket.on("connect_error", (error) => {
    logConnectionEvent("auth_failed", socket, error.message);
    socket.emit("auth_error", { message: error.message });
  });

  // Handle other errors
  socket.on("error", (error) => {
    logConnectionEvent("error", socket, error.message || error);
  });
});

const PORT =
  process.env.ENVIRONMENT === "production"
    ? process.env.PORT
    : process.env.LOCAL_PORT;
httpServer.listen(PORT, () => {
  console.log(
    "Server Started",
    `on port ${PORT} in ${process.env.ENVIRONMENT} mode`
  );

  // Start connection monitoring
  console.log("🔍 Starting socket connection monitoring...");
  startPeriodicLogging(300000); // Log stats every 5 minutes
  monitorConnectionHealth();
});

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected Successfully");
  })
  .catch((error) => {
    console.error("Error connecting database\n", error);
  });

const db_connection = mongoose.connection;

//Initialize Grid Bucket
let bucket;

db_connection.once("open", () => {
  bucket = new GridFSBucket(db_connection.db, { bucketName: "uploads" });
});

export { bucket, io };
