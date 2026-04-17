import type { HotelSuggestion } from '@/lib/types';

const AFFILIATE_ID = '2858827';

interface HotelCardProps {
  hotel: HotelSuggestion;
  stopCity: string;
  checkin?: string;
  nights?: string;
  guests?: string;
}

function bookingUrl({ hotel, checkin, nights, guests }: Omit<HotelCardProps, 'stopCity'>): string {
  const ss = encodeURIComponent(`${hotel.name} ${hotel.city}`);
  const params = new URLSearchParams({ aid: AFFILIATE_ID, ss });

  if (checkin) {
    params.set('checkin', checkin);
    // Calculate checkout from checkin + nights
    const nightCount = parseInt(nights?.replace('+', '') || '1', 10);
    const checkoutDate = new Date(checkin);
    checkoutDate.setDate(checkoutDate.getDate() + nightCount);
    params.set('checkout', checkoutDate.toISOString().split('T')[0]);
  }

  if (guests) {
    const guestCount = guests.replace('+', '');
    params.set('group_adults', guestCount);
  }

  params.set('no_rooms', '1');

  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export default function HotelCard({ hotel, stopCity, checkin, nights, guests }: HotelCardProps) {
  const displayCity = hotel.city || stopCity;
  const priceLabel = hotel.fsqPrice != null
    ? '$'.repeat(hotel.fsqPrice)
    : hotel.priceRange;

  const hasDetails = checkin || guests;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white mb-3">
      {hotel.fsqPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hotel.fsqPhoto}
          alt={hotel.name}
          className="w-full h-28 object-cover"
        />
      ) : (
        <div className="w-full h-28 flex items-center justify-center text-4xl" style={{ backgroundColor: '#f0f4ff' }}>
          🏨
        </div>
      )}

      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-sm leading-tight" style={{ color: '#1B2D45' }}>{hotel.name}</h4>
          <span className="text-xs font-bold text-gray-500 flex-shrink-0">{priceLabel}</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{displayCity}</p>

        {/* Trip details summary */}
        {hasDetails && (
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {guests && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                👥 {guests} guest{guests === '1' ? '' : 's'}
              </span>
            )}
            {checkin && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                📅 {new Date(checkin + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {nights && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                🌙 {nights} night{nights === '1' ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {hotel.fsqRating != null && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
            style={{ backgroundColor: 'rgba(88,204,2,0.1)', color: '#46a302' }}
          >
            ⭐ {hotel.fsqRating.toFixed(1)}
          </span>
        )}

        <a
          href={bookingUrl({ hotel, checkin, nights, guests })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
          style={{ backgroundColor: '#003580', color: '#ffffff' }}
        >
          Book on Booking.com →
        </a>
      </div>
    </div>
  );
}
