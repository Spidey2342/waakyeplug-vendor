export type OrderLineItem = {
  name: string;
  quantity: number;
  price?: number;
};

function lineFromObject(raw: Record<string, unknown>): OrderLineItem | null {
  const name = raw.name ?? raw.title ?? raw.item_name ?? raw.label;
  if (name == null || String(name).trim() === '') return null;

  const quantity = Number(raw.quantity ?? raw.qty ?? 1);
  const unitPrice = raw.price ?? raw.unit_price ?? raw.amount;
  const price = unitPrice != null && unitPrice !== '' ? Number(unitPrice) : undefined;

  return {
    name: String(name).trim(),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    price: price != null && Number.isFinite(price) ? price : undefined,
  };
}

/** Normalizes the orders.items JSON blob from Supabase into display rows. */
export function parseOrderItems(items: unknown): OrderLineItem[] {
  if (items == null) return [];

  let parsed: unknown = items;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [{ name: String(parsed), quantity: 1 }];
    }
  }

  if (Array.isArray(parsed)) {
    const lines: OrderLineItem[] = [];
    for (const entry of parsed) {
      if (typeof entry === 'string') {
        lines.push({ name: entry, quantity: 1 });
        continue;
      }
      if (entry && typeof entry === 'object') {
        const line = lineFromObject(entry as Record<string, unknown>);
        if (line) lines.push(line);
      }
    }
    return lines;
  }

  if (typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.lines)) return parseOrderItems(obj.lines);
    if (Array.isArray(obj.items)) return parseOrderItems(obj.items);
    const line = lineFromObject(obj);
    return line ? [line] : [];
  }

  return [];
}

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
