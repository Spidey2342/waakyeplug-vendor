# Admin Panel — Setup

## Prerequisites

- Node.js 20+
- npm
- Supabase project access (`verncapitxzsgcughvil`)
- One admin Auth user whose `profiles.role = 'admin'`

## Install

```bash
git clone https://github.com/Spidey2342/waakyeplug-vendor.git
cd waakyeplug-vendor
npm install
```

## Environment

`.env` (gitignored):

```bash
VITE_SUPABASE_URL=https://verncapitxzsgcughvil.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

No Paystack public key required in this app (settlements happen in the rider app).

## Bootstrap the admin account

There is **no self-registration** in the UI.

1. Create a user in Supabase Auth (email/password)
2. Ensure `profiles` row exists with `role = 'admin'` (service role / SQL)
3. Sign in at https://waakyeplug-vendor.vercel.app (or local `npm run dev`)

Non-admin profiles are signed out immediately by `AuthContext`.

## Storage

Ensure bucket **`menu-images`** exists and is readable for public menu URLs (as used by `uploadMenuItemImage` / `uploadVendorLogo`). Policies should allow authenticated admin uploads per live RLS.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev |
| `npm run build` | `tsc && vite build` |
| `npm run preview` | Preview dist |

Build verified 2026-09-15.

## Deploy

- Vercel → this repo; set `VITE_SUPABASE_*`
- Live: https://waakyeplug-vendor.vercel.app
- Edge functions for rider approve/decline must already be deployed from the rider repo

## Password recovery

1. Login page → Forgot password → email link
2. Supabase Site URL must point at this app origin
3. Link restores admin session → change password under vendor **Settings** tab

## Related schema

Migrations / RLS live in **Waakye-Plug2** `schema/migrations/`. This repo does not ship SQL.
