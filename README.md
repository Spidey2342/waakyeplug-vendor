# Waakye Plug — Admin Panel (`waakyeplug-vendor`)

**This is the platform Admin dashboard — not a vendor self-serve login portal.**

Admins manage all vendors (create/edit/open-close/GPS/menu/photos) and all riders (approve/decline/remove, view commission owed). Vendors themselves **never log in**; `createVendor` inserts `owner_id: null`.

**Live:** https://waakyeplug-vendor.vercel.app  
**Repo:** [Spidey2342/waakyeplug-vendor](https://github.com/Spidey2342/waakyeplug-vendor)  
**Shared Supabase:** `verncapitxzsgcughvil`

## Platform siblings

| App | Repo | Live |
|---|---|---|
| Customer | [Spidey2342/Waakye-Plug2](https://github.com/Spidey2342/Waakye-Plug2) | https://waakye-plug2.vercel.app |
| Rider | [Spidey2342/Waakye-plug-rider](https://github.com/Spidey2342/Waakye-plug-rider) | https://waakye-plug-rider.vercel.app |
| **Admin (this repo)** | Spidey2342/waakyeplug-vendor | https://waakyeplug-vendor.vercel.app |

## Stack

- Vite 6 + React 18 + TypeScript
- Tailwind 4
- react-router-dom (BrowserRouter wrapper; app uses view state, not route tables)
- Supabase Auth + Postgres + Realtime + Storage (`menu-images` bucket)
- Calls rider-repo edge functions for approve/decline rider

## Quick start

See **[docs/SETUP.md](docs/SETUP.md)**.

```bash
npm install
# .env: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Build: `npm run build` → `tsc && vite build` (verified 2026-09-15).

## Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Admin-only design, auth gate, data model |
| [docs/FEATURES.md](docs/FEATURES.md) | Every page, tab, lib, and API function |
| [docs/SETUP.md](docs/SETUP.md) | Env, admin account bootstrap, storage |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Vendor onboarding, rider approvals, cancellations |
| [docs/VENDOR_ORDERING_HOURS.md](docs/VENDOR_ORDERING_HOURS.md) | **Ordering hours UI + DB columns** (team rollout) |
| [VENDOR_AUDIT.md](VENDOR_AUDIT.md) | Security/bug audit + fix log (keep) |

## Platform constants

| Constant | Value |
|---|---|
| Delivery fee | 8 GHS |
| Service fee | 1 GHS |
| Commission | 10% of delivery fee (DB trigger; shown as `commission_owed` on riders) |
| Accra noon lock | Rider app settlement lock (Africa/Accra 12:00) |
| Max distance | 6 km (customer vendor filter) |
| Status enum | `available` → `rider_assigned` → `picked_up` → `delivered` \| `cancelled` |
| Storage bucket | `menu-images` (menu photos + vendor logos) |
| PR #1 (rider) | accept `status=available` + Accra lock (merged on rider repo) |

## Known open gaps

- **RidersTab has no realtime** — new applications while the tab is open require a refresh
- `payment_method: 'cash' | 'momo'` — momo type exists; **no customer Paystack/momo integration wired** (Paystack is rider settlements only)
- Customer **breakfast (P3)** still “coming soon”; vendor **daily hours** are configured here — see [docs/VENDOR_ORDERING_HOURS.md](docs/VENDOR_ORDERING_HOURS.md)
- Admin accounts are created manually in Supabase (no self-registration)

## Important

Do not describe this app as a “vendor portal.” Vendors do not authenticate here.
