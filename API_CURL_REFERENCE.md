# Parka Backend API - cURL Reference

This document provides Postman-friendly cURL commands for all implemented backend endpoints.
Authentication tokens should be obtained from login/signup endpoints and used in the `Authorization: Bearer <token>` header.

## Authentication Endpoints

### Send OTP

```bash
curl -X POST http://localhost:3000/api/v1/auth/otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

### Verify OTP & Sign In

```bash
curl -X POST http://localhost:3000/api/v1/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","otp":"123456"}'
```

### Sign In with Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/tokens/password \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","password":"securePassword123"}'
```

### Sign Up (after OTP verification)

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","name":"John Doe","password":"securePassword123"}'
```

### Get Current User Profile

```bash
curl -X GET http://localhost:3000/api/v1/auth/tokens/me \
  -H "Authorization: Bearer <your_token_here>"
```

### Logout

```bash
curl -X DELETE http://localhost:3000/api/v1/auth/tokens/me \
  -H "Authorization: Bearer <your_token_here>"
```

### List User Sessions

```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <your_token_here>"
```

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <your_token_here>"
```

### Update User Profile

```bash
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe"}'
```

### Change Password

```bash
curl -X PATCH http://localhost:3000/api/v1/users/me/password \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"oldPassword123","newPassword":"newSecurePassword456"}'
```

### Check Phone Existence

```bash
curl -X GET "http://localhost:3000/api/v1/users/existence?phone=%2B919876543210"
```

## Vehicle Management

### List Vehicles

```bash
curl -X GET http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer <your_token_here>"
```

### Add Vehicle

```bash
curl -X POST http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"FOUR_WHEELER","vehicleNumber":"ABC123","nickname":"My Car"}'
```

### Edit Vehicle

```bash
curl -X PATCH http://localhost:3000/api/v1/vehicles/VEHICLE_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"FOUR_WHEELER","vehicleNumber":"XYZ789","nickname":"Updated Car"}'
```

### Remove Vehicle

```bash
curl -X DELETE http://localhost:3000/api/v1/vehicles/VEHICLE_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>"
```

## QR Service & Action Sessions

### Create Action Session (after scanning QR)

```bash
curl -X POST http://localhost:3000/api/v1/action-sessions \
  -H "Content-Type: application/json" \
  -d '{"uuid":"QR_UUID_FROM_SPACE_QR_ENDPOINT"}'
```

### Get Space QR Code (Staff/Owner only)

```bash
curl -X GET http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE/qr \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER
```

### Stream Dynamic QR Code via SSE (Staff/Owner only)

Opens a persistent SSE connection. The server pushes a new `qr` event immediately on connect, then again each time the QR rotates (~every 2 minutes).

```bash
curl -N http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE/qr/stream \
  -H "Authorization: Bearer <your_token_here>"
```

**Event format:**
```
event: qr
data: {"uuid":"...","expiresAt":1234567890000,"spaceName":"Main Lot"}
```

## File Uploads

### Upload a File (authenticated users)

Uploads a file to Supabase Storage. Returns a public URL to use in other requests (e.g., `documentUrls` in business registration).

```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer <your_token_here>" \
  -F "file=@/path/to/document.pdf" \
  -F "purpose=business-document"
```

**Allowed types:** `application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `.docx`
**Max size:** 10MB
**Response:**
```json
{
  "data": {
    "url": "https://<project>.supabase.co/storage/v1/object/public/business-documents/business-document/<uuid>.pdf",
    "fileName": "business-document/<uuid>.pdf"
  }
}
```

## Parking Sessions

### Check-In (Guest or User)

```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer <your_token_here>" \  # Optional for guest check-in
  -H "Content-Type: application/json" \
  -d '{
    "actionSessionId":"ACTION_SESSION_UUID_FROM_QR_SCAN",
    "vehicleId":"VEHICLE_UUID_HERE",  // Optional for guest check-in
    "guestName":"John Doe",           // Required for guest check-in
    "guestPhone":"+919876543210",     // Required for guest check-in
    "guestVehicleType":"FOUR_WHEELER", // Required for guest check-in
    "guestVehicleNumber":"GUEST123"   // Required for guest check-in
  }'
