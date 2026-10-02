import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPositionChange([pos.lat, pos.lng]);
      });
    }
  }, [onPositionChange]);

  return (
    <Marker
      position={position}
      draggable={true}
      ref={markerRef}
    />
  );
}

export default function LocationPicker({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: {
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}) {
  const defaultCenter: [number, number] = [5.6037, -0.1870];
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : defaultCenter
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(markerPosition);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Your browser does not support location access.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setMarkerPosition(newPos);
        setMapCenter(newPos);
        setGettingLocation(false);
      },
      (err) => {
        alert(err.message || 'Could not get your location. Make sure location access is allowed.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectResult = (result: SearchResult) => {
    const newPos: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    setMarkerPosition(newPos);
    setMapCenter(newPos);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Set Shop Location</h2>
          <p className="text-sm text-gray-500">
            Search for your shop's area or landmark, or use your current location.
          </p>
        </div>

        <div className="p-5 space-y-3 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for area, landmark, or city name..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100 pr-10"
              />
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white transition border-b border-gray-100 last:border-0"
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            {gettingLocation ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Navigation size={16} />
            )}
            {gettingLocation ? 'Getting location...' : 'Use my current location'}
          </button>
        </div>

        <div className="flex-1 relative min-h-[300px]">
          <MapContainer
            center={mapCenter}
            zoom={15}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} />
            <DraggableMarker
              position={markerPosition}
              onPositionChange={setMarkerPosition}
            />
          </MapContainer>
          <div className="absolute top-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-700 shadow-sm pointer-events-none">
            Drag the pin or tap the map to adjust
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex-1 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Selected location:</span>{' '}
            {markerPosition[0].toFixed(4)}, {markerPosition[1].toFixed(4)}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(markerPosition[0], markerPosition[1])}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              <MapPin size={16} />
              Confirm this location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
