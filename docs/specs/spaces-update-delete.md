# Spaces Update & Delete — Spec

## Goal

Enable Update and Delete for spaces from the owner UI. Create is already working.

## Current State

| Layer | Create | Update | Delete |
|-------|--------|--------|--------|
| API route | ✅ POST `/spaces` | ✅ PATCH `/spaces/[spaceId]` | ❌ missing |
| Service | ✅ `createSpace` | ✅ `updateSpace` | ❌ missing |
| UI | ✅ Add Space dialog | ❌ missing | ❌ missing |

`updateSpace` already accepts: `name`, `address`, `latitude`, `longitude`, `isActive`, `spaceType`.  
`isActive` toggle already works as a soft-disable. **Delete = hard delete** (separate concern).

---

## API Changes

### DELETE `/api/v1/spaces/[spaceId]`

- Auth: `OWNER` role
- Guard: verify space belongs to caller's business
- Guard: reject if space has **active parking sessions** (`status = 'ACTIVE'`)
- On success: hard delete the space row (`prisma.space.delete`)
- Response: `200 { success: true }`
- Errors: `404` if not found, `403` if not owner, `409` if active sessions exist

### PATCH `/api/v1/spaces/[spaceId]` (already exists — no change needed)

Fields accepted: `name`, `address`, `latitude`, `longitude`, `isActive`, `spaceType`. All optional.

---

## Service Changes

### `deleteSpace(spaceId: string, ownerId: number)`

```
1. Find space by spaceId, include business.ownerId
2. 404 if not found
3. 403 if business.ownerId !== ownerId
4. Check active sessions: prisma.parkingSession.count({ where: { spaceId: space.id, status: 'ACTIVE' } })
5. 409 ConflictError if count > 0
6. prisma.space.delete({ where: { spaceId } })
```

---

## UI Changes

Location: **`src/app/(owner)/owner/spaces/page.tsx`**

### Space Card — action buttons

Each space card gets two icon buttons in the top-right corner:
- **Edit** (pencil icon) — opens Edit Space dialog
- **Delete** (trash icon) — opens Delete confirmation dialog

Active/inactive toggle stays where it is.

### Edit Space Dialog

Trigger: pencil icon on card.

Fields (pre-filled with current values):
- Space name (text input, required)
- Address (textarea, optional)
- Space type (select, optional) — same SPACE_TYPES list as Add dialog

On submit: `PATCH /api/v1/spaces/[spaceId]` with changed fields.  
On success: update space in local list, close dialog, show success toast.  
On error: show error toast, keep dialog open.

No lat/lng editing in UI (not surfaced anywhere currently).

### Delete Space Dialog

Trigger: trash icon on card.

Content:
- Warning message: "This will permanently delete **{space.name}**. Active sessions must end before deletion."
- Cancel button
- Delete button (destructive red styling)

On confirm: `DELETE /api/v1/spaces/[spaceId]`.  
On success: remove space from local list, show success toast.  
On 409 error: show specific toast "Space has active sessions. End them first."  
On other error: show generic error toast.

---

## Design Notes (for /frontend-design)

- Edit and delete icon buttons: small, ghost-variant, appear on card hover or always visible
- Edit dialog: mirrors Add Space dialog layout and sizing
- Delete dialog: use existing `AlertDialog` component (already imported in spaces page)
- Delete button color: destructive red (`variant="destructive"`)
- No new pages — everything in dialogs on the spaces list page
- Space card currently shows: name, spaceType badge, address, active toggle. Edit/delete icons go top-right of card.

---

## Files to Touch

| File | Change |
|------|--------|
| `src/app/api/v1/spaces/[spaceId]/route.ts` | Add `DELETE` handler |
| `src/services/space.service.ts` | Add `deleteSpace` function |
| `src/lib/errors.ts` | Check if `ConflictError` exists; add if not |
| `src/app/(owner)/owner/spaces/page.tsx` | Edit dialog, delete dialog, card action buttons |
