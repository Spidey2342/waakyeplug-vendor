# Admin Panel — Features (exhaustive inventory)

Every page, tab, context, component, and `src/lib` export. No invented features.

## Pages (`src/pages/`)

### `LoginPage.tsx`
- Email + password admin login via `AuthContext.login`
- **Forgot password** → `resetMode` collects email → `requestPasswordReset`
- Recovery link lands on app origin; admin then changes password in Settings
- Toast errors for bad credentials / unconfirmed email / non-admin

### `AdminHome.tsx`
- Top toggle: **Vendors** | **Riders**
- Vendors: list cards, open → `Dashboard`, add → `OnboardingPage`
- Riders: renders `RidersTab`

### `OnboardingPage.tsx`
- Create vendor form → `createVendor` (`owner_id: null`)
- On success: parent selects the new vendor dashboard

### `Dashboard.tsx`
- Shell for a single vendor with tab state + `Sidebar`
- Tabs: Overview, Orders, Menu, Settings (+ Riders is top-level, not per-vendor)

### Tabs (`src/pages/tabs/`)

#### `OverviewTab.tsx`
- Today's order stats / revenue for the vendor
- Money formatted `GHS ${n.toFixed(2)}`
- Realtime `postgres_changes` on orders (channel `vendor-overview-${vendor.id}`) with cleanup

#### `OrdersTab.tsx`
- Lists vendor orders; realtime subscription with channel cleanup
- Admin can **cancel** → `cancelOrder` sets `status: 'cancelled'`
- Shows payment_method `cash` | `momo` (display only; no momo capture here)

#### `MenuTab.tsx`
- CRUD menu items (`getMenuItems`, `addMenuItem`, `addMenuItems`, `updateMenuItem`, `deleteMenuItem`)
- Categories align with customer builder (Size / Protein / Extra / Drink, etc.)
- `pricing_type: 'fixed' | 'variable'`
- Image upload via `uploadMenuItemImage` → Storage `menu-images`
- Quick-add batch rows UX (auto-advance categories)

#### `SettingsTab.tsx`
- Edit vendor fields (`updateVendor`): name, phone, location, open/closed, lat/lng
- “Use my current location” GPS helper for precise coordinates (helps rider maps)
- Logo upload `uploadVendorLogo`
- **Change admin password** (`updatePassword`) — used after recovery email

#### `RidersTab.tsx`
- Loads **all** riders once on mount via `getAllRiders` — **no realtime** (open gap)
- Splits pending (`!is_approved`) vs active (`is_approved`)
- Approve → `approveRiderApplication` → edge `approve-rider`
- Decline/remove → `declineRiderApplication` → edge `decline-rider`
- UI blocks remove when `commission_owed > 0` (mirrors edge **409**)
- Detail sheet shows commission owed, Ghana Card, transport, emergency contacts, deposit, etc.

## Components

### `src/components/Sidebar.tsx`
- Dashboard sidebar / mobile nav for tab switching; shows shop name

## Contexts

### `src/context/AuthContext.tsx`
- `user`, `loading`, `login`, `logout`, `refreshProfile`
- `applySessionIfAdmin` on all session paths

### `src/context/ToastContext.tsx`
- App-wide toasts (`useToast`) — preferred over `alert()`

## Libraries (`src/lib/`)

### `supabase.ts`
- Browser client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

### `auth.ts`
| Export | Purpose |
|---|---|
| `Profile` type | id, full_name, phone, email, role, created_at |
| `loginAdmin` | `signInWithPassword` |
| `logout` | `signOut` |
| `getCurrentProfile` | profiles row for current user |
| `requestPasswordReset` | `resetPasswordForEmail` → redirect site origin |
| `updatePassword` | `updateUser({ password })` |

### `api.ts` types
| Type | Highlights |
|---|---|
| `Vendor` | includes `owner_id: string \| null`, location, lat/lng, status/open flags |
| `MenuItem` | name, price, category, pricing_type, image_url, is_available |
| `Order` | items, totals, `payment_method: 'cash' \| 'momo'`, status, timestamps |
| `Rider` | is_approved, commission_owed, transport, Ghana Card, deposit, nested `profiles` |

### `api.ts` functions
| Function | Behavior |
|---|---|
| `getAllVendors` | List vendors |
| `getVendorById` | Single vendor |
| `createVendor` | Insert with **`owner_id: null`** |
| `updateVendor` | Patch shop fields |
| `getMenuItems` | Menu for vendor |
| `addMenuItem` / `addMenuItems` | Create one / batch |
| `updateMenuItem` | Patch fields incl. availability/image |
| `deleteMenuItem` | Delete |
| `uploadMenuItemImage` | Storage `menu-images` |
| `uploadVendorLogo` | Storage `menu-images` (logo path) |
| `getVendorOrders` | Orders for vendor |
| `cancelOrder` | Set `cancelled` |
| `getAllRiders` | All riders + profile join |
| `approveRiderApplication` | Invoke approve-rider edge |
| `declineRiderApplication` | Invoke decline-rider edge |

## App entry

| File | Role |
|---|---|
| `src/App.tsx` | Auth gate → LoginPage or AdminHome |
| `src/main.tsx` | Providers + BrowserRouter |
| `src/index.css` | Styles |
| `src/vite-env.d.ts` | Vite types |

## Edge functions used (defined in rider repo)

| Function | From this app |
|---|---|
| `approve-rider` | RidersTab approve |
| `decline-rider` | RidersTab decline/remove (**409** if commission owed) |

Admin JWT from the logged-in session is sent as `Authorization: Bearer <access_token>`.

## Constants & live URLs

| Item | Value |
|---|---|
| Live | https://waakyeplug-vendor.vercel.app |
| Delivery / service | 8 / 1 GHS |
| Commission | 10% of delivery fee |
| Status enum | available → rider_assigned → picked_up → delivered \| cancelled |
| Storage | `menu-images` |
| WhatsApp (customer closed screen) | group `https://chat.whatsapp.com/HM1OVHvnfZr0l1WPhJPRDg` |
| Rider support WhatsApp | 233599995651 TODO (rider app) |
| PR #1 | rider accept+Accra lock (sibling repo) |

## Known open gaps (admin)

1. **RidersTab no realtime** — refresh required to see new applications
2. **momo type unused for collection** — display/schema only; Paystack is rider-settlements only
3. Lumora decisions on customer breakfast (P3) / hours (P4) still open (affects ops copy, not this UI directly)
4. Not a vendor login portal — do not onboard vendors with credentials here
