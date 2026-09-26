# Admin: vendor ordering hours (Sep 2026)

This admin app (`waakyeplug-vendor`) now configures **when each shop accepts orders** on the customer app.

## What admins do

1. **New vendor** — **Add Vendor** form includes **Ordering hours** (default **7:00 AM – 8:00 PM** Ghana local).
2. **Existing vendor** — **Dashboard → Settings → Ordering hours** — set **Opens** / **Closes** and **Save ordering hours**.
3. **Shop status toggle** — **Open / Closed** manual override (e.g. kitchen paused during scheduled hours).

The Settings page shows whether the shop is **accepting orders right now** (hours + toggle + customer platform 9 PM rule).

## Database

Columns on `public.vendors`:

- `daily_opens_at` (`time`)
- `daily_closes_at` (`time`)

Migration lives in the **customer/schema repo**:  
[Waakye-Plug2 `schema/migrations/2026-09-26_vendor_daily_hours.sql`](https://github.com/Spidey2342/Waakye-Plug2/blob/main/schema/migrations/2026-09-26_vendor_daily_hours.sql)

Apply that SQL on Supabase **before** expecting hours to save or the customer app to show vendors open.

## Code touched in this repo

- `src/lib/vendorHours.ts` — hour parsing and “accepting orders now”
- `src/lib/api.ts` — create/update vendor with hours
- `src/pages/tabs/SettingsTab.tsx` — ordering hours UI
- `src/pages/OnboardingPage.tsx` — hours on create

Full cross-app write-up: customer repo **`docs/VENDOR_ORDERING_HOURS.md`**.
