import { supabase } from './supabase';

export type Vendor = {
  id: string;
  owner_id: string | null;
  business_name: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  status: 'pending' | 'approved' | 'suspended';
  added_by_admin: boolean;
  is_open: boolean;
  logo_url: string | null;
  supports_build: boolean;
  daily_opens_at: string | null;
  daily_closes_at: string | null;
  created_at: string;
};

// Everything that comes inside a Waakye pack — the vendor ticks which of
// their Extras a served pack includes, and this is what customers see when
// they open the pack.
export type MenuItemIncluded = {
  id: string;
  name: string;
  quantity: number;
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  category: 'base' | 'protein' | 'extra' | 'drink' | 'breakfast_item' | 'combo' | 'waakye';
  name: string;
  description: string | null;
  price: number; // exact price if pricing_type is 'fixed', minimum price if 'variable'
  pricing_type: 'fixed' | 'variable';
  image_url: string | null;
  is_available: boolean;
  /** Composed contents of a Waakye pack (category 'waakye'). Empty for all other categories. */
  included_items?: MenuItemIncluded[] | null;
};

export type Order = {
  id: string;
  customer_id: string;
  vendor_id: string;
  rider_id: string | null;
  items: any;
  total_amount: number;
  delivery_address: string;
  payment_method: 'cash' | 'momo';
  status: 'available' | 'rider_assigned' | 'picked_up' | 'delivered' | 'cancelled';
  created_at: string;
  profiles?: { full_name: string; phone: string | null };
  vendors?: { business_name: string };
  riders?: { profiles?: { full_name: string; phone: string | null } };
};

export type Rider = {
  id: string;
  profile_id: string;
  is_online: boolean;
  is_approved: boolean;
  commission_owed: number;
  transport_type: string | null;
  photo_url: string | null;
  ghana_card_number: string | null;
  ghana_card_front_url: string | null;
  ghana_card_back_url: string | null;
  home_area: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  deposit_amount: number | null;
  created_at: string;
  profiles?: { full_name: string; phone: string | null };
};

/* VENDOR PROFILE ------------------------------------------------- */

// Admin-facing: every vendor on the platform, not scoped to any one login —
// since only you ever manage vendors, there's no "my vendor" concept here.
export async function getAllVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('business_name', { ascending: true });

  if (error) throw error;
  return data as Vendor[];
}

export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle();

  if (error) throw error;
  return data as Vendor | null;
}

// You're the only one who ever creates a vendor, so it's immediately
// approved AND open — a vendor should never sit invisible/unorderable
// just because someone forgot to flip a toggle after adding it.
export async function createVendor({
  businessName,
  description,
  location,
  phone,
  supportsBuild,
  dailyOpensAt,
  dailyClosesAt,
}: {
  businessName: string;
  description: string;
  location: string;
  phone: string;
  supportsBuild: boolean;
  dailyOpensAt: string;
  dailyClosesAt: string;
}) {
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      owner_id: null,
      business_name: businessName,
      description,
      location,
      phone,
      status: 'approved',
      added_by_admin: true,
      supports_build: supportsBuild,
      is_open: true,
      daily_opens_at: dailyOpensAt,
      daily_closes_at: dailyClosesAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function updateVendor(
  vendorId: string,
  updates: Partial<
    Pick<
      Vendor,
      | 'business_name'
      | 'description'
      | 'location'
      | 'phone'
      | 'is_open'
      | 'latitude'
      | 'longitude'
      | 'logo_url'
      | 'supports_build'
      | 'daily_opens_at'
      | 'daily_closes_at'
      | 'status'
    >
  >
) {
  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', vendorId)
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

/** Removes all menu rows for a vendor (always safe before removing the shop). */
export async function deleteVendorMenuItems(vendorId: string) {
  const { error } = await supabase.from('vendor_menu_items').delete().eq('vendor_id', vendorId);
  if (error) throw error;
}

export type DeleteVendorResult = { outcome: 'deleted' } | { outcome: 'archived'; message: string };

const ARCHIVED_VENDOR_MESSAGE =
  'Vendor removed from the platform. Their menu is cleared; past orders stay in History.';

function isForeignKeyDeleteError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '23503'
    || /foreign key|violates.*constraint|referenced/i.test(error.message ?? '')
  );
}

async function archiveVendorRecord(vendorId: string): Promise<DeleteVendorResult> {
  const updated = await updateVendor(vendorId, { status: 'suspended', is_open: false });
  if (updated.status !== 'suspended') {
    throw new Error('Could not remove this vendor from the platform.');
  }
  return { outcome: 'archived', message: ARCHIVED_VENDOR_MESSAGE };
}

async function deleteVendorDirect(vendorId: string): Promise<DeleteVendorResult> {
  await deleteVendorMenuItems(vendorId);

  const { data: deletedRows, error: vendorDeleteError } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)
    .select('id');

  if (vendorDeleteError) {
    if (isForeignKeyDeleteError(vendorDeleteError)) return archiveVendorRecord(vendorId);
    throw vendorDeleteError;
  }

  if (deletedRows && deletedRows.length > 0) {
    const stillThere = await getVendorById(vendorId);
    if (!stillThere) return { outcome: 'deleted' };
  }

  const existing = await getVendorById(vendorId);
  if (!existing) return { outcome: 'deleted' };

  // RLS often returns success with zero rows — fall back to archive so the shop disappears from the app.
  return archiveVendorRecord(vendorId);
}

