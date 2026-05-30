# E2E Test Script — Parka

DB state before starting: roles + plans seeded, all user data wiped.

---

## Profiles

| Label | Role | Description |
|-------|------|-------------|
| **O** | OWNER | Business owner — full control |
| **S** | STAFF | Staff member assigned to a space |
| **U** | USER | Registered parker |
| **G** | GUEST | No account, walk-in parker |

---

## 1. Owner — Onboarding

### 1.1 Register
- [ ] Go to `/register`
- [ ] Enter name, phone, password → submit
- [ ] Redirected to dashboard or onboarding screen

### 1.2 Register Business
- [ ] Navigate to business registration form
- [ ] Fill: business name, address, contact details
- [ ] Upload a document (e.g. GST cert)
- [ ] Submit → success toast shown
- [ ] Business status: PENDING (waiting for admin approval)

> **Note:** For testing, manually approve the business via DB or admin panel, then continue.

### 1.3 Create Space
- [ ] Go to Owner → Spaces
- [ ] Create new space: name, address, capacity
- [ ] Space appears in list

### 1.4 Set Pricing
- [ ] Click space → Pricing tab
- [ ] Add pricing slabs for at least 2 vehicle types (e.g. TWO_WHEELER, FOUR_WHEELER)
- [ ] Save → success toast
- [ ] Verify slab grid renders correctly

### 1.5 Invite Staff
- [ ] Go to Owner → Staff
- [ ] Invite by phone number
- [ ] Invitation status: PENDING

---

## 2. Staff — Onboarding & Duty

### 2.1 Register (if not already a user)
- [ ] Go to `/register` with the phone number that was invited
- [ ] Register → now has USER role

### 2.2 Accept Staff Invite
- [ ] Log in as the invited user
- [ ] Staff invite visible in profile or notification
- [ ] Accept invite → now has STAFF role
- [ ] Redirected to staff dashboard

### 2.3 Duty Toggle
- [ ] Staff dashboard shows "OFF" duty button
- [ ] Tap → goes ON duty → duty start time shown
- [ ] Tap again → goes OFF duty

---

## 3. Staff — Off-Duty Blocks (enforcement)

All tests below: staff must be **OFF duty**.

### 3.1 Queue page blocked
- [ ] Go to Queue page
- [ ] See "You're not on shift" overlay with "Start Shift" CTA
- [ ] QR not loaded, no requests visible

### 3.2 API blocked — QR
- [ ] Manually call `GET /api/v1/spaces/{spaceId}/qr` with staff token
- [ ] Expect: `403 OFF_DUTY`

### 3.3 API blocked — Notes
- [ ] Manually call `POST /api/v1/staff/me/notes` with staff token
- [ ] Expect: `403 OFF_DUTY`

### 3.4 API blocked — Flags
- [ ] Manually call `POST /api/v1/staff/me/flags` with staff token
- [ ] Expect: `403 OFF_DUTY`

---

## 4. Staff — On-Duty Operations

Put staff **ON duty** before this section.

### 4.1 Show QR
- [ ] Go to Queue page
- [ ] QR code visible with animated border ring
- [ ] Timer countdown shown (refresh every ~2 min)
- [ ] Border depletes clockwise, turns red near expiry
- [ ] On refresh: border regrows with 1.5s ease animation

### 4.2 Process Checkout Requests

> Requires active parking sessions. Come back here after completing Section 6 (User check-in).

- [ ] Pending checkout request appears in Queue → Pending tab
- [ ] "Approve" button visible for others' requests
- [ ] "Approve" NOT visible for own checkout request (self-approval blocked — shows message instead)
- [ ] Approve a request → session marked COMPLETED, toast shown
- [ ] Reject a request → enter reason → session stays ACTIVE, toast shown
- [ ] All tab shows full history with pagination

### 4.3 Check-in on Behalf
- [ ] Go to On-Behalf page
- [ ] Enter vehicle number, select type, optionally enter name + phone
- [ ] Submit → session created, receipt shown

### 4.4 Create Note
- [ ] Go to Profile or Notes section
- [ ] Create a note → success
- [ ] Note appears in list

### 4.5 Create Flag
- [ ] Create an incident flag (SPACE_ISSUE / VEHICLE_ISSUE / OTHER)
- [ ] Flag appears in list

---

## 5. Owner — Operations & Management

### 5.1 Owner Operate Page
- [ ] Go to Spaces → [Space] → Operate
- [ ] Full SpaceOperationsPanel shown (QR + checkout requests)
- [ ] No duty gate (owner bypasses)

### 5.2 Owner Approve/Reject Checkout
- [ ] Pending requests shown (owner sees all spaces)
- [ ] Owner can approve any request (no duty required)
- [ ] Approved → session COMPLETED

### 5.3 Sessions Page
- [ ] Go to Owner → Sessions
- [ ] Table shows all parking sessions
- [ ] Filter by space, date range works
- [ ] Pagination works
- [ ] Refresh button reloads data

### 5.4 Activity Page
- [ ] Go to Owner → Activity
- [ ] Audit log visible
- [ ] Filter by space, date, type
- [ ] Pagination works

