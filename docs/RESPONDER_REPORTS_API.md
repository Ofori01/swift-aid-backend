# Responder Reports & Admin Viewing API Documentation

## Overview

This API provides comprehensive responder report submission functionality and admin viewing capabilities for completed emergencies with detailed reports.

## Authentication

All endpoints require valid JWT tokens with appropriate roles:

- **Responder endpoints**: Require `responder` role
- **Admin endpoints**: Require `admin` role

---

## Responder Report Endpoints

### Submit Emergency Report

Submit a detailed report after completing emergency response activities.

**Endpoint:** `POST /api/responders/reports`  
**Authorization:** Bearer token (responder role)

**Request Body:**

```json
{
  "emergency_id": "ObjectId",
  "arrival_time": "2024-01-15T10:30:00.000Z",
  "departure_time": "2024-01-15T12:15:00.000Z",
  "actions_taken": [
    "Provided first aid",
    "Secured the scene",
    "Coordinated with medical team"
  ],
  "casualties": {
    "injured": 2,
    "deceased": 0,
    "rescued": 1
  },
  "property_damage": "Minor", // Options: "None", "Minor", "Moderate", "Severe", "Total"
  "resources_used": {
    "personnel_count": 3,
    "equipment": ["First aid kit", "Fire extinguisher"],
    "vehicles_used": ["Ambulance", "Fire truck"]
  },
  "outcome": "Resolved", // Options: "Resolved", "Escalated", "Transferred", "Ongoing"
  "severity_assessment": "Medium", // Options: "Low", "Medium", "High", "Critical"
  "additional_notes": "Patient stabilized and transported to hospital",
  "location_details": {
    "access_difficulty": "Easy",
    "environmental_hazards": "None",
    "scene_description": "Residential building fire on second floor"
  },
  "follow_up_required": true,
  "follow_up_details": "Monitor patient recovery, inspect building safety"
}
```

**Response (201):**

```json
{
  "message": "Report submitted successfully",
  "data": {
    "report": {
      /* full report object */
    },
    "emergency_status_updated": true,
    "notifications_sent": ["user", "admin"]
  }
}
```

---

### Get My Reports

Retrieve all reports submitted by the authenticated responder.

**Endpoint:** `GET /api/responders/reports`  
**Authorization:** Bearer token (responder role)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `emergency_type` (optional): Filter by emergency type
- `outcome` (optional): Filter by report outcome
- `date_from` (optional): Filter reports from date (ISO format)
- `date_to` (optional): Filter reports to date (ISO format)

**Response (200):**

```json
{
  "message": "Reports retrieved successfully",
  "data": {
    "reports": [
      {
        "_id": "ObjectId",
        "emergency_id": {
          "emergency_type": "Fire",
          "location": {
            /* location data */
          },
          "severity": "High"
        },
        "arrival_time": "2024-01-15T10:30:00.000Z",
        "departure_time": "2024-01-15T12:15:00.000Z",
        "outcome": "Resolved",
        "casualties": { "injured": 2, "deceased": 0, "rescued": 1 },
        "submitted_at": "2024-01-15T12:30:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 47,
      "per_page": 10
    }
  }
}
```

---

### Get Report by ID

Retrieve a specific report by its ID.

**Endpoint:** `GET /api/responders/reports/:reportId`  
**Authorization:** Bearer token (responder or admin role)

**Response (200):**

```json
{
  "message": "Report retrieved successfully",
  "data": {
    "report": {
      /* Full report object with all details */
      "emergency_id": {
        /* populated emergency data */
      },
      "responder_id": {
        /* populated responder data */
      }
    }
  }
}
```

---

### Update Report

Update an existing report (only allowed for draft status reports).

**Endpoint:** `PUT /api/responders/reports/:reportId`  
**Authorization:** Bearer token (responder role)

**Request Body:** Same as submit report endpoint

**Response (200):**

```json
{
  "message": "Report updated successfully",
  "data": {
    "report": {
      /* updated report object */
    }
  }
}
```

---

## Admin Report Viewing Endpoints

### Get Completed Emergencies with Reports

Retrieve completed emergencies with associated responder reports for admin's agency.

**Endpoint:** `GET /api/admin/reports/completed-emergencies`  
**Authorization:** Bearer token (admin role)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `emergency_type` (optional): Filter by emergency type
- `severity` (optional): Filter by emergency severity
- `outcome` (optional): Filter by report outcomes
- `date_from` (optional): Filter from date (ISO format)
- `date_to` (optional): Filter to date (ISO format)
- `sort_by` (optional): Sort field (default: "completed_at")
- `sort_order` (optional): Sort order "asc" or "desc" (default: "desc")

**Response (200):**

