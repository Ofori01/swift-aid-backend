# Admin Dashboard API Documentation

## Authentication

All admin routes require authentication except login and signup.

**Base URL:** `http://localhost:3000/admin`

### Authentication Headers

```
Authorization: Bearer <token>
```

## Admin Authentication Routes (`/admin/auth`)

### POST `/admin/auth/login`

Admin login

```json
{
  "email": "admin@agency.com",
  "password": "password123"
}
```

### POST `/admin/auth/signup`

Create new admin account

```json
{
  "name": "Admin Name",
  "email": "admin@agency.com",
  "password": "password123",
  "phone": "+233501234567",
  "badgeNumber": "ADM001"
}
```

### GET `/admin/auth/profile`

Get admin profile information (requires authentication)

### PUT `/admin/auth/profile`

Update admin profile (requires authentication)

```json
{
  "name": "New Name",
  "phone": "+233501234567",
  "email": "newemail@agency.com"
}
```

### PUT `/admin/auth/password`

Change admin password (requires authentication)

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## Dashboard Routes

### GET `/admin/dashboard`

Get comprehensive dashboard information

- Returns agency overview, responder statistics, emergency metrics, performance data

## Analytics Routes

### GET `/admin/analytics`

Get performance analytics
**Query Parameters:**

- `period` (optional): Number of days (default: 30)
- `type` (optional): 'overview', 'performance', 'trends', 'responders' (default: 'overview')

### GET `/admin/analytics/response-times`

Get response time trends
**Query Parameters:**

- `days` (optional): Number of days to analyze (default: 30)

### GET `/admin/analytics/responder-utilization`

Get responder utilization statistics
**Query Parameters:**

- `period` (optional): Number of days (default: 30)

## Emergency Management Routes

### GET `/admin/emergencies`

Get all emergencies involving admin's agency
**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status ('Pending', 'Accepted', 'Declined', 'Completed')
- `emergency_type` (optional): Filter by type
- `severity` (optional): Filter by severity
- `sort_by` (optional): Sort field (default: 'createdAt')
- `sort_order` (optional): 'asc' or 'desc' (default: 'desc')

### GET `/admin/emergencies/:emergencyId`

Get detailed information about a specific emergency

### PUT `/admin/emergencies/:emergencyId/status`

Update emergency status

```json
{
  "status": "Completed",
  "admin_notes": "Emergency resolved successfully"
}
```

### PUT `/admin/emergencies/:emergencyId/assign`

Assign responders to an emergency

```json
{
  "responder_ids": ["60e4ca62d5713d4328d1b2c3", "60e4ca62d5713d4328d1b2c4"]
}
```

## Reports Routes

### GET `/admin/reports/agency`

Generate comprehensive agency report
**Query Parameters:**

- `reportType` (optional): 'comprehensive', 'performance', 'trends', 'responders' (default: 'comprehensive')
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `format` (optional): 'json' or 'csv' (default: 'json')

### GET `/admin/reports/efficiency`

Get emergency response efficiency report
**Query Parameters:**

- `period` (optional): Number of days (default: 30)

### GET `/admin/reports/responder-performance`

Get responder performance report
**Query Parameters:**

- `period` (optional): Number of days (default: 30)
- `limit` (optional): Number of responders to include (default: 50)

### GET `/admin/reports/emergency-types`

Get emergency types analysis report
**Query Parameters:**

- `period` (optional): Number of days (default: 90)

## Responder Management Routes

### GET `/admin/responders`

Get all responders under admin's agency

### GET `/admin/responders/:id`

Get details of a specific responder

### POST `/admin/responders`

Add new responder to agency

```json
{
  "name": "Responder Name",
  "email": "responder@agency.com",
  "phone": "+233501234567",
  "badgeNumber": "RSP001",
  "agency": "Police",
  "current_location": {
    "type": "Point",
    "coordinates": [-0.187, 5.6037]
  }
}
```

### DELETE `/admin/responders/:id`

Remove responder from agency

## Agency Management Routes

### GET `/admin/agency`

Get admin's agency information

### POST `/admin/agency`

Create new agency (for new admins)

```json
{
  "name": "Central Police Station",
  "branch": "Accra Central",
  "agency_type": "Police",
  "location": {
    "type": "Point",
    "coordinates": [-0.187, 5.6037]
  }
}
```

## Response Formats

### Success Response

```json
{
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "generated_at": "2025-08-11T10:30:00Z"
}
```

### Error Response

```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Example Usage

### Dashboard Data Request

```bash
curl -X GET "http://localhost:3000/admin/dashboard" \
  -H "Authorization: Bearer <your_token>"
```

### Filter Emergencies

```bash
curl -X GET "http://localhost:3000/admin/emergencies?status=Pending&emergency_type=Medical&page=1&limit=10" \
  -H "Authorization: Bearer <your_token>"
```

### Generate CSV Report

```bash
curl -X GET "http://localhost:3000/admin/reports/agency?format=csv&startDate=2025-07-01&endDate=2025-08-11" \
  -H "Authorization: Bearer <your_token>" \
  --output agency_report.csv
```