```

### Staff On-Behalf Check-In

```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId":"SPACE_UUID_HERE",
    "name":"Jane Doe",
    "phone":"+919876543211",
    "vehicleType":"FOUR_WHEELER",
    "vehicleNumber":"STAFF456"
  }'
```

### List Sessions (with filters)

```bash
curl -X GET "http://localhost:3000/api/v1/sessions?page=1&pageSize=10&status=ACTIVE&spaceId=SPACE_UUID_HERE&guestPhone=%2B919876543210" \
  -H "Authorization: Bearer <your_token_here>"
```

### Get Session Details

```bash
curl -X GET http://localhost:3000/api/v1/sessions/SESSION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>"
```

### Close Session (Staff/Owner only)

```bash
curl -X PATCH http://localhost:3000/api/v1/sessions/SESSION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
```

## Checkout Requests

### Create Checkout Request

```bash
curl -X POST http://localhost:3000/api/v1/checkout/requests \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"sessionIds":["SESSION_UUID_1","SESSION_UUID_2"]}'
```

### List Checkout Requests (with filters)

```bash
curl -X GET "http://localhost:3000/api/v1/checkout/requests?page=1&pageSize=10&status=PENDING&spaceId=SPACE_UUID_HERE" \
  -H "Authorization: Bearer <your_token_here>"
```

### Get Checkout Request Details

```bash
curl -X GET http://localhost:3000/api/v1/checkout/requests/REQUEST_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>"
```

### Approve/Reject Checkout Request (Staff on duty or Owner)

```bash
curl -X PATCH http://localhost:3000/api/v1/checkout/requests/REQUEST_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"APPROVED",
    "finalAmount":15000,
    "overrideReason":"Happy customer discount"
  }'
```

## Staff Operations

### Get Staff Profile

```bash
curl -X GET http://localhost:3000/api/v1/staff/me \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER
```

### Toggle Duty Status

```bash
curl -X PATCH http://localhost:3000/api/v1/staff/me \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER \
  -H "Content-Type: application/json" \
  -d '{"isOnDuty":true}'
```

### Get Staff Metrics

```bash
curl -X GET "http://localhost:3000/api/v1/staff/me/metrics?date=2026-04-02" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER
```

## Staff Membership

### Create Staff Request (User applies to business)

```bash
curl -X POST http://localhost:3000/api/v1/staff-requests \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"BUSINESS_UUID_HERE","notes":"Experienced parking attendant"}'
```

### List Staff Requests (Owner only)

```bash
curl -X GET http://localhost:3000/api/v1/staff-requests \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Approve/Reject Staff Request (Owner only)

```bash
curl -X PATCH http://localhost:3000/api/v1/staff-requests/REQUEST_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"APPROVED",
    "reviewNotes":"Looks good, approved!"
  }'
```

### Leave Staff Membership

```bash
curl -X DELETE http://localhost:3000/api/v1/staff-memberships/me \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER
```

### List Staff for Business (Owner only)

```bash
curl -X GET http://localhost:3000/api/v1/owner/staff \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Invite Staff to Business (Owner only)

```bash
curl -X POST http://localhost:3000/api/v1/owner/staff/invitations \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543212","spaceId":"SPACE_UUID_HERE"}'
```

### Edit Staff Member (Owner only)

```bash
curl -X PATCH http://localhost:3000/api/v1/owner/staff/STAFF_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId":"SPACE_UUID_HERE",
    "status":"ACTIVE"
  }'
```

### Remove Staff Member (Owner only)

```bash
curl -X DELETE http://localhost:3000/api/v1/owner/staff/STAFF_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

## Business Registration & Profile

### Get Owner's Business