### 5.5 Requests Queue Page
- [ ] Go to Owner → Requests
- [ ] Pending tab: polled every 10s
- [ ] All tab: paginated, switchable
- [ ] Search by code / plate / name works

### 5.6 Reports Page
- [ ] Go to Owner → Reports
- [ ] Revenue / sessions / trends visible
- [ ] Tab switch caches results (no re-fetch on same tab revisit)
- [ ] Refresh button forces reload

### 5.7 Staff Management
- [ ] View staff list
- [ ] See staff duty status
- [ ] Revoke / remove staff member

---

## 6. Registered User — Check-in Flow

### 6.1 Register User
- [ ] `/register` → enter phone, name, password
- [ ] Login → user dashboard

### 6.2 Add Vehicle
- [ ] Go to Profile → Vehicles
- [ ] Add vehicle: plate number + type (TWO_WHEELER / FOUR_WHEELER / etc.)
- [ ] Vehicle saved

### 6.3 Scan QR & Check-in
- [ ] Go to `/scan` → camera opens
- [ ] Scan valid QR from staff Queue page
- [ ] Redirected to `/checkin?token=...`
- [ ] Registered vehicles shown, filtered to types supported by the space
- [ ] Can add new vehicle inline (dialog)
- [ ] Select vehicle → submit → check-in receipt shown
- [ ] Receipt shows: space name, vehicle, time

### 6.4 Request Checkout
- [ ] After check-in, go to active session (dashboard or history)
- [ ] Request checkout → checkout request created
- [ ] Status shows PENDING
- [ ] Staff/owner approves (see Section 4.2 / 5.2)
- [ ] Session transitions to COMPLETED

### 6.5 History
- [ ] Go to History page
- [ ] Completed session appears
- [ ] Filter by space and date range works
- [ ] Pagination works
- [ ] Click session row → detail sheet shows: vehicle, amount, duration, timeline

---

## 7. Guest — Walk-in Flow

### 7.1 Guest Check-in
- [ ] Go to `/g/checkin` (or scan QR → guest path)
- [ ] No login required
- [ ] Camera scanner opens → scan space QR
- [ ] Form appears: vehicle number (required), type (required), name (optional), phone (optional)
- [ ] Vehicle type dropdown filtered to space-supported types
- [ ] Submit → receipt shown
- [ ] Receipt: space name, plate, time (no auth token shown)
- [ ] Session stored in `pending_checkin` localStorage

### 7.2 Guest Checkout Lookup
- [ ] Go to `/g/lookup`
- [ ] Enter phone number used at check-in
- [ ] Active sessions for that phone shown
- [ ] Select session → request checkout
- [ ] Checkout request created → status PENDING
- [ ] Staff/owner approves → session COMPLETED

---

## 8. Edge Cases

### 8.1 Expired / Invalid QR
- [ ] Modify QR token in URL manually → check-in page shows error

### 8.2 Off-duty staff tries to check in on behalf
- [ ] Staff goes off duty
- [ ] Try on-behalf check-in → `403 OFF_DUTY` error shown

### 8.3 Vehicle type not supported by space
- [ ] Space only supports TWO_WHEELER pricing
- [ ] FOUR_WHEELER not shown in dropdown for user/guest

### 8.4 Self-approval blocked
- [ ] Staff creates own checkout request
- [ ] On own request card → no Approve button (shows "Can't approve your own request" or similar)

### 8.5 Duplicate active session
- [ ] Same vehicle tries to check in while already active
- [ ] Should fail with appropriate error

### 8.6 Navigation — back from Operate
- [ ] From `/owner/spaces/{id}/operate` → press back → lands on `/owner/spaces/{id}` (not dashboard)

### 8.7 Bottom nav Home
- [ ] On any owner sub-route → Home icon not highlighted (exact match only)
- [ ] On `/owner` exactly → Home highlighted

---

## 9. Toast & Error UX

- [ ] All success actions show green toast with close (×) button
- [ ] All error states show red toast with close button
- [ ] Toasts auto-dismiss

---

## 10. Responsive / Mobile

- [ ] Queue page on mobile: single column cards
- [ ] Check-in form: name + phone on same row on md+, stacked on mobile
- [ ] Vehicle type tabs: compact, not oversized
- [ ] History page: pagination not overflowing
- [ ] Operate page: QR centered, requests below

---

## Checklist Summary

| Section | Scenario | Pass |
|---------|----------|------|
| 1 | Owner onboarding (register, business, space, pricing, invite staff) | |
| 2 | Staff onboarding + duty toggle | |
| 3 | Off-duty blocks (UI overlay + 3 API endpoints) | |
| 4 | On-duty operations (QR, checkout, on-behalf, notes, flags) | |
| 5 | Owner management (sessions, activity, queue, reports) | |
| 6 | Registered user check-in, checkout request, history | |
| 7 | Guest check-in + phone lookup + checkout | |
| 8 | Edge cases | |
| 9 | Toast/error UX | |
| 10 | Responsive/mobile | |
