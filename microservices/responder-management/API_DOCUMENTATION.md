# Responder Emergency Management API Documentation

## Overview

This API provides endpoints for responders to manage and interact with emergency assignments. All endpoints require responder authentication via JWT token.

## Base URL

```
/api/responders
```

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Get All Assigned Emergencies

**GET** `/emergencies`

Retrieve all emergencies assigned to the authenticated responder with optional filtering and pagination.

#### Query Parameters

- `status` (string, optional): Filter by emergency status (`Pending`, `Accepted`, `Declined`, `Completed`)
- `emergency_type` (string, optional): Filter by type (`Medical`, `Fire`, `Crime`, `Accident`, `Other`, `Violence`, `Rescue`)
- `from_date` (string, optional): Start date filter (ISO 8601 format)
- `to_date` (string, optional): End date filter (ISO 8601 format)
- `limit` (number, optional): Number of results per page (default: 20)
- `page` (number, optional): Page number (default: 1)

#### Response

```json
{
  "success": true,
  "message": "Emergencies retrieved successfully",
  "data": {
    "emergencies": [
      {
        "id": "64abc123def456789",
        "description": "Medical emergency at downtown location",
        "severity": "High",
        "status": "Pending",
        "emergency_type": "Medical",
        "location": {
          "type": "Point",
          "coordinates": [-73.935242, 40.73061]
        },
        "created_at": "2025-09-18T10:30:00.000Z",
        "time_elapsed": "2 hours ago",
        "priority_level": "HIGH"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 45,
      "per_page": 20
    }
  }
}
```

### 2. Get Specific Emergency Details

**GET** `/emergency/:emergencyId`

Retrieve detailed information about a specific emergency assignment.

#### Parameters

- `emergencyId` (string, required): MongoDB ObjectId of the emergency

#### Response

```json
{
  "success": true,
  "message": "Emergency details retrieved successfully",
  "data": {
    "id": "64abc123def456789",
    "description": "Medical emergency at downtown location",
    "severity": "High",
    "status": "Pending",
    "emergency_type": "Medical",
    "location": {
      "type": "Point",
      "coordinates": [-73.935242, 40.73061],
      "address": "123 Main St, New York, NY"
    },
    "user": {
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "admin_notes": "Priority case - multiple injuries reported",
    "assigned_admin": "Admin Smith",
    "assignment_details": {
      "category": "ambulances",
      "travel_time": 12,
      "route_type": "routed",
      "estimated_arrival": "2025-09-18T11:42:00.000Z"
    },
    "ai_recommendations": {
      "severity_level": "High",
      "recommended_resources": {
        "ambulances": 2,
        "fire_trucks": 0,
        "police_units": 1
      },
      "justification": "Medical emergency with multiple casualties",
      "priority_score": 85
    },
    "created_at": "2025-09-18T10:30:00.000Z",
    "updated_at": "2025-09-18T10:30:00.000Z",
    "time_elapsed": "2 hours ago",
    "priority_level": "HIGH"
  }
}
```

### 3. Update Emergency Response

**PUT** `/emergency/:emergencyId/response`

Update the responder's response status and details for an assigned emergency.

#### Parameters

- `emergencyId` (string, required): MongoDB ObjectId of the emergency

#### Request Body

```json
{
  "status": "accepted",
  "eta": 15,
  "notes": "En route to location, ETA 15 minutes"
}
```

#### Request Body Fields

- `status` (string, required): Response status
  - `accepted`: Responder accepts the assignment
  - `declined`: Responder declines the assignment
  - `en_route`: Responder is traveling to location
  - `arrived`: Responder has arrived at scene
  - `completed`: Emergency response completed
- `eta` (number, optional): Estimated time of arrival in minutes
- `notes` (string, optional): Additional notes or comments

#### Response

```json
{
  "success": true,
  "message": "Response updated successfully",
  "data": {
    "emergency_id": "64abc123def456789",
    "status": "accepted",
    "updated_at": "2025-09-18T12:30:00.000Z"
  }
}
```

### 4. Get Emergency Statistics

**GET** `/emergency-stats`

Retrieve statistics about the responder's emergency assignments.

#### Query Parameters

- `from_date` (string, optional): Start date for statistics (ISO 8601 format)
- `to_date` (string, optional): End date for statistics (ISO 8601 format)

#### Response

```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "responder_id": "64def789abc123456",
    "responder_name": "Officer Johnson",
    "date_range": {
      "from": "2025-09-01T00:00:00.000Z",
      "to": "2025-09-18T23:59:59.000Z"
    },
    "statistics": {
      "total_assigned": 25,
      "by_status": {
        "Completed": 20,
        "Pending": 3,
        "Declined": 2
      },
      "by_type": {
        "Medical": 12,
        "Accident": 8,
        "Crime": 3,
        "Fire": 2
      },
      "by_severity": {
        "High": 8,
        "Medium": 12,
        "Low": 4,
        "Critical": 1
      },
      "avg_response_time": 18
    },
    "generated_at": "2025-09-18T12:30:00.000Z"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request

```json
{
  "success": false,
  "message": "Emergency ID is required",
  "code": "MISSING_EMERGENCY_ID"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. You are not assigned to this emergency",
  "code": "ACCESS_DENIED"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Emergency not found",
  "code": "EMERGENCY_NOT_FOUND"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error while retrieving emergency details",
  "code": "INTERNAL_ERROR"
}
```

## Error Codes

- `MISSING_EMERGENCY_ID`: Emergency ID parameter is missing
- `INVALID_EMERGENCY_ID`: Emergency ID format is invalid
- `MISSING_REQUIRED_FIELDS`: Required request fields are missing
- `INVALID_STATUS`: Invalid status value provided
- `RESPONDER_NOT_FOUND`: Authenticated responder not found in database
- `EMERGENCY_NOT_FOUND`: Emergency with given ID not found
- `ACCESS_DENIED`: Responder not authorized to access this emergency
- `NOT_FOUND`: General resource not found error
- `UNAUTHORIZED`: Authentication token missing or invalid
- `INVALID_ID_FORMAT`: MongoDB ObjectId format is invalid
- `INTERNAL_ERROR`: Internal server error occurred

## Usage Examples

### Get all assigned emergencies with filtering

```bash
curl -X GET "http://localhost:3000/api/responders/emergencies?status=Pending&emergency_type=Medical&limit=10" \
  -H "Authorization: Bearer your_jwt_token"
```

### Get specific emergency details

```bash
curl -X GET "http://localhost:3000/api/responders/emergency/64abc123def456789" \
  -H "Authorization: Bearer your_jwt_token"
```

### Accept an emergency assignment

```bash
curl -X PUT "http://localhost:3000/api/responders/emergency/64abc123def456789/response" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "status": "accepted",
    "eta": 15,
    "notes": "Responding to emergency, ETA 15 minutes"
  }'
```

### Get monthly statistics

```bash
curl -X GET "http://localhost:3000/api/responders/emergency-stats?from_date=2025-09-01&to_date=2025-09-30" \
  -H "Authorization: Bearer your_jwt_token"
```

## Notes

1. **Authorization**: All endpoints validate that the responder is assigned to the requested emergency before allowing access.

2. **Data Privacy**: Personal information like user email addresses are filtered out for privacy protection.

3. **Time Calculations**: All time-related fields (time_elapsed, estimated_arrival) are calculated dynamically.

4. **Priority Levels**: Priority levels are determined based on severity and time elapsed since emergency creation.

5. **Pagination**: The emergencies list endpoint supports pagination to handle large datasets efficiently.

6. **Real-time Updates**: These endpoints work in conjunction with WebSocket events for real-time emergency coordination.
