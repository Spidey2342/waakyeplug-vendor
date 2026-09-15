import { useState, useEffect } from 'react';
import { ClipboardList, Banknote, Truck } from 'lucide-react';
import { getVendorOrders, type Vendor, type Order } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function OverviewTab({ vendor }: { vendor: Vendor }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getVendorOrders(vendor.id);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Same realtime feed as OrdersTab — numbers stay live while the tab
    // is open instead of going stale until the next remount.
    const channel = supabase
      .channel(`vendor-overview-${vendor.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendor.id]);

  const today = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const unclaimedCount = orders.filter((o) => !o.rider_id && !['delivered', 'cancelled'].includes(o.status)).length;
  const todaysRevenue = todaysOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">How {vendor.business_name} is doing today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3"><ClipboardList size={18} className="text-blue-600" /></div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Today's Orders</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '…' : todaysOrders.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3"><Truck size={18} className="text-yellow-600" /></div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Waiting for a Rider</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '…' : unclaimedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3"><Banknote size={18} className="text-green-600" /></div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Today's Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '…' : `GHS ${todaysRevenue.toFixed(2)}`}</p>
        </div>
      </div>

      {!loading && orders.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <p className="text-sm text-gray-400">No orders yet for this vendor.</p>
        </div>
      )}
    </div>
  );
}