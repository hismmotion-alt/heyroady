import type { HotelSuggestion } from '@/lib/types';

const AFFILIATE_ID = '2858827';

interface HotelCardProps {
  hotel: HotelSuggestion;
  stopCity: string;
  checkin?: string;
  nights?: string;
  guests?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

function bookingUrl({ hotel, checkin, nights, guests }: Pick<HotelCardProps, 'hotel' | 'checkin' | 'nights' | 'guests'>): string {
  const ss = encodeURIComponent(`${hotel.name} ${hotel.city}`);
  const params = new URLSearchParams({ aid: AFFILIATE_ID, ss });

  if (checkin) {
    params.set('checkin', checkin);
    const nightCount = parseInt(nights?.replace('+', '') || '1', 10);
    const checkoutDate = new Date(checkin);
    checkoutDate.setDate(checkoutDate.getDate() + nightCount);
    params.set('checkout', checkoutDate.toISOString().split('T')[0]);
  }

  if (guests) params.set('group_adults', guests.replace('+', ''));
  params.set('no_rooms', '1');

  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export default function HotelCard({ hotel, stopCity, checkin, nights, guests, isSelected, onSelect }: HotelCardProps) {
  const displayCity = hotel.city || stopCity;
  const priceLabel = hotel.fsqPrice != null ? '$'.repeat(hotel.fsqPrice) : hotel.priceRange;

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white transition-all duration-200"
      style={{
        border: isSelected ? '2px solid #58CC02' : '2px solid #f0f0f0',
        boxShadow: isSelected ? '0 0 0 3px rgba(88,204,2,0.12)' : undefined,
      }}
    >
      <div className="flex gap-0">
        {/* Photo */}
        <div className="w-24 flex-shrink-0">
          {hotel.fsqPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.fsqPhoto} alt={hotel.name} className="w-24 h-full object-cover" style={{ minHeight: 90 }} />
          ) : (
            <div className="w-24 flex items-center justify-center text-3xl" style={{ minHeight: 90, backgroundColor: '#f0f4ff' }}>
              🏨
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 px-3 py-2.5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <h4 className="font-bold text-sm leading-tight truncate" style={{ color: '#1B2D45' }}>{hotel.name}</h4>
              <span className="text-xs font-bold text-gray-500 flex-shrink-0 ml-1">{priceLabel}</span>
            </div>
            <p className="text-xs text-gray-400 mb-1.5">{displayCity}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {hotel.fsqRating != null && (
                <span
                  className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(88,204,2,0.1)', color: '#46a302' }}
                >
                  ⭐ {hotel.fsqRating.toFixed(1)}
                </span>
              )}
              {checkin && (
                <span className="text-xs text-gray-400">
                  📅 {new Date(checkin + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {nights ? ` · ${nights}n` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={onSelect}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
              style={isSelected
                ? { backgroundColor: 'rgba(88,204,2,0.12)', color: '#46a302' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }
              }
            >
              {isSelected ? '✓ Selected' : 'Select'}
            </button>
            <a
              href={bookingUrl({ hotel, checkin, nights, guests })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: '#003580', color: '#ffffff' }}
            >
              Book on Booking.com →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
