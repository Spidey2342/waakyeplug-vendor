# Waakye Plug — Vendor/Admin Panel Audit & Bug Report

**Date:** 2026-09-09
**Repo:** `waakyeplug-vendor` — github.com/Spidey2342/waakyeplug-vendor
**Stack:** Vite 6 + React 18 + TypeScript + react-router-dom 6 + Tailwind 4 + Supabase
**Companion docs:** customer app → `../Waakye-Plug2/AUDIT.md` · rider app → `../Waakye-plug-rider/RIDER_AUDIT.md`

---

## 1. What this app actually is

Despite the repo name, this is the **Admin dashboard**, not a vendor portal:

- One admin login (email/password, account created directly in Supabase — no self-registration).
- Manages **all vendors** (create, edit, open/close, GPS location, menu, photos) and **all riders** (approve/decline/remove applications, view commission owed) platform-wide.
- Vendors themselves **never log in** — `createVendor` inserts `owner_id: null`. All vendor data is admin-managed.
- Per-vendor Dashboard tabs: Overview (today's stats), Orders (realtime monitoring), Menu (CRUD + image upload), Settings (shop details/GPS/password).

## 2. Summary

| Item | Result |
|---|---|
| Code size | Small & tidy — 19 source files, all reviewed |
| Auth design | ✅ Best of the three apps (see below) |
| Production build | ✅ **VERIFIED 2026-09-15** — `tsc && vite build` exit 0, 1659 modules, 22.09s → `dist/assets/index-JtAzYlkH.js` (446.89 kB) + `index-Bl6h3Txw.css` (27.46 kB). Includes V5/V6/V7 fixes + canonical-status type cleanup. |
| npm vulnerabilities | ⚠️ 6 (3 moderate, 3 high) |
| Secrets hygiene | ✅ No `.env` committed; ✅ `.env` on disk since 2026-09-12 (`VITE_SUPABASE_URL` + anon key copied from customer app) |
| Biggest gap | ⚠️ **All data protection depends on unseen Supabase RLS policies** — no migrations/schema anywhere in the three repos |

---

## 3. What's done well ✅

- **Admin check can't be skipped:** every session load (fresh login, restored session, auth state change) funnels through `applySessionIfAdmin` in `AuthContext.tsx` — a non-admin account is actively signed out, not just shown the login page. Compare with the rider app, which has no role gating at all.
- Clean, consistent UI: toast system (`ToastContext`) instead of `alert()`, loading states everywhere, mobile sidebar, destructive actions behind `window.confirm`.
- Realtime orders: per-vendor `postgres_changes` subscription with proper channel cleanup (`OrdersTab`).
- Sensible types for the domain (`Vendor`, `MenuItem`, `Order`, `Rider`) including `pricing_type: 'fixed' | 'variable'` and menu categories matching the customer app's builder.
- Menu quick-add UX: batch rows per category, auto-advance Size → Protein → Extra → Drink.
- Money shown as GHS with `toFixed(2)` for commission/deposit.

---

## 4. Bugs & Issues (ranked)

### 🔴 V1 — `decline-rider` edge function has no caller auth (extends rider S3 to destructive deletes) *(FIXED 2026-09-12 — see Fix log)*
- The vendor app sends the admin's access token to `functions/v1/decline-rider` (`api.ts:296-308`) — good intent.
- But the function (in the rider repo, `supabase/functions/decline-rider/index.ts`) **never verifies the caller**. It uses the service-role key to delete the riders row, the profiles row, **and the Supabase auth account**.
- Anyone with the public anon key can POST a `rider_id` and **permanently delete any rider's account and data** — including active riders with outstanding commission.
- **Fix (launch-blocking, same work item as rider S3):** verify the caller's JWT and `role === 'admin'` inside the function before touching anything.

### 🔴 V2 — Admin data protection depends entirely on unverified RLS *(FIXED 2026-09-12 — see Fix log)*
- The client-side admin check gates the **UI only**. All DB calls (`getAllVendors`, `updateVendor`, `updateMenuItem`, `approveRiderApplication`, `cancelOrder`…) run with the **anon key**.
- If RLS on `vendors` / `vendor_menu_items` / `orders` / `riders` doesn't restrict writes to `role = 'admin'`, then anyone with the anon key can mutate the whole platform directly — no admin account needed.
- **We have no schema/migrations in any of the three repos**, so this can't be verified from code. `approveRiderApplication` (a plain anon-key update) *working* in production would actually be **evidence RLS is too loose** (a rider's own session shouldn't be able to self-approve).
- **Fix:** export the DB schema + RLS policies into a `supabase/migrations` folder (version-controlled), and write policies that key off `auth.jwt() ->> 'role'` / profiles.role.

### 🟠 V3 — Cross-app status mismatch confirmed — vendor enum is the closest to "truth"
- Vendor `Order['status']`: `pending | available | ready | rider_assigned | picked_up | delivered | cancelled` (`api.ts:41`).
- Customer tracker expects `accepted`/`preparing` — **statuses that exist in no other app and nothing ever writes them**. The rider app writes `available/ready → rider_assigned → picked_up → delivered`.
- The real business flow (per vendor app copy): *"Orders flow to riders automatically — this view is for monitoring only"* — there is no vendor-accept step at all. Customer inserts `status: 'available'` (customer P1), vendor enum's `'pending'` is written by nobody.
- **Fix:** define the canonical lifecycle once (DB enum + shared constants): `available → rider_assigned → picked_up → delivered` (+ `cancelled`), then update the customer tracker's `STATUS_STEPS` to match. `accepted`, `preparing`, `pending` are ghosts to delete.

### 🟠 V4 — Removing an active rider destroys their record with unpaid commission outstanding
- `handleRemoveActiveRider` → `decline-rider` deletes the riders row entirely — including `commission_owed` (money the platform is owed) and order history linkage (`orders.rider_id` now dangles).
- No reconciliation step, no export, no "settle before removal" check.
- **Fix:** block removal while `commission_owed > 0`, or archive riders (`is_active: false`) instead of deleting.

### 🟡 V5 — Password reset is dead code pointing at a route that doesn't exist *(FIXED 2026-09-15 — see Fix log)*
- `requestPasswordReset` (`auth.ts:39`) redirects to `/reset-password` — but the app has **no routes at all** (`BrowserRouter` wraps the app, yet zero `Route` definitions; `App.tsx` just swaps `LoginPage`/`AdminHome`). A reset email would land on a URL the app doesn't handle.
- The login page has no "Forgot password?" link, so the flow is unreachable anyway.
- **Fix:** either wire the route + a reset page, or delete the dead function. (Admin currently can't recover a forgotten password at all.)

### 🟡 V6 — Dead code (same pattern as the other two repos) *(FIXED 2026-09-15 — see Fix log)*
| Item | Where | Note |
|---|---|---|
| `getAllOrders()` | `api.ts:227` | Built for a platform-wide orders monitor — never called |
| `geo.ts` (all of it) | `src/lib/geo.ts` | `calculateDistanceKm`, `NEARBY_RADIUS_KM`, `getCurrentLocation` — zero usages (customer-app copy) |
| `requestPasswordReset` | `auth.ts:39` | See V5 |

### 🟡 V7 — Rough edges *(FIXED 2026-09-15 except where noted — see Fix log)*
- `build` script is `vite build` only — no `tsc`, so type errors never fail a build (same as customer app).
- OverviewTab: revenue renders `GHS ${todaysRevenue}` raw (float artifacts possible: `GHS 123.45000000004`); no realtime (OrdersTab has it, Overview doesn't — numbers go stale until remount).
- `Sidebar` labels the shop "VENDOR" and the login page says "Waakye Plug Admin" — it's one app wearing two names.
- `Order.payment_method: 'cash' | 'momo'` — momo flow exists here but no payment integration is wired in any app yet (Paystack is rider-settlements only).
- RidersTab loads once on mount, no realtime — a rider applying while the tab is open stays invisible until refresh.
- Junk commit messages ("done", "send") across all three repos — hurts traceability.

---

## 5. The full-system picture (all three apps audited)

| # | Issue | Apps affected | Severity |
|---|---|---|---|
| S3+V1 | Unauthenticated edge functions (`add-rider` mints accounts; `decline-rider` deletes them) | rider + vendor | 🔴 launch-blocking |
| V2 | RLS unverified — anon-key write access to everything hinges on it | all | 🔴 verify ASAP |
| S1/S2 | Rider PIN brute-force + weak reset | rider | 🔴 |
| P1+V3 | Status lifecycle mismatch (ghost statuses `accepted`/`preparing`/`pending`) | all 3 | 🟠 user-facing |
| P2 | Dual order history (localStorage vs Supabase) | customer | 🟠 |
| V4 | Rider removal destroys commission debt | vendor | 🟠 |
| P4 | Opening-hours contradiction | customer | 🟡 business decision |
| P3 | Breakfast flow disabled | customer | 🟡 scope decision |
| — | Dead code in all 3 repos; no tsc in builds; junk commits | all 3 | 🟡 |

## 6. Recommended fix order (whole system)
1. **S3+V1** — auth on `add-rider` + `decline-rider` edge functions (one work item). *(DONE — deployed + verified live)*
2. **V2** — pull the DB schema + RLS policies, verify/lock down, commit as migrations. *(DONE — RLS lockdown applied live + verified)*
3. **S1/S2** — rider PIN auth hardening. *(DONE — `rider-login` + hardened `reset-pin` deployed + live lockout verified; see rider doc §6)*
4. **P1+V3** — canonical status enum, fix customer tracker. *(DONE 2026-09-12 — canonical-status migration applied live; customer tracker rebuilt with friendly labels)*
5. **P2, V4, V5** — then polish items. *(ALL DONE — P2 single order history + V4 commission guard 2026-09-13; V5 password recovery wired 2026-09-15)*

## 7. Pending
- [x] Get DB schema + RLS policies from the Supabase project (not in any repo). *(done — dumps in `Waakye-Plug2/schema/`)*
- [x] Confirm with Lumora: intended rider self-approval flow; whether vendor-accept step should exist. *(resolved 2026-09-12 — anonymous applications now create dormant riders pending admin approval via `approve-rider`; no vendor-accept step, canonical status lifecycle in place)*
- [ ] Confirm with Lumora: breakfast scope (P3) + opening hours (P4). *(still open)*
- [x] Wire or remove password reset (V5). *(DONE 2026-09-15 — wired, see fix log)*

---

### 2026-09-12 — S1/S2 (rider PIN hardening) — DEPLOYED + VERIFIED LIVE ✅ (cross-ref)
- Landed in the rider repo, but noted here because the rate-limit migration (`Waakye-Plug2/schema/migrations/2026-09-12_pin_rate_limits.sql`) lives in this schema home.
- `rider-login` edge function (server-side PIN verification + per-phone 5/15min and per-IP 20/15min lockouts) and hardened `reset-pin` (3/hr per phone, weak-PIN rejection) — both deployed v2, live lockout empirically verified (5th wrong PIN → 429, `retry_after_sec: 900`).
- Full details + test evidence: `../Waakye-plug-rider/RIDER_AUDIT.md` §6.

### 2026-09-12 — RLS LOCKDOWN APPLIED TO LIVE DB ✅ (V2 CLOSED)
- `Waakye-Plug2/schema/migrations/2026-09-12_rls_lockdown.sql` (rev 2) applied to production via Management API SQL endpoint (token from Windows Credential Manager).
- Closed: profiles role self-promotion, riders self-approval + commission wipe, customer order UPDATE, fully-public gamification tables (RLS was disabled on player_stats/spin_history).
- Column-grant model: authenticated UPDATE grants = profiles(full_name,phone), riders(is_online), orders(rider_id,status) — everything else revoked. Two orders triggers made SECURITY DEFINER (pre-flight catch: non-definer triggers would've been blocked by the new grants, silently killing commission math).
- Post-flight: RLS=true on ALL 10 tables; anonymous attack tests all blocked (42501); legit public reads still work. Full dump + smoke test saved in Waakye-Plug2/schema/.
- Legacy customers UPDATE-self policy superseded by rev2 column-grant model.
- Admin panel keeps working because supabase-js sends the logged-in admin JWT, and admin policies (`is_admin()`) cover all admin writes; rider approve/decline go through the deployed service-role edge functions.

### 2026-09-09 — V1 CLOSED (edge function auth) ✅
- `add-rider`, `decline-rider` (rider repo) rewritten with a shared `requireAdmin` check: verifies the caller's JWT via `auth.getUser(token)` and confirms `profiles.role === 'admin'` before any service-role action. Anonymous calls → 401/403.
- Anonymous `add-rider` callers now create **pending** riders (`is_approved: false`, `status: 'pending'`) that cannot log in (blocked in `riderAuth.js`) until approved. Admin callers (valid admin JWT) still get instantly-approved riders for in-person onboarding.
- New **`approve-rider`** edge function (admin-gated) replaces the admin panel's raw anon-key `update is_approved = true` write — `api.ts` now calls it with the admin session token and requires an active session.
- `declineRiderApplication` no longer falls back to the anon key; requires a signed-in admin session.
- Rider app success copy updated: applications are now correctly described as pending review.
- Verified: `tsc --noEmit` on the vendor app passes (exit 0). ~~Deployment pending~~ — **STALE as of 2026-09-15**: all three functions were deployed 2026-09-12 (add-rider v7 / decline-rider v2 / approve-rider v1, live on verncapitxzsgcughvil; anon approve/decline → 401, anon add-rider → dormant application). V1 fully closed, nothing pending.

### 2026-09-09 — V2 IN PROGRESS (schema + RLS lockdown)
- Read-only inspection script written: `Waakye-Plug2/supabase-inspect.sql` (10 catalog queries: tables, columns, RLS policies, grants, SECURITY DEFINER functions, triggers, enums, views, realtime publications, row counts). Handed to Morrison to run in the Supabase SQL Editor — output will drive the actual migration.
- Lockdown migration to be written from that output — marked **DRAFT** until real schema is in hand.

### 2026-09-15 — V5 CLOSED (admin password recovery wired) ✅
- `LoginPage.tsx` rebuilt: "Forgot password?" link under the sign-in button → inline reset form (email → `requestPasswordReset`) → green confirmation card with instructions. State lives on the login page (`resetMode`/`resetSent`) — no router needed.
- `auth.ts requestPasswordReset` redirectTo fixed: was `${origin}/reset-password` (a route this app has never had) → now `window.location.origin`. The recovery email's link carries the session; landing on the app root restores the admin via `AuthContext.onAuthStateChange → applySessionIfAdmin`, and the admin finishes with Settings → Change password (that form already existed).
- Ops note: the email goes out from Supabase Auth's default sender — verify/reset emails are enabled by default. If nothing arrives, check Supabase → Auth → Email templates / SMTP.

### 2026-09-15 — V6 CLOSED (dead code removed) ✅
- `getAllOrders()` deleted from `api.ts` (platform-wide monitor, never called).
- `src/lib/geo.ts` deleted (all of it — `calculateDistanceKm`, `NEARBY_RADIUS_KM`, `getCurrentLocation`; zero usages; SettingsTab has its own geolocation code).
- `requestPasswordReset` was NOT deleted — it got wired instead (V5 above).

### 2026-09-15 — V7 CLOSED (rough edges) ✅
- **Build gate:** `package.json` build script now `tsc && vite build` — type errors fail the build. Verified: `tsc --noEmit` exit 0 with all today's changes.
- **OverviewTab:** money now `GHS ${todaysRevenue.toFixed(2)}` (no float artifacts); added the same realtime `postgres_changes` subscription OrdersTab uses (channel `vendor-overview-${vendor.id}`, proper `removeChannel` cleanup) — stats stay live while the tab is open.
- **Sidebar naming:** "VENDOR" label → "ADMIN" (matches what the app is; login page already said Admin).
- **Ghost statuses:** `Order['status']` narrowed to the canonical DB enum (`available | rider_assigned | picked_up | delivered | cancelled`) — `pending`/`ready` removed from the type, `STATUS_LABEL`/`statusStyle` maps, and OrdersTab's claimable check. Nothing writes those statuses since the 2026-09-12 canonical-status migration; keeping them invited type-unsafe ghost handling.
- **Left as-is (deliberate):** momo in `payment_method` (Paystack is rider-settlements only by design); junk commit messages (historical; write better messages going forward).

### 2026-09-15 — PRODUCTION BUILD VERIFIED ✅
- `tsc && vite build` → exit 0, 1659 modules, 22.09s → `dist/assets/index-JtAzYlkH.js` (446.89 kB) + `index-Bl6h3Txw.css` (27.46 kB). All V5/V6/V7 changes in the bundle. **Vendor/admin panel is ready to push/deploy.**

### 2026-09-15 — STATUS CORRECTION: V1 deployed since 2026-09-12; fix-order list reconciled ✅
- The 2026-09-09 V1 entry still read "Deployment pending (needs `supabase functions deploy` + Supabase login)" — stale. add-rider/decline-rider/approve-rider have been live since the 2026-09-12 deploy (add-rider v7 / decline-rider v2 / approve-rider v1; anon approve/decline → 401, anon add-rider → dormant application that can't log in). No pending deployment anywhere in the vendor app.
- §6 fix-order items 4–5 and the §7 Lumora item updated to match reality: P1+V3 closed 2026-09-12, P2+V4 closed 2026-09-13, V5 closed 2026-09-15. Only genuinely open Lumora decisions left: P3 breakfast scope, P4 opening hours.