/** Optional edge path when `delete-vendor` is deployed on the Supabase project. */
async function tryDeleteVendorEdge(vendorId: string, accessToken: string): Promise<DeleteVendorResult | null> {
  try {
    const edgeRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-vendor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vendor_id: vendorId }),
      }
    );

    if (edgeRes.ok) {
      try {
        const body = await edgeRes.json();
        if (body?.outcome === 'archived') {
          return { outcome: 'archived', message: ARCHIVED_VENDOR_MESSAGE };
        }
      } catch {
        /* default to hard delete */
      }
      return { outcome: 'deleted' };
    }

    // Not deployed — use direct Supabase deletes below.
    if (edgeRes.status === 404 || edgeRes.status === 405 || edgeRes.status === 501) return null;

    let message = 'Could not delete this vendor.';
    try {
      const body = await edgeRes.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  } catch (err: unknown) {
    // Network/CORS (e.g. function not deployed) — don't surface "Failed to fetch".
    if (err instanceof Error && err.message !== 'Failed to fetch' && !err.message.includes('fetch')) {
      throw err;
    }
    return null;
  }
}

/**
 * Removes a vendor from the platform. Uses direct Supabase deletes by default;
 * if `delete-vendor` edge exists and succeeds, that path is used instead.
 */
export async function deleteVendor(vendorId: string): Promise<DeleteVendorResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in as admin to delete vendors');

  const edgeResult = await tryDeleteVendorEdge(vendorId, session.access_token);
  if (edgeResult) return edgeResult;

  return deleteVendorDirect(vendorId);
}

/* MENU ------------------------------------------------------------ */

export async function getMenuItems(vendorId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('vendor_menu_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('category', { ascending: true });

  if (error) throw error;
  return data as MenuItem[];
}

export async function addMenuItem({
  vendorId, category, name, description, price, pricingType, imageUrl, includedItems,
}: { vendorId: string; category: string; name: string; description?: string | null; price: number; pricingType: 'fixed' | 'variable'; imageUrl?: string | null; includedItems?: MenuItemIncluded[] }) {
  const { data, error } = await supabase
    .from('vendor_menu_items')
    .insert({ vendor_id: vendorId, category, name, description: description ?? null, price, pricing_type: pricingType, image_url: imageUrl ?? null, included_items: includedItems ?? [] })
    .select()
    .single();

  if (error) throw error;
  return data as MenuItem;
}

// Batch add for grouped categories (Size / Protein / Extra / Drink / Breakfast
// Item) — adding several proteins shouldn't mean submitting the form once per protein.
export async function addMenuItems(
  vendorId: string,
  category: string,
  rows: { name: string; description?: string | null; price: number }[]
) {
  const payload = rows.map((r) => ({
    vendor_id: vendorId,
    category,
    name: r.name,
    description: r.description ?? null,
    price: r.price,
    pricing_type: 'fixed' as const,
  }));

  const { data, error } = await supabase
    .from('vendor_menu_items')
    .insert(payload)
    .select();

  if (error) throw error;
  return data as MenuItem[];
}

export async function updateMenuItem(id: string, updates: Partial<Pick<MenuItem, 'name' | 'description' | 'price' | 'is_available' | 'pricing_type' | 'image_url' | 'included_items'>>) {
  const { data, error } = await supabase
    .from('vendor_menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as MenuItem;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from('vendor_menu_items').delete().eq('id', id);
  if (error) throw error;
}

/** Uploads a menu item photo to Supabase Storage and returns its public URL. */
export async function uploadMenuItemImage(vendorId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${vendorId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
  return data.publicUrl;
}

/** Uploads a vendor's shop photo — same bucket as menu items, separate path prefix. */
export async function uploadVendorLogo(vendorId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `vendor-logos/${vendorId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
  return data.publicUrl;
}

/* ORDERS ------------------------------------------------------------ */

// Scoped to one vendor — used inside that vendor's own Overview/Orders tabs.
export async function getVendorOrders(vendorId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles!orders_customer_id_fkey(full_name, phone), riders(profiles(full_name, phone))')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as Order[];
}

export async function cancelOrder(orderId: string, cancelReason: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in as admin to cancel orders');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ order_id: orderId, cancel_reason: cancelReason }),
    }
  );

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Could not cancel this order');
  return result.order as Order;
}

/* RIDERS ------------------------------------------------------------ */

// Platform-wide — every rider, not scoped to a vendor. Includes pending
// applications (is_approved: false) alongside active ones — the UI splits
// them into two sections.
export async function getAllRiders(): Promise<Rider[]> {
  const { data, error } = await supabase
    .from('riders')
    .select(
      'id, profile_id, is_online, is_approved, commission_owed, transport_type, photo_url, ghana_card_number, ghana_card_front_url, ghana_card_back_url, home_area, emergency_contact_name, emergency_contact_phone, deposit_amount, created_at, profiles(full_name, phone)'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as Rider[];
}

// Approving goes through the admin-verified approve-rider edge function.
// (The old direct anon-key update would be blocked by proper RLS — and
// before RLS lockdown it let anyone self-approve.)
export async function approveRiderApplication(riderId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in as admin to approve riders');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-rider`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ rider_id: riderId }),
    }
  );

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Could not approve this rider');
  return result.rider as Rider;
}

// Declining removes the application entirely (riders row, profile, and auth
// account) via the admin-verified decline-rider edge function. Never call
// this with the anon key — the function rejects it with 401.
export async function declineRiderApplication(riderId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in as admin to decline riders');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decline-rider`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ rider_id: riderId }),
    }
  );

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Could not decline this application');
}