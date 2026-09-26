import type { Rider } from '../lib/api';

type Props = {
  rider: Rider;
  compact?: boolean;
};

const SLOTS = [
  { key: 'selfie' as const, label: 'Selfie', urlKey: 'photo_url' as const },
  { key: 'front' as const, label: 'Card front', urlKey: 'ghana_card_front_url' as const },
  { key: 'back' as const, label: 'Card back', urlKey: 'ghana_card_back_url' as const },
];

export function RiderKycGallery({ rider, compact = false }: Props) {
  const hasAny = SLOTS.some((s) => rider[s.urlKey]);
  if (!hasAny) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        No ID photos on file{rider.ghana_card_number ? ` (legacy card number: ${rider.ghana_card_number})` : ''}.
      </p>
    );
  }

  return (
    <div className={compact ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-3'}>
      {SLOTS.map((slot) => {
        const url = rider[slot.urlKey];
        return (
          <div key={slot.key} className="flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{slot.label}</p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-xl overflow-hidden border border-gray-200 bg-gray-100 hover:ring-2 hover:ring-orange-400 transition ${compact ? 'aspect-[4/3]' : 'aspect-[4/3] max-h-44'}`}
              >
                <img src={url} alt={slot.label} className="w-full h-full object-cover" />
              </a>
            ) : (
              <div className="aspect-[4/3] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                Missing
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
