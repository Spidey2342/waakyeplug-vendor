import { useState, useEffect } from 'react';
import { getVendorOrders, cancelOrder, type Vendor, type Order } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { Loader2, Phone, Bike, X } from 'lucide-react';

// Canonical order status enum (2026-09-12 migration) — matches the DB
// check constraint exactly. 'pending'/'ready'/'accepted'/'preparing' are
// ghosts that nothing may write anymore.
const STATUS_LABEL: Record<Order['status'], string> = {
  available: 'Available to Riders',
  rider_assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusStyle: Record<Order['status'], string> = {
  available: 'bg-purple-50 text-purple-700',
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
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

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

  const openCancelModal = (order: Order) => {
    setCancelModalOrder(order);
    setCancelReason('');
  };

  const closeCancelModal = () => {
    setCancelModalOrder(null);
    setCancelReason('');
  };

  const handleCancelConfirm = async () => {
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      toastError('Please provide a cancel reason.');
      return;
    }

    setBusyId(cancelModalOrder.id);
    try {
      await cancelOrder(cancelModalOrder.id, cancelReason.trim());
      setOrders((prev) => prev.map((o) => (o.id === cancelModalOrder.id ? { ...o, status: 'cancelled' } : o)));
      toastSuccess('Order cancelled.');
      closeCancelModal();
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
                  {['available', 'rider_assigned', 'picked_up'].includes(order.status) && (
                    <button
                      onClick={() => openCancelModal(order)}
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

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Cancel Order</h2>
              <button
                onClick={closeCancelModal}
                disabled={busyId === cancelModalOrder.id}
                className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Order for <span className="font-semibold">{cancelModalOrder.profiles?.full_name ?? 'Customer'}</span>
              </p>
              <p className="text-xs text-gray-500">
                Current status: <span className="font-medium">{STATUS_LABEL[cancelModalOrder.status]}</span>
              </p>
              {cancelModalOrder.status === 'picked_up' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Cancelling after pickup will charge the customer 70% of the delivery fee on their next order.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancel Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this order..."
                disabled={busyId === cancelModalOrder.id}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeCancelModal}
                disabled={busyId === cancelModalOrder.id}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={busyId === cancelModalOrder.id || !cancelReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {busyId === cancelModalOrder.id && <Loader2 size={14} className="animate-spin" />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}