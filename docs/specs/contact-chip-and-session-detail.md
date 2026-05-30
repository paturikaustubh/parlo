# Spec: ContactChip Component + Session Detail Redesign

## Problem

1. **Session detail sheet has redundant data.** Vehicle number and space name appear in both the sheet header and as labelled fields below — duplicated for no reason.
2. **Registered parker identity is missing.** For non-guest sessions, the API doesn't expose the parker's name or phone. Staff/owner can't identify who parked.
3. **Guest contact is shown as raw text.** Name and phone are just `<p>` tags — no quick-call affordance.
4. **Checkout request card has custom inline dialogs** for parker/approver contact that should be a shared component.
5. **Checked-in/out-by names have no phone.** Staff names are shown but can't be tapped to call.

---

## Solution Overview

1. **`ContactChip` component** — shared, reusable. Renders a person's name as a tappable chip. If phone is present, shows a phone icon. Tap → dialog with name + "Call" button (`tel:` link).
2. **Session API** — expose `userName` + `userPhone` for registered-user sessions (currently only `guestName`/`guestPhone` for guests).
3. **Session detail sheet** — remove redundant fields, unify guest/user identity into one "Parker" row using `ContactChip`.
4. **Checkout request card** — replace its bespoke parker/approver dialogs with `ContactChip`.

---

## 1. ContactChip Component

**File:** `src/components/shared/contact-chip.tsx`

### Props
```ts
interface ContactChipProps {
  name: string;
  phone?: string | null;
  label?: string; // optional context label, e.g. "Parker", "Checked in by"
}
```

### Behaviour
- Renders as a small inline button/chip showing `name`
- If `phone` is present: phone icon beside name
- Click → Dialog:
  - Title: name (bold)
  - Label chip (if `label` provided): e.g. "Parker" or "Checked in by"
  - "Call [phone]" button → `href="tel:[phone]"` (opens dialler)
  - If no phone: dialog just shows name + label, no call button
- If `name` is empty/null: render nothing (null)

### Design direction (frontend-design)
- Chip: `inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted/60 hover:bg-muted border border-border rounded-full px-2.5 py-1 transition-colors cursor-pointer`
- Phone icon: `IconPhone size={11} className="text-muted-foreground"`
- Dialog: `max-w-xs`, centered name, large call button styled with primary color
- Call button: full width, primary variant, `IconPhone` icon, `"Call [phone]"`
- If no phone: show name in a simple info state, no button

### Usage pattern
```tsx
// Anywhere a person's name is shown:
<ContactChip name={session.guestName} phone={session.guestPhone} label="Guest" />
<ContactChip name={session.userName} phone={session.userPhone} label="Parker" />
<ContactChip name={session.checkedInByName} label="Checked in by" />
<ContactChip name={req.userName} phone={req.userPhone} label="Parker" />
<ContactChip name={req.approverName} phone={req.approverPhone} label="Approver" />
```

---

## 2. API Changes — Expose Parker Identity in Sessions

### Problem
`formatSession()` in `src/repositories/session.repository.ts` currently selects `user: { select: { userId } }` — name and phone are NOT included.

For registered-user sessions, `userName` and `userPhone` are `null` in all session API responses. Only `guestName`/`guestPhone` (from the session row itself) are returned.

### Changes required

#### `src/repositories/session.repository.ts`

**`sessionInclude`** — add `name` and `phone` to user select:
```ts
// Before:
user: { select: { userId: true } },

// After:
user: { select: { userId: true, name: true, phone: true } },
```

**`formatSession()`** — add two new fields:
```ts
// After guestPhone line, add:
userName: (s as any).user?.name ?? null,
userPhone: (s as any).user?.phone ?? null,
```

Also add `checkedInByPhone` and `checkedOutByPhone` for staff contact:
```ts
checkedInByPhone: (s as any).checkedInBy?.user?.phone ?? null,
checkedOutByPhone: (s as any).checkedOutBy?.user?.phone ?? null,
```
This requires adding `phone: true` to `checkedInBy.user` and `checkedOutBy.user` selects too.

#### `src/shared/types/entities.d.ts`