```bash
curl -X GET http://localhost:3000/api/v1/businesses/me \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Update Business

```bash
curl -X PATCH http://localhost:3000/api/v1/businesses/BUSINESS_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Business Name","category":"Hospitality"}'
```

### Submit Business Registration

```bash
curl -X POST http://localhost:3000/api/v1/business-registrations \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName":"New Parking Business",
    "category":"Hospitality",
    "spaceName":"Main Parking Lot",
    "spaceAddress":"123 Parking Street, City",
    "licenseNumber":"LIC123456",
    "gstNumber":"GST789012",
    "documentUrls":["https://example.com/doc1.pdf","https://example.com/doc2.pdf"]
  }'
```

### List Business Registrations (Verifier only)

```bash
curl -X GET "http://localhost:3000/api/v1/business-registrations?page=1&pageSize=10&status=PENDING" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER"
```

### Get Business Registration Details (Verifier only)

```bash
curl -X GET http://localhost:3000/api/v1/business-registrations/REGISTRATION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER"
```

### Approve/Reject Business Registration (Verifier only)

```bash
curl -X PATCH http://localhost:3000/api/v1/business-registrations/REGISTRATION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"APPROVED",
    "notes":"All documents verified, approved!"
  }'
```

## Spaces & Pricing

### List Owner's Spaces

```bash
curl -X GET http://localhost:3000/api/v1/spaces \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Create Space

```bash
curl -X POST http://localhost:3000/api/v1/spaces \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Downtown Parking","address":"456 Downtown Ave","latitude":40.7128,"longitude":-74.0060}'
```

### Get Space Details

```bash
curl -X GET http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER
```

### Update Space

```bash
curl -X PATCH http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Downtown Parking","address":"789 Updated St","latitude":40.7130,"longitude":-74.0058,"isActive":true}'
```

### Get Space Pricing Rules

```bash
curl -X GET http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE/pricing \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: STAFF"  # or OWNER
```

### Replace Space Pricing Rules

```bash
curl -X PUT http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE/pricing \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "rules":[
      {
        "vehicleType":"TWO_WHEELER",
        "durationFromMinutes":0,
        "durationToMinutes":60,
        "amountPaise":1000
      },
      {
        "vehicleType":"FOUR_WHEELER",
        "durationFromMinutes":0,
        "durationToMinutes":120,
        "amountPaise":2000
      },
      {
        "vehicleType":"FOUR_WHEELER",
        "durationFromMinutes":120,
        "durationToMinutes":null,
        "amountPaise":1500
      }
    ]
  }'
```

### List Staff for Space (Owner only)

```bash
curl -X GET http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE/staff \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### List Sessions for Space (Owner only)

```bash
curl -X GET "http://localhost:3000/api/v1/spaces/SPACE_UUID_HERE/sessions?page=1&pageSize=10&status=ACTIVE" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

## Owner Sessions & Audit

### List Owner's Sessions

```bash
curl -X GET "http://localhost:3000/api/v1/owner/sessions?page=1&pageSize=10&status=COMPLETED&spaceId=SPACE_UUID_HERE" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Get Session Details (Owner only)

```bash
curl -X GET http://localhost:3000/api/v1/owner/sessions/SESSION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Get Owner Audit Log

```bash
curl -X GET "http://localhost:3000/api/v1/owner/audit?page=1&pageSize=10&action=REGISTRATION_APPROVED" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

## Verifier Endpoints

### List Business Registrations (Verifier only)

```bash
curl -X GET "http://localhost:3000/api/v1/verifier/registrations?page=1&pageSize=10&status=PENDING" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER"
```

### Get Business Registration Details (Verifier only)

```bash
curl -X GET http://localhost:3000/api/v1/verifier/registrations/REGISTRATION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER"
```

### Approve/Reject Business Registration (Verifier only)

```bash
curl -X PATCH http://localhost:3000/api/v1/verifier/registrations/REGISTRATION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"APPROVED",
    "notes":"All requirements met, approved for operation!"
  }'
```

### List Subscription Requests (Verifier only)

```bash
curl -X GET "http://localhost:3000/api/v1/verifier/subscription-requests?page=1&pageSize=10&status=PENDING" \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER"
```

### Approve/Reject Subscription Request (Verifier only)

```bash
curl -X PATCH http://localhost:3000/api/v1/verifier/subscription-requests/REQUEST_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: VERIFIER" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"APPROVED",
    "notes":"Business meets requirements for growth plan!"
  }'
