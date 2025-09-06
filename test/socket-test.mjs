#!/usr/bin/env node

/**
 * Socket System Test Script
 * Run this to test socket functionality during development
 */

import { io as Client } from "socket.io-client";

const SERVER_URL = "http://localhost:8080";

// Test scenarios
async function testSocketSystem() {
  console.log("🧪 Starting Socket System Tests...\n");

  // Create mock clients
  const userSocket = Client(SERVER_URL);
  const responderSocket = Client(SERVER_URL);
  const adminSocket = Client(SERVER_URL);

  const testEmergencyId = "507f1f77bcf86cd799439011";
  const testUserId = "507f1f77bcf86cd799439012";
  const testResponderId = "507f1f77bcf86cd799439013";
  const testAdminId = "507f1f77bcf86cd799439014";

  // Test 1: User joins personal room
  console.log("📱 Test 1: User joins personal room");
  userSocket.emit("join-room", {
    roomId: testUserId,
    userType: "user",
    userId: testUserId,
  });

  // Test 2: Responder joins personal room
  console.log("🚑 Test 2: Responder joins personal room");
  responderSocket.emit("join-room", {
    roomId: testResponderId,
    userType: "responder",
    userId: testResponderId,
  });

  // Test 3: Admin joins emergency room
  console.log("👮 Test 3: Admin joins emergency room");
  adminSocket.emit("join-room", {
    roomId: testEmergencyId,
    userType: "admin",
    userId: testAdminId,
  });

  // Test 4: User joins emergency room (simulating after emergency creation)
  setTimeout(() => {
    console.log("📱 Test 4: User joins emergency room");
    userSocket.emit("join-room", {
      roomId: testEmergencyId,
      userType: "user",
      userId: testUserId,
    });
  }, 1000);

  // Test 5: Responder accepts emergency
  setTimeout(() => {
    console.log("🚑 Test 5: Responder accepts emergency");
    responderSocket.emit("accept-emergency", {
      emergencyId: testEmergencyId,
      responderId: testResponderId,
      estimatedArrival: 5,
    });
  }, 2000);

  // Test 6: Responder updates location
  setTimeout(() => {
    console.log("📍 Test 6: Responder updates location");
    responderSocket.emit("update-location", {
      responderId: testResponderId,
      location: {
        latitude: 5.5977,
        longitude: -0.187,
      },
      emergencyId: testEmergencyId,
    });
  }, 3000);

  // Test 7: Responder updates ETA
  setTimeout(() => {
    console.log("⏰ Test 7: Responder updates ETA");
    responderSocket.emit("update-eta", {
      emergencyId: testEmergencyId,
      responderId: testResponderId,
      eta: 3,
      distance: 500,
    });
  }, 4000);

  // Test 8: Admin updates emergency status
  setTimeout(() => {
    console.log("📊 Test 8: Admin updates emergency status");
    adminSocket.emit("update-emergency-status", {
      emergencyId: testEmergencyId,
      status: "Accepted",
      adminId: testAdminId,
      notes: "Emergency confirmed and responders dispatched",
    });
  }, 5000);

  // Test 9: Send emergency message
  setTimeout(() => {
    console.log("💬 Test 9: Send emergency room message");
    userSocket.emit("send-message", {
      emergencyId: testEmergencyId,
      message: "I can see the fire truck approaching",
      senderType: "user",
      senderId: testUserId,
    });
  }, 6000);

  // Handle connection errors
  handleSocketError(userSocket, "User");
  handleSocketError(responderSocket, "Responder");
  handleSocketError(adminSocket, "Admin");

  // Listen for events
  userSocket.on("responder-accepted", (data) => {
    console.log("✅ User received: responder-accepted", data);
  });

  userSocket.on("eta-update", (data) => {
    console.log("✅ User received: eta-update", data);
  });

  userSocket.on("responder-location-update", (data) => {
    console.log("✅ User received: responder-location-update", data);
  });

  userSocket.on("emergency-status-update", (data) => {
    console.log("✅ User received: emergency-status-update", data);
  });

  userSocket.on("new-message", (data) => {
    console.log("✅ User received: new-message", data);
  });

  adminSocket.on("responder-accepted", (data) => {
    console.log("✅ Admin received: responder-accepted", data);
  });

  adminSocket.on("eta-update", (data) => {
    console.log("✅ Admin received: eta-update", data);
  });

  adminSocket.on("responder-location-update", (data) => {
    console.log("✅ Admin received: responder-location-update", data);
  });

  responderSocket.on("emergency-assigned", (data) => {
    console.log("✅ Responder received: emergency-assigned", data);
  });

  // Cleanup after tests
  setTimeout(() => {
    console.log("\n🧹 Cleaning up test clients...");
    userSocket.disconnect();
    responderSocket.disconnect();
    adminSocket.disconnect();
    console.log("✅ Socket tests completed!");
    process.exit(0);
  }, 8000);
}

// Handle connection errors
function handleSocketError(socket, type) {
  socket.on("connect_error", (error) => {
    console.error(`❌ ${type} connection error:`, error);
  });

  socket.on("error", (error) => {
    console.error(`❌ ${type} socket error:`, error);
  });
}

// Start tests
testSocketSystem().catch(console.error);
