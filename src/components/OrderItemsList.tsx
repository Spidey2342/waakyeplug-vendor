import { parseOrderItems } from '../lib/orderItems';

export default function OrderItemsList({ items, compact }: { items: unknown; compact?: boolean }) {
  const lines = parseOrderItems(items);
  if (lines.length === 0) return null;

  return (
    <div className={`${compact ? 'mb-2' : 'mb-3'} bg-gray-50 rounded-xl p-3`}>
      <p className="text-xs text-gray-400 mb-1.5">Items</p>
      <ul className={`flex flex-col gap-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
        {lines.map((line, i) => (
          <li key={i}>
            {line.quantity > 1 ? `${line.quantity}× ` : ''}{line.name}
            {line.price != null && (
              <span className="text-gray-400"> · GHS {(line.price * line.quantity).toFixed(2)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