```json
{
  "message": "Completed emergencies with reports retrieved successfully",
  "data": {
    "completed_emergencies": [
      {
        "_id": "ObjectId",
        "emergency_type": "Fire",
        "location": {
          /* location data */
        },
        "severity": "High",
        "status": "Completed",
        "user_id": {
          "name": "John Doe",
          "phone_number": "+1234567890"
        },
        "reports": [
          {
            /* Report data with responder info */
            "responder": {
              "name": "Officer Smith",
              "badgeNumber": "12345"
            }
          }
        ],
        "report_count": 2,
        "completion_summary": {
          "total_reports": 2,
          "outcomes": { "Resolved": 2 },
          "total_casualties": { "injured": 1, "deceased": 0, "rescued": 0 },
          "average_response_duration": 105
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 58,
      "per_page": 20
    },
    "summary": {
      "total_completed": 58,
      "agency_name": "City Fire Department",
      "agency_type": "Fire"
    }
  }
}
```

---

### Get Emergency with Reports

Get detailed view of a specific emergency with all associated reports.

**Endpoint:** `GET /api/admin/reports/emergency/:emergencyId`  
**Authorization:** Bearer token (admin role)

**Response (200):**

```json
{
  "message": "Emergency details with reports retrieved successfully",
  "data": {
    "emergency": {
      /* Full emergency details */
      "user_id": {
        /* User information */
      }
    },
    "reports": [
      {
        /* Full report details with responder information */
        "responder": {
          "name": "Officer Smith",
          "badgeNumber": "12345",
          "phone": "+1234567890"
        }
      }
    ],
    "summary": {
      /* Detailed completion summary */
      "timeline": [
        {
          "responder": "Officer Smith",
          "badge_number": "12345",
          "arrival_time": "2024-01-15T10:30:00.000Z",
          "departure_time": "2024-01-15T12:15:00.000Z",
          "duration_minutes": 105,
          "outcome": "Resolved"
        }
      ],
      "resource_utilization": {
        "total_personnel": 5,
        "equipment_used": ["First aid kit", "Fire extinguisher"],
        "vehicles_used": ["Ambulance", "Fire truck"]
      }
    },
    "agency_info": {
      "name": "City Fire Department",
      "type": "Fire"
    }
  }
}
```

---

### Get Report Statistics

Get statistical overview of reports for admin dashboard.

**Endpoint:** `GET /api/admin/reports/statistics`  
**Authorization:** Bearer token (admin role)

**Query Parameters:**

- `period` (optional): Period in days (default: 30)

**Response (200):**

```json
{
  "message": "Report statistics retrieved successfully",
  "data": {
    "period_days": 30,
    "agency_info": {
      "name": "City Fire Department",
      "type": "Fire"
    },
    "summary": {
      "total_reports": 156,
      "total_casualties": 23,
      "total_injured": 18,
      "total_deceased": 2,
      "total_rescued": 3,
      "follow_ups_required": 45
    },
    "breakdowns": {
      "outcomes": {
        "Resolved": 134,
        "Escalated": 15,
        "Transferred": 7
      },
      "severity_assessments": {
        "Low": 45,
        "Medium": 67,
        "High": 32,
        "Critical": 12
      },
      "property_damage": {
        "None": 78,
        "Minor": 45,
        "Moderate": 23,
        "Severe": 8,
        "Total": 2
      }
    }
  }
}
```

---

## Real-time Features

### Automatic Status Updates

The system automatically updates emergency status in the following scenarios:

1. **Status: "Assigned" → "In Progress"**

   - Triggered when a responder broadcasts their first location update
   - Socket event: `emergency-status-changed`

2. **Status: "In Progress" → "Completed"**
   - Triggered when the first responder report is submitted
   - Socket event: `emergency-status-changed`

### Socket Events

**Event:** `emergency-status-changed`

```json
{
  "emergencyId": "ObjectId",
  "newStatus": "In Progress",
  "responderId": "ObjectId",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "Emergency status updated to 'In Progress' - Responder is en route"
}
```

---

## Error Responses

### 400 - Bad Request

```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "emergency_id",
      "message": "Emergency ID is required"
    }
  ]
}
```

### 403 - Forbidden

```json
{
  "message": "Cannot submit report for emergency from different agency"
}
```

### 404 - Not Found

```json
{
  "message": "Emergency not found or already has reports"
}
```

### 409 - Conflict

```json
{
  "message": "Report already submitted for this emergency"
}
```

---

## Data Models

### Report Schema Structure

```javascript
{
  emergency_id: ObjectId, // Reference to emergency
  responder_id: ObjectId, // Reference to responder
  arrival_time: Date,
  departure_time: Date,
  actions_taken: [String],
  casualties: {
    injured: Number,
    deceased: Number,
    rescued: Number
  },
  property_damage: String, // Enum: None, Minor, Moderate, Severe, Total
  resources_used: {
    personnel_count: Number,
    equipment: [String],
    vehicles_used: [String]
  },
  outcome: String, // Enum: Resolved, Escalated, Transferred, Ongoing
  severity_assessment: String, // Enum: Low, Medium, High, Critical
  additional_notes: String,
  location_details: {
    access_difficulty: String,
    environmental_hazards: String,
    scene_description: String
  },
  follow_up_required: Boolean,
  follow_up_details: String,
  status: String, // Enum: Draft, Submitted
  submitted_at: Date,
  updated_at: Date
}
```

This comprehensive system provides complete lifecycle management for emergency reports with real-time status updates and detailed admin oversight capabilities.
