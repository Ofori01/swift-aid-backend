# Real-Time Communication Architecture Documentation

## Overview

This document outlines the comprehensive WebSocket implementation for real-time communication between the Swift Aid server, user apps, responder apps, and admin dashboard.

## Architecture Diagram

```
                    Swift Aid Server
                         |
               ┌─────────┴─────────┐
               │    Socket.IO     │
               │     Instance     │
               └─────────┬─────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   User Apps       Responder Apps    Admin Dashboard
        │                │                │
   Room: user_id    Room: responder_id  Room: emergency_id
   Room: emergency_id  Room: emergency_id     │
                                        Monitor Mode
```

## Room Structure

### 1. **User Personal Room**

- **Room ID**: `{user_id}`
- **Purpose**: Receive personal notifications about emergency status
- **Members**: Individual user only
- **Events Received**: `emergency-created`, `emergency-status-update`, `responder-accepted`

### 2. **Responder Personal Room**

- **Room ID**: `{responder_id}`
- **Purpose**: Receive emergency assignments and system notifications
- **Members**: Individual responder only
- **Events Received**: `emergency-assigned`

### 3. **Emergency Room**

- **Room ID**: `{emergency_id}`
- **Purpose**: Real-time coordination during active emergencies
- **Members**: User (reporter), assigned responders, monitoring admins
- **Events**: Location updates, ETA updates, status changes, messages

## Event Reference

### 🏠 Room Management Events

#### `join-room`

**Direction**: Client → Server
**Payload**:

```javascript
{
  roomId: "string",      // room to join
  userType: "string",    // 'user', 'responder', 'admin'
  userId: "string"       // identifier for the user
}
```

#### `leave-room`

**Direction**: Client → Server
**Payload**:

```javascript
{
  roomId: "string",
  userType: "string",
  userId: "string"
}
```

### 🚨 Emergency Management Events

#### `emergency-assigned`

**Direction**: Server → Responder
**Payload**:

```javascript
{
  emergencyId: "string",
  emergencyDetails: {
    location: { type: "Point", coordinates: [lng, lat] },
    type: "string",
    severity: "string",
    description: "string",
    timestamp: "ISO string"
  },
  message: "string"
}
```

#### `accept-emergency`

**Direction**: Responder → Server
**Payload**:

```javascript
{
  emergencyId: "string",
  responderId: "string",
  estimatedArrival: "number" // minutes
}
```

#### `decline-emergency`

**Direction**: Responder → Server
**Payload**:

```javascript
{
  emergencyId: "string",
  responderId: "string",
  reason: "string"
}
```

#### `emergency-created`

**Direction**: Server → User
**Payload**:

```javascript
{
  emergencyId: "string",
  status: "Pending",
  message: "string",
  timestamp: "ISO string"
}
```

### 📍 Location & ETA Events

#### `update-location`

**Direction**: Responder → Server
**Payload**:

```javascript
{
  responderId: "string",
  location: {
    latitude: "number",
    longitude: "number"
  },
  emergencyId: "string" // if currently assigned
}
```

#### `responder-location-update`

**Direction**: Server → Emergency Room
**Payload**:

```javascript
{
  responderId: "string",
  location: {
    latitude: "number",
    longitude: "number"
  },
  timestamp: "ISO string"
}
```

#### `update-eta`

**Direction**: Responder → Server
**Payload**:

```javascript
{
  emergencyId: "string",
  responderId: "string",
  eta: "number",     // minutes
  distance: "number" // meters
}
```

#### `eta-update`

**Direction**: Server → Emergency Room
**Payload**:

```javascript
{
  responderId: "string",
  eta: "number",
  distance: "number",
  timestamp: "ISO string"
}
```

#### `responder-arrived`

**Direction**: Responder → Server
**Payload**:

```javascript
{
  emergencyId: "string",
  responderId: "string"
}
```

### 📊 Status Update Events

#### `update-emergency-status`

**Direction**: Admin → Server
**Payload**:

```javascript
{
  emergencyId: "string",
  status: "string",  // 'Pending', 'Accepted', 'Declined', 'Completed'
  adminId: "string",
  notes: "string"
}
```

#### `emergency-status-update`

**Direction**: Server → Emergency Room
**Payload**:

```javascript
{
  emergencyId: "string",
  status: "string",
  adminId: "string",
  notes: "string",
  timestamp: "ISO string"
}
```

#### `update-responder-status`

**Direction**: Responder → Server
**Payload**:

```javascript
{
  responderId: "string",
  status: "string" // 'available', 'unavailable'
}
```

### 💬 Communication Events

#### `send-message`

**Direction**: Any Client → Server
**Payload**:

```javascript
{
  emergencyId: "string",
  message: "string",
  senderType: "string", // 'user', 'responder', 'admin'
  senderId: "string"
}
```

#### `new-message`

**Direction**: Server → Emergency Room
**Payload**:

```javascript
{
  emergencyId: "string",
  message: "string",
  senderType: "string",
  senderId: "string",
  timestamp: "ISO string"
}
```

