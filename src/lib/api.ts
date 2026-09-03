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
  created_at: string;
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  category: 'base' | 'protein' | 'extra' | 'drink' | 'breakfast_item' | 'combo';
  name: string;
  description: string | null;
  price: number; // exact price if pricing_type is 'fixed', minimum price if 'variable'
  pricing_type: 'fixed' | 'variable';
  image_url: string | null;
  is_available: boolean;
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
  status: 'pending' | 'available' | 'ready' | 'rider_assigned' | 'picked_up' | 'delivered' | 'cancelled';
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
  businessName, description, location, phone, supportsBuild,
}: { businessName: string; description: string; location: string; phone: string; supportsBuild: boolean }) {
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
    })
    .select()
    .single();

  if (error) throw error;
  return data as Vendor;
}

export async function updateVendor(
  vendorId: string,
  updates: Partial<Pick<Vendor, 'business_name' | 'description' | 'location' | 'phone' | 'is_open' | 'latitude' | 'longitude' | 'logo_url' | 'supports_build'>>
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
  vendorId, category, name, description, price, pricingType, imageUrl,
}: { vendorId: string; category: string; name: string; description?: string | null; price: number; pricingType: 'fixed' | 'variable'; imageUrl?: string | null }) {
  const { data, error } = await supabase
    .from('vendor_menu_items')
    .insert({ vendor_id: vendorId, category, name, description: description ?? null, price, pricing_type: pricingType, image_url: imageUrl ?? null })
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

export async function updateMenuItem(id: string, updates: Partial<Pick<MenuItem, 'name' | 'description' | 'price' | 'is_available' | 'pricing_type' | 'image_url'>>) {
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

// Global, across every vendor — this is your monitoring view, not a
// per-vendor kitchen queue.
export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles!orders_customer_id_fkey(full_name, phone), vendors(business_name), riders(profiles(full_name, phone))')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as unknown as Order[];
}

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

export async function cancelOrder(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

/* RIDERS ------------------------------------------------------------ */

// Platform-wide — every rider, not scoped to a vendor. Includes pending
// applications (is_approved: false) alongside active ones — the UI splits
// them into two sections.
export async function getAllRiders(): Promise<Rider[]> {
  const { data, error } = await supabase
    .from('riders')
    .select(
      'id, profile_id, is_online, is_approved, commission_owed, transport_type, photo_url, ghana_card_number, home_area, emergency_contact_name, emergency_contact_phone, deposit_amount, created_at, profiles(full_name, phone)'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as Rider[];
}

export async function approveRiderApplication(riderId: string) {
  const { data, error } = await supabase
    .from('riders')
    .update({ is_approved: true })
    .eq('id', riderId)
    .select()
    .single();

  if (error) throw error;
  return data as Rider;
}

// Declining removes the application entirely. Their login account still
// technically exists in Supabase Auth, but with no matching riders row
// they can never successfully log in — good enough for now without
// needing a separate admin-privileged account-deletion function.
export async function declineRiderApplication(riderId: string) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decline-rider`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ rider_id: riderId }),
    }
  );

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Could not decline this application');
}