Add to the `ParkingSession` type:
```ts
userName?: string | null;
userPhone?: string | null;
checkedInByPhone?: string | null;
checkedOutByPhone?: string | null;
```

No API route changes needed — routes already pass through `formatSession()` output.

---

## 3. Session Detail Sheet Redesign

**File:** `src/app/(owner)/owner/sessions/page.tsx` (Sheet, lines ~358–545)

### What to remove
- The standalone `VEHICLE` field block (lines ~401–408) — already in sheet title
- The standalone `SPACE` field block (lines ~409–416) — already in subtitle

### What to change

**Parker section** — replace the current guest-only block with a unified "Parker" row that handles both guest and registered users:
```tsx
// Replace the current guestName/guestPhone block with:
{(session.guestName || session.userName) && (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
      Parker
    </p>
    <ContactChip
      name={(session.guestName || session.userName)!}
      phone={session.guestPhone ?? session.userPhone}
      label={session.guestName ? "Guest" : "Registered"}
    />
  </div>
)}
```

**Checked in/out by** — replace plain text with ContactChip:
```tsx
// Before:
<p className="text-xs text-foreground">{selected.checkedInByName}</p>

// After:
<ContactChip name={selected.checkedInByName!} phone={selected.checkedInByPhone} label="Checked in by" />
```
Same for checkedOutByName.

### Layout tightening
- Remove `space-y-4` → use `space-y-3` on the fields container (reduces gaps)
- The 2-column grid for duration/amount and checkin/checkout stays
- Rate breakdown stays at the bottom

---

## 4. Checkout Request Card Refactor

**File:** `src/components/shared/checkout-request-card.tsx`

The card currently has two inline `useState` booleans (`parkerOpen`, `approverOpen`) and two custom Dialog blocks for parker and approver contact. These should be replaced with `ContactChip`.

### Changes
- Remove `parkerOpen`, `approverOpen` state
- Remove the two custom `<Dialog>` blocks for parker/approver
- Replace the parker button (lines ~205–230) with:
  ```tsx
  <ContactChip name={req.userName} phone={req.userPhone} label="Parker" />
  ```
- Replace the approver button with:
  ```tsx
  <ContactChip name={req.approverName} phone={req.approverPhone} label="Approver" />
  ```

---

## 5. Affected Files Summary

| File | Change |
|------|--------|
| `src/components/shared/contact-chip.tsx` | **CREATE** — new ContactChip component |
| `src/repositories/session.repository.ts` | Add `userName`, `userPhone`, `checkedInByPhone`, `checkedOutByPhone` to `formatSession` + selects |
| `src/shared/types/entities.d.ts` | Add 4 new optional fields to `ParkingSession` type |
| `src/app/(owner)/owner/sessions/page.tsx` | Remove redundant VEHICLE/SPACE fields, use ContactChip for parker + staff |
| `src/components/shared/checkout-request-card.tsx` | Replace custom parker/approver dialogs with ContactChip |

**No new API routes needed.** The existing session endpoints already use `formatSession()` — adding fields there propagates everywhere automatically.

---

## 6. Other Pages to Check

Once `ContactChip` exists and session API returns `userName`/`userPhone`, check these for name rendering opportunities:
- `src/app/(staff)/staff/queue/page.tsx` — uses `SpaceOperationsPanel` → `CheckoutRequestCard` (covered by #4)
- `src/app/(owner)/owner/queue/page.tsx` — also uses `CheckoutRequestCard` (covered by #4)
- `src/app/(staff)/staff/on-behalf/page.tsx` — check if it shows user names
- `src/app/(user)/history/page.tsx` — user's own session history, likely doesn't need ContactChip

---

## Open Questions

1. **Staff phone in checkout-request-card**: `approverPhone` already exists in `CheckoutRequest` type — confirm the API populates it.
2. **Session list rows**: Should parker name appear in the list row itself (currently only vehicle number + space)? Low priority, but a `ContactChip` inline in the row would let staff tap-to-call from the list.
3. **`isOnBehalf` sessions**: These are registered sessions checked in on behalf of a user by staff. Should `userName` show the owner or the staff member? Likely the owner — confirm with `isOnBehalf` logic.
