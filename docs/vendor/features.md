# Waakye Plug — Vendor/Admin App Changes

Every feature/change below lives in **`waakyeplug-vendor`**. One section per
change, oldest first.

---

## 1. Platform-wide admin (single admin role)

The admin signs in and manages the whole network — not one shop. Dashboard has
tabbed sections: **Overview**, **Orders**, **Menu**, **Riders**, **Settings**,
and a **Vendors** management page in `VendorsPage.tsx`.

## 2. Orders pipeline

`OrdersPage.tsx` (platform-wide) lets the admin run every order from receipt to
delivery:

- Orders split into **Pending** (`awaiting_approval`), **In transit**
  (`available` / `rider_assigned` / `picked_up`), and **Completed**
  (`delivered`) / **Cancelled** lists, with search + status filters.
- **Approve** a pending order → `available` (flips to "awaiting approval" so
  approved riders can claim it over realtime).
- **Decline** with a required reason → `cancelled` + `cancel_reason`
  (surfaces on the customer's tracker).
- Vendor-scoped order views in `OverviewTab.tsx` and `OrdersTab.tsx` share
  `lib/api.ts` helpers (`getVendorOrders`, `approveOrder`, `declineOrder`).

## 3. Full UI overhaul

- New theme: deep-orange accent, shared `ui.tsx` primitives (Card, Button,
  Modal, Toggle, Badge…), consistent cards and empty states across
  Overview/Orders/Menu/Riders/Settings.
- Riders tab: approve/reject rider applications (via `approve-rider` /
  `decline-rider` edge functions), online status, transport, commission.

## 4. Modal overlay/portal fix (containing-block bug)

The "add item" and order dialogs were rendering inside a `waakyeplug` wrapper
that was an animated **containing block** (`transform: translateY(...)` with
`fill: both`). A finishing/filled animation still computes a transform —
Chrome resolves a finished `to { transform: none }` to an identity matrix, so
**fixed children stayed trapped inside the card** and the modal never covered
the viewport.

Fix (verified with probe pages that call `document.getAnimations()[0].finish()`):

- `components/ui.tsx` — Modal portaled to `document.body`.
- `pages/OrdersPage.tsx` — both confirm/decline dialogs portaled.
- `index.css` — removed `fill` (`both`) from `.animate-fade-up` so the finished
  state is really `none` (portals are the primary defence, this is belt-and-
  braces). `to { transform: none }` retained.

## 5. Waakye packs (category `waakye`)

New menu category matching the customer side. The vendor adds a **waakye pack**
as a single item (name, price, photo, description) plus ticking which of their
own **Extras** come inside it.

- `lib/api.ts` — `MenuItem.category` now includes `'waakye'`; new
  `MenuItemIncluded` type; `included_items` on `MenuItem`; `addMenuItem()`
  accepts `includedItems` and `updateMenuItem()` can edit it.
- `pages/tabs/MenuTab.tsx` — new **Waakye** category chip + standalone form.
  When the category is Waakye the form shows a **"What's included"** multi-
  select built from the vendor's Extra items; saved as
  `included_items: [{ id, name, quantity }]`. Waakye cards show their contents
  as little orange chips.
- DB: column `vendor_menu_items.included_items jsonb NOT NULL DEFAULT '[]'`.

> Editing a pack's included contents after creation isn't in the UI yet —
> delete + re-add the pack (same workflow as combos). The vendor can rename/
> re-price toggling directly.

---

## Known issues / notes

- The customer-facing opening-hours copy ("5:30 – 8:00 AM") doesn't match the
  live open/close config.
- One pre-existing `npm audit` high-severity vulnerability is reported.
- Admin password for `mygoals990@gmail.com` is unknown in this repo — browser
  testing of the admin app isn't possible until it's known.