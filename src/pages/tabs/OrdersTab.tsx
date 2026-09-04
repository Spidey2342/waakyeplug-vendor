import { useState, useEffect } from 'react';
import { getVendorOrders, cancelOrder, type Vendor, type Order } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { Loader2, Phone, Bike } from 'lucide-react';

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Pending',
  available: 'Available to Riders',
  ready: 'Available to Riders',
  rider_assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusStyle: Record<Order['status'], string> = {
  pending: 'bg-gray-100 text-gray-600',
  available: 'bg-purple-50 text-purple-700',
  ready: 'bg-purple-50 text-purple-700',
  rider_assigned: 'bg-blue-50 text-blue-700',
  picked_up: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function OrdersTab({ vendor }: { vendor: Vendor }) {
  const { toastSuccess, toastError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const load = async () => {
    try {
      const data = await getVendorOrders(vendor.id);
      setOrders(data);
    } catch (err: any) {
      toastError(err.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Real-time: this vendor's orders update the moment a customer places
    // one, a rider claims it, or its status changes — no manual refresh needed.
    const channel = supabase
      .channel(`vendor-orders-${vendor.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendor.id]);

  const handleCancel = async (order: Order) => {
    if (!window.confirm('Cancel this order?')) return;
    setBusyId(order.id);
    try {
      await cancelOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
      toastSuccess('Order cancelled.');
    } catch (err: any) {
      toastError(err.message || 'Could not cancel order.');
    } finally {
      setBusyId(null);
    }
  };

  const visibleOrders = filter === 'active'
    ? orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
    : orders;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {visibleOrders.length} {filter === 'active' ? 'active' : 'total'} order{visibleOrders.length !== 1 ? 's' : ''}.
            Orders flow to riders automatically — this view is for monitoring only.
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setFilter('active')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${filter === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Active</button>
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>All</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Loading orders...</p>
      ) : visibleOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <p className="text-sm text-gray-400">No {filter === 'active' ? 'active ' : ''}orders right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{order.profiles?.full_name ?? 'Customer'}</p>
                  {order.profiles?.phone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={12} /> {order.profiles.phone}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm text-gray-600">
                <p className="text-xs text-gray-400 mb-1">Delivery Address</p>
                <p>{order.delivery_address}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">Payment: <span className="font-medium text-gray-600 capitalize">{order.payment_method}</span></p>
                  <p className="text-lg font-bold text-gray-900">GHS {order.total_amount}</p>
                </div>
                <div className="flex items-center gap-3">
                  {order.riders?.profiles?.full_name ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                      <Bike size={14} className="text-orange-500" /> {order.riders.profiles.full_name}
                    </span>
                  ) : !['delivered', 'cancelled'].includes(order.status) ? (
                    <span className="text-xs text-gray-400">No rider yet</span>
                  ) : null}
                  {['pending', 'available', 'ready'].includes(order.status) && (
                    <button
                      onClick={() => handleCancel(order)}
                      disabled={busyId === order.id}
                      className="flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-4 py-2 rounded-lg transition"
                    >
                      {busyId === order.id && <Loader2 size={14} className="animate-spin" />}
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}