import { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Loader2, Check } from 'lucide-react';
import { mapsApi, type PlacePrediction } from '@/api/maps';

const DEBOUNCE_MS = 350;

interface AddressSearchInputProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (details: { address: string; name?: string; lat: number; lng: number }) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function AddressSearchInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search for an address or place...',
  disabled,
  error,
  className = '',
}: AddressSearchInputProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [fetchingPredictions, setFetchingPredictions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }
    setFetchingPredictions(true);
    try {
      const { predictions: list } = await mapsApi.getPlacePredictions(input);
      setPredictions(list || []);
    } catch {
      setPredictions([]);
    } finally {
      setFetchingPredictions(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      onChange(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim() || text.length < 3) {
        setPredictions([]);
        return;
      }
      debounceRef.current = setTimeout(() => fetchPredictions(text), DEBOUNCE_MS);
    },
    [onChange, fetchPredictions]
  );

  const handleSelectPrediction = useCallback(
    async (placeId: string) => {
      setPredictions([]);
      setFetchingDetails(true);
      try {
        const details = await mapsApi.getPlaceDetails(placeId);
        if (details.formatted_address) onChange(details.formatted_address);
        if (details.lat != null && details.lng != null && onPlaceSelect) {
          onPlaceSelect({
            address: details.formatted_address || value,
            name: details.name || undefined,
            lat: details.lat,
            lng: details.lng,
          });
        }
      } catch {
        // Silently fail - user can still use typed address
      } finally {
        setFetchingDetails(false);
      }
    },
    [onChange, onPlaceSelect, value]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`relative rounded-xl border transition-all duration-200 ${
          error ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-gray-50/50'
        } ${predictions.length > 0 ? 'rounded-b-none border-b-0' : ''} focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-shrink-0 text-teal-600">
            {fetchingDetails ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </div>
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-400 outline-none text-[15px]"
          />
          {fetchingPredictions && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {predictions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-0 overflow-hidden rounded-b-xl border border-t-0 border-gray-200 bg-white shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="max-h-64 overflow-y-auto py-2">
            {predictions.slice(0, 6).map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectPrediction(item.place_id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50/80 active:bg-teal-100/80"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-100/80 text-teal-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {item.structured_formatting?.main_text || item.description}
                  </p>
                  {item.structured_formatting?.secondary_text && (
                    <p className="truncate text-sm text-gray-500">
                      {item.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
                <Check className="h-4 w-4 flex-shrink-0 text-teal-500 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
