#!/usr/bin/env node

/**
 * Simple Socket Connection Test
 * Tests basic socket.io connectivity and room joining
 */

import { io as Client } from "socket.io-client";

const SERVER_URL = "http://localhost:8080";

function testBasicConnection() {
  console.log("🧪 Testing Basic Socket Connection...\n");

  const socket = Client(SERVER_URL);

  socket.on("connect", () => {
    console.log("✅ Socket connected successfully!");
    console.log("   Socket ID:", socket.id);

    // Test basic room joining
    console.log("\n📱 Testing room joining...");
    socket.emit("join-room", {
      roomId: "test-room-123",
      userType: "user",
      userId: "test-user-456",
    });

    console.log("✅ Room join event sent");

    // Disconnect after a short delay
    setTimeout(() => {
      console.log("\n🔌 Disconnecting...");
      socket.disconnect();
      console.log("✅ Test completed successfully!");
      process.exit(0);
    }, 2000);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Connection failed:", error.message);
    console.error("   Make sure the server is running on port 8080");
    process.exit(1);
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Disconnected:", reason);
  });
}

testBasicConnection();
