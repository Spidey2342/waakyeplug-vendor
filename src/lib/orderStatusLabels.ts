/** Canonical order status display labels — keep in sync across vendor / rider / customer apps. */
export type OrderStatus = 'available' | 'rider_assigned' | 'picked_up' | 'delivered' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  available: 'Looking for a rider',
  rider_assigned: 'Rider assigned',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function getStatusLabel(status: string | undefined | null): string {
  if (!status) return 'Active order';
  if (status in ORDER_STATUS_LABELS) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  // Legacy pre-canonical enum rows
  if (status === 'ready' || status === 'pending' || status === 'accepted' || status === 'preparing') {
    return ORDER_STATUS_LABELS.available;
  }
  return 'Active order';
}
