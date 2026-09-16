# Admin Panel — Architecture

## What this app is

Despite the GitHub name `waakyeplug-vendor`, this codebase is the **Waakye Plug Admin panel**:

- Single admin login (email/password; account provisioned in Supabase Auth + `profiles.role = 'admin'`)
- Platform-wide vendor management
- Platform-wide rider application management
- Per-vendor operational dashboard (orders, menu, settings, overview)

**Vendors never log in.** `createVendor` always sets `owner_id: null`. All shop data is admin-managed.

## App shell

```
main.tsx
  BrowserRouter
    ToastProvider
      AuthProvider
        App.tsx → LoginPage | AdminHome
```

`App.tsx` swaps on auth only — no `Route` components. Password recovery redirects to site origin; recovery session is picked up by `AuthContext`, then password is changed in **Settings**.

### Auth gate (`AuthContext.tsx`)

Every session path (fresh login, restored session, `onAuthStateChange`) goes through `applySessionIfAdmin`:

- Load profile
- If `role !== 'admin'` → sign out and clear user
- Non-admin accounts cannot linger in a half-logged-in state

This is the strongest auth UX of the three apps.

## Top-level navigation (`AdminHome.tsx`)

| View | Purpose |
|---|---|
| Vendors list | All vendors; open selected → `Dashboard` |
| Add vendor | `OnboardingPage` |
| Riders | `RidersTab` (platform-wide) |

### Per-vendor `Dashboard.tsx` tabs

| Tab | Component | Notes |
|---|---|---|
| Overview | `OverviewTab` | Today stats + realtime `postgres_changes` |
| Orders | `OrdersTab` | Live orders; cancel → `cancelled` |
| Menu | `MenuTab` | CRUD + image upload to `menu-images` |
| Settings | `SettingsTab` | Shop details, GPS, admin password change |
| (Sidebar also) | — | Mobile-friendly `Sidebar.tsx` |

## Data layer

- `src/lib/supabase.ts` — anon client
- `src/lib/auth.ts` — login/logout/profile/password reset/update
- `src/lib/api.ts` — vendors, menu, orders, riders, storage uploads

Rider approve/decline do **not** patch `riders` directly with the anon key for privileged fields; they call edge functions on the shared project (implemented in the rider repo):

- `approve-rider`
- `decline-rider` (409 if commission owed)

## Shared platform contracts

- Supabase project `verncapitxzsgcughvil`
- Order statuses: `available | rider_assigned | picked_up | delivered | cancelled`
- Commission math lives in DB (`apply_commission_on_delivery`), displayed here as `riders.commission_owed`
- Customer fees: delivery **8**, service **1** GHS
- Rider settlement lock: Accra noon (rider app)

## Storage

Bucket **`menu-images`**:

- Menu item photos: path scoped by `vendorId`
- Vendor logo / shop photo: separate path prefix, same bucket

Public URLs returned via `getPublicUrl` after upload.

## Security posture (post-audit)

- Admin role gate on every session restore
- RLS lockdown applied on shared DB (migrations in customer repo)
- Rider mint/delete gated on admin JWT edge functions
- Decline blocked while commission outstanding (edge + UI)

Open: RidersTab polling-only; momo payment collection not implemented end-to-end.
