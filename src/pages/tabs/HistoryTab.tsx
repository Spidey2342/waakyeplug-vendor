import { useState, useEffect } from 'react';
import { getVendorOrders, type Vendor, type Order } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { History, Phone } from 'lucide-react';
import { formatOrderDate, parseOrderItems } from '../../lib/orderItems';

const HISTORY_STATUSES: Order['status'][] = ['delivered', 'cancelled'];

export default function HistoryTab({ vendor }: { vendor: Vendor }) {
  const { toastError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getVendorOrders(vendor.id);
      setOrders(data.filter((o) => HISTORY_STATUSES.includes(o.status)));
    } catch (err: any) {
      toastError(err.message || 'Could not load order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`vendor-history-${vendor.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendor.id]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Delivered and cancelled orders — what customers bought from {vendor.business_name}.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Loading history...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <History size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No completed orders yet. Finished orders will show up here with the food items.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const lines = parseOrderItems(order.items);
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{order.profiles?.full_name ?? 'Customer'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatOrderDate(order.created_at)}</p>
                    {order.profiles?.phone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {order.profiles.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                    </span>
                    <p className="text-lg font-bold text-gray-900 mt-2">GHS {order.total_amount}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items ordered</p>
                  {lines.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No item breakdown saved for this order.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {lines.map((line, i) => (
                        <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-gray-700">
                          <span>
                            {line.quantity > 1 ? `${line.quantity}× ` : ''}{line.name}
                          </span>
                          {line.price != null && (
                            <span className="text-xs text-gray-500">GHS {(line.price * line.quantity).toFixed(2)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-3 truncate" title={order.delivery_address}>
                  Delivered to: {order.delivery_address}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