## Client Implementation Examples

### 🟢 User App Implementation

```javascript
// Initialize socket connection
const socket = io("ws://localhost:3000");

// Join personal room for notifications
socket.emit("join-room", {
  roomId: userId,
  userType: "user",
  userId: userId,
});

// Listen for emergency creation confirmation
socket.on("emergency-created", (data) => {
  console.log("Emergency created:", data);
  // Join emergency room for real-time updates
  socket.emit("join-room", {
    roomId: data.emergencyId,
    userType: "user",
    userId: userId,
  });
});

// Listen for responder updates
socket.on("responder-accepted", (data) => {
  console.log("Responder accepted:", data);
  updateUI(data);
});

socket.on("eta-update", (data) => {
  console.log("ETA update:", data);
  updateMapWithETA(data);
});

socket.on("responder-location-update", (data) => {
  console.log("Responder location:", data);
  updateResponderOnMap(data);
});
```

### 🔵 Responder App Implementation

```javascript
const socket = io("ws://localhost:3000");

// Join personal room for assignments
socket.emit("join-room", {
  roomId: responderId,
  userType: "responder",
  userId: responderId,
});

// Listen for emergency assignments
socket.on("emergency-assigned", (data) => {
  console.log("New emergency assigned:", data);
  showEmergencyNotification(data);
});

// Accept emergency
function acceptEmergency(emergencyId, eta) {
  socket.emit("accept-emergency", {
    emergencyId: emergencyId,
    responderId: responderId,
    estimatedArrival: eta,
  });

  // Join emergency room
  socket.emit("join-room", {
    roomId: emergencyId,
    userType: "responder",
    userId: responderId,
  });
}

// Send location updates during emergency
function updateLocation(location, emergencyId) {
  socket.emit("update-location", {
    responderId: responderId,
    location: location,
    emergencyId: emergencyId,
  });
}

// Update ETA
function updateETA(emergencyId, eta, distance) {
  socket.emit("update-eta", {
    emergencyId: emergencyId,
    responderId: responderId,
    eta: eta,
    distance: distance,
  });
}
```

### 🟡 Admin Dashboard Implementation

```javascript
const socket = io("ws://localhost:3000");

// Monitor specific emergency
function monitorEmergency(emergencyId) {
  socket.emit("join-room", {
    roomId: emergencyId,
    userType: "admin",
    userId: adminId,
  });
}

// Listen for all emergency updates
socket.on("responder-location-update", (data) => {
  updateAdminMap(data);
});

socket.on("eta-update", (data) => {
  updateEmergencyDashboard(data);
});

// Update emergency status
function updateEmergencyStatus(emergencyId, status, notes) {
  socket.emit("update-emergency-status", {
    emergencyId: emergencyId,
    status: status,
    adminId: adminId,
    notes: notes,
  });
}

// Get system statistics
async function getSystemStats() {
  const stats = await fetch("/admin/socket/stats");
  console.log("Connected users:", stats);
}
```

## Server Integration Points

### 1. Emergency Creation Flow

```javascript
// In save-emergency-info.mjs
import SocketService from "../../../utils/socket-io/socketService.mjs";

// After saving emergency to database
await SocketService.initializeEmergencyRoom(emergencyData, selectedResponders);
```

### 2. Status Updates

```javascript
// In admin-emergency-controller.mjs
SocketService.updateEmergencyStatus(emergencyId, status, adminId, notes);
```

### 3. System Monitoring

```javascript
// Get real-time statistics
const stats = SocketService.getConnectedUsersStats();
// Returns: { total: 45, users: 20, responders: 15, admins: 10, rooms: 8 }
```

## Security Considerations

1. **Authentication**: All socket connections should validate JWT tokens
2. **Room Authorization**: Users can only join rooms they have permission for
3. **Rate Limiting**: Implement rate limiting for location updates
4. **Data Validation**: Validate all incoming socket payloads
5. **Logging**: Log all critical socket events for audit trails

## Performance Optimizations

1. **Location Updates**: Batch location updates every 5-10 seconds
2. **Room Cleanup**: Automatically remove users from emergency rooms when emergency is completed
3. **Connection Pooling**: Use Redis adapter for horizontal scaling
4. **Compression**: Enable socket.io compression for large payloads

## Error Handling

All socket events include error handling:

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Handle error appropriately
});
```

## Testing

### Unit Tests

- Test socket event handlers
- Validate payload structures
- Test room management logic

### Integration Tests

- Test full emergency flow with sockets
- Test multi-user scenarios
- Test disconnection handling

### Load Tests

- Test with multiple concurrent emergencies
- Test responder location update frequency
- Test admin dashboard with many emergencies

## Deployment Considerations

### Production Setup

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
  adapter: require("socket.io-redis")({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  }),
});
```

### Monitoring

- Monitor socket connection counts
- Track room sizes
- Monitor event frequency
- Alert on connection failures

This architecture provides a robust, scalable foundation for real-time communication in the Swift Aid emergency response system.
