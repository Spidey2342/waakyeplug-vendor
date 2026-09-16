# Admin Panel — Operations

## Vendor onboarding

1. Admin Home → Add vendor (`OnboardingPage`)
2. Fill business details → `createVendor` (`owner_id: null`)
3. Open Dashboard → **Menu** to add items + photos
4. **Settings**: set precise GPS (helps rider navigation), shop photo, open/closed
5. Customer app only lists **approved** vendors within **6 km**

Vendors do **not** receive login credentials from this flow.

## Order monitoring

- Per-vendor **Orders** tab is realtime
- Cancel sets canonical status `cancelled`
- Overview revenue uses the same realtime channel pattern
- Status lifecycle (written across apps):  
  `available → rider_assigned → picked_up → delivered | cancelled`

There is no separate “vendor accept / preparing” step in the canonical enum.

## Rider applications

1. Rider self-applies in rider app → pending (`is_approved: false`)
2. Admin opens **Riders** tab → Approve or Decline
3. Approve calls `approve-rider` → rider can log in
4. Decline/remove calls `decline-rider`
   - UI + edge refuse if **`commission_owed > 0`** (HTTP 409)
   - Settle commission in the rider app (Paystack) before removal

**Gap:** RidersTab does not subscribe to realtime — refresh to see new applicants.

## Commission & settlement (ops view)

- Accrual: DB trigger on delivery, **10% of delivery_fee**
- Rider lockout after **Africa/Accra noon** if still owing (enforced in rider app)
- Admin can see owed amounts on RidersTab but settlement checkout is rider-side

## Money constants (customer cart)

| Fee | Amount |
|---|---|
| Delivery | 8 GHS |
| Service | 1 GHS |
| Payment methods on orders | `cash` \| `momo` (momo collection not integrated yet) |

## Support contacts referenced elsewhere

- Customer ClosedScreen WhatsApp group: `https://chat.whatsapp.com/HM1OVHvnfZr0l1WPhJPRDg`
- Rider Chat Support number: `233599995651` (TODO confirm) in rider ActiveOrderScreen

## Open product decisions (Lumora)

Tracked in audits; still open as of inventory date:

- Customer breakfast flow (P3)
- Opening hours contradiction (P4) — copy says 5:30–8:00 AM; `timeUtils` currently effectively always open (`0` … `23:59`)

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [FEATURES.md](FEATURES.md)
- [SETUP.md](SETUP.md)
- [../VENDOR_AUDIT.md](../VENDOR_AUDIT.md)