```

## Analytics, Notifications, Plans & Subscriptions

### Get User Analytics (role-aware)

```bash
curl -X GET "http://localhost:3000/api/v1/analytics/me?from=2026-03-01&to=2026-03-31" \
  -H "Authorization: Bearer <your_token_here>"
```

### List Notifications

```bash
curl -X GET http://localhost:3000/api/v1/notifications \
  -H "Authorization: Bearer <your_token_here>"
```

### Mark All Notifications as Read

```bash
curl -X PATCH http://localhost:3000/api/v1/notifications \
  -H "Authorization: Bearer <your_token_here>"
```

### Get Notification Details

```bash
curl -X GET http://localhost:3000/api/v1/notifications/NOTIFICATION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>"
```

### Mark Notification as Read

```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/NOTIFICATION_UUID_HERE \
  -H "Authorization: Bearer <your_token_here>"
```

### List Subscription Plans

```bash
curl -X GET http://localhost:3000/api/v1/plans
```

### Create Subscription Request (Owner only)

```bash
curl -X POST http://localhost:3000/api/v1/subscription-requests \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{"planId":"PLAN_UUID_HERE","billingCycle":"MONTHLY","notes":"Upgrading to growth plan"}'
```

### List Subscription Requests (Owner only)

```bash
curl -X GET http://localhost:3000/api/v1/subscription-requests \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"
```

### Get Business Subscription Details (Owner/Verifier)

```bash
curl -X GET http://localhost:3000/api/v1/businesses/BUSINESS_UUID_HERE/subscription \
  -H "Authorization: Bearer <your_token_here>" \
  -H "Role: OWNER"  # or VERIFIER
```

## Subscription Lifecycle Cron Jobs

### Demo Expiry Cron (DEMO → EXPIRED after 7 days)

```bash
curl -X POST http://localhost:3000/api/v1/cron/demo-expiry \
  -H "Authorization: Bearer <your_cron_secret_here>"
```

### Demo Cleanup Cron (Hard delete EXPIRED demo businesses after 14 days)

```bash
curl -X POST http://localhost:3000/api/v1/cron/demo-cleanup \
  -H "Authorization: Bearer <your_cron_secret_here>"
```

### Subscription Grace Cron (ACTIVE → GRACE when payment fails)

```bash
curl -X POST http://localhost:3000/api/v1/cron/subscription-grace \
  -H "Authorization: Bearer <your_cron_secret_here>"
```

### Grace Expiry Cron (GRACE → EXPIRED after 14-day grace period)

```bash
curl -X POST http://localhost:3000/api/v1/cron/grace-expiry \
  -H "Authorization: Bearer <your_cron_secret_here>"
```

## Notes

1. Replace `<your_token_here>` with actual JWT token obtained from login/signup endpoints
2. Replace `<your_cron_secret_here>` with the value set in `CRON_SECRET` environment variable
3. Replace UUID placeholders (e.g., `VEHICLE_UUID_HERE`, `SPACE_UUID_HERE`) with actual IDs from responses
4. For endpoints requiring specific roles, include the appropriate role header:
   - `Role: STAFF`
   - `Role: OWNER`
   - `Role: VERIFIER`
   - `Role: USER`
5. All POST/PUT/PATCH endpoints require `Content-Type: application/json` header
6. Date format for query parameters: `YYYY-MM-DD`
7. Phone numbers should include country code: `+91XXXXXXXXXX` for India
8. Amounts in API are in paise (₹1 = 100 paise)

## Environment Setup

Before testing, ensure you have:

1. Running development server: `npm run dev`
2. Properly configured `.env` file with:
   - `DATABASE_URL` (PostgreSQL connection)
   - `DIRECT_URL` (Prisma direct connection)
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - `JWT_SECRET` (for token signing)
   - `CRON_SECRET` (for cron job authentication)
   - `NEXTAUTH_SECRET` (for NextAuth)

## Response Format

All successful responses follow this format:

```json
{
  "data": {
    // endpoint-specific data
  }
}
```

Error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional additional details
  }
}
```
