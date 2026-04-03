import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Search, X } from 'lucide-react';

import { supabase } from '../../supabase/client';

type PlacesSearchResult = {
  id: string;
  name: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  photoName?: string;
};

type PlacesSearchBoxProps = {
  apiKey: string;
  placeholder?: string;
  className?: string;
  onSelect: (place: google.maps.places.PlaceResult, extra?: { photoUrl?: string }) => void;
  types?: string[]; // E.g. ['airport'], ['transit_station']
  defaultValue?: string;
  onChange?: (value: string) => void;
};

const toLegacyPlaceResult = (p: PlacesSearchResult): google.maps.places.PlaceResult => {
  const location =
    typeof p.lat === 'number' && typeof p.lng === 'number'
      ? {
          lat: () => p.lat as number,
          lng: () => p.lng as number,
        }
      : undefined;

  return {
    name: p.name,
    formatted_address: p.formattedAddress,
    place_id: p.id,
    geometry: location
      ? {
          location,
        }
      : undefined,
  } as any;
};

export const PlacesSearchBox: React.FC<PlacesSearchBoxProps> = (props) => {
  const {
    apiKey, 
    placeholder = "搜索地点...", 
    className = "",
    onSelect,
    types = [],
    defaultValue = ''
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultValue);
  const [debouncedQuery, setDebouncedQuery] = useState(defaultValue);
  const [results, setResults] = useState<PlacesSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Debounce the input query
  useEffect(() => {
    if (defaultValue && query === '') {
      setQuery(defaultValue);
      setDebouncedQuery(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const autocompleteUrl = useMemo(() => 'https://places.googleapis.com/v1/places:autocomplete', []);
  const detailsUrl = useMemo(() => 'https://places.googleapis.com/v1/places', []);

  useEffect(() => {
    if (!isOpen) return;
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Capture the current types reference by joining them, to avoid object reference equality issues
    const typesStr = types.join(',');

    const fetchAutocomplete = async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const payload: any = {
          input: debouncedQuery,
          languageCode: 'zh-CN'
        };

        if (types.length > 0) {
          // Map to Autocomplete API valid types if needed, or just append hint
          let apiType = types[0];
          if (apiType === 'transit_station') apiType = 'train_station';
          // Autocomplete API supports 'includedPrimaryTypes'
          payload.includedPrimaryTypes = [apiType];
        }

        const res = await fetch(autocompleteUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          // If strictly filtering by primary type fails, fallback to general search
          if (res.status === 400 && types.length > 0) {
             delete payload.includedPrimaryTypes;
             const typeHint = types[0] === 'airport' ? 'airport' : types[0] === 'transit_station' ? 'station' : types[0] === 'bus_station' ? 'bus station' : '';
             if (typeHint && !debouncedQuery.toLowerCase().includes(typeHint.split(' ')[0])) {
               payload.input = `${debouncedQuery} ${typeHint}`;
             }
             const retryRes = await fetch(autocompleteUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
                body: JSON.stringify(payload)
             });
             if (!retryRes.ok) throw new Error(await retryRes.text() || `HTTP ${retryRes.status}`);
             const retryData = await retryRes.json();
             if (requestId !== requestIdRef.current) return;
             processAutocompleteData(retryData);
             return;
          }
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (requestId !== requestIdRef.current) return;
        processAutocompleteData(data);

      } catch (e: any) {
        if (requestId !== requestIdRef.current) return;
        console.error('Places Autocomplete Error:', e);
        setError(e.message);
        setResults([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    const processAutocompleteData = (data: any) => {
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
      const mapped: PlacesSearchResult[] = suggestions.map((s: any) => {
        const placePrediction = s.placePrediction;
        return {
          id: placePrediction?.placeId || placePrediction?.place?.replace('places/', '') || Math.random().toString(),
          name: placePrediction?.text?.text || '未命名地点',
          formattedAddress: placePrediction?.structuredFormat?.secondaryText?.text || '',
          // We won't have lat/lng/photos yet from Autocomplete API!
          lat: undefined,
          lng: undefined,
          photoName: undefined,
        };
      });
      setResults(mapped);
    };

    fetchAutocomplete();
  }, [debouncedQuery, isOpen, apiKey, autocompleteUrl, types.join(',')]);

  const handleSelect = async (r: PlacesSearchResult) => {
    setIsOpen(false);
    
    // Autocomplete API only gives us placeId and name. We must fetch details (lat/lng/photos) now.
    if (!r.id || r.id.toString().includes('0.')) { // Fallback if no real place_id
      onSelect(toLegacyPlaceResult(r));
      return;
    }

    try {
      // 1. Check our own Supabase Cache first to save Google API costs!
      // Use maybeSingle() instead of single() to avoid 406 Not Acceptable when row doesn't exist
      const { data: cachedPlace, error: cacheErr } = await supabase
        .from('place_cache')
        .select('*')
        .eq('place_id', r.id)
        .maybeSingle();

      if (cachedPlace && !cacheErr) {
        console.log('[CACHE HIT] Using Supabase cached place data for:', r.name);
        const detailedResult: PlacesSearchResult = {
          id: cachedPlace.place_id,
          name: cachedPlace.name,
          formattedAddress: cachedPlace.formatted_address,
          lat: cachedPlace.lat,
          lng: cachedPlace.lng,
          photoName: cachedPlace.photo_name,
        };
        onSelect(toLegacyPlaceResult(detailedResult), { photoUrl: detailedResult.photoName });
        return;
      }

      console.log('[CACHE MISS] Fetching from Google Place Details API for:', r.name);

      // 2. Use Place Details API to get the missing info
      const res = await fetch(`${detailsUrl}/${r.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,photos'
        }
      });

      if (!res.ok) throw new Error('Failed to fetch place details');
      
      const p = await res.json();
      
      // Merge details back into our result object
      const detailedResult: PlacesSearchResult = {
        id: p.id || r.id,
        name: p.displayName?.text || p.displayName || r.name,
        formattedAddress: p.formattedAddress || r.formattedAddress,
        lat: typeof p.location?.latitude === 'number' ? p.location.latitude : undefined,
        lng: typeof p.location?.longitude === 'number' ? p.location.longitude : undefined,
        photoName: Array.isArray(p.photos) && p.photos[0]?.name ? p.photos[0].name : undefined,
      };

      // 3. Save the fetched result into our Supabase Cache asynchronously
      if (detailedResult.lat && detailedResult.lng) {
        supabase.from('place_cache').upsert({
          place_id: detailedResult.id,
          name: detailedResult.name,
          formatted_address: detailedResult.formattedAddress,
          lat: detailedResult.lat,
          lng: detailedResult.lng,
          photo_name: detailedResult.photoName
        }).then(({error}) => {
          if(error) console.warn('Failed to cache place:', error);
        });
      }

      onSelect(toLegacyPlaceResult(detailedResult), { photoUrl: detailedResult.photoName });

    } catch (err) {
      console.error('Error fetching place details:', err);
      // Fallback to whatever we have if details fail
      onSelect(toLegacyPlaceResult(r));
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 w-full h-full">
        <MapPin className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (props.onChange) {
              props.onChange(e.target.value);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 py-2 w-full"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setError(null);
              setIsOpen(false);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            title="清空"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && (results.length > 0 || isLoading || error) && (
        <div className="absolute left-[-1rem] right-[-1rem] sm:left-0 sm:right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[120]">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">搜索中…</div>
          )}
          {error && !isLoading && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          {!isLoading && !error && (
            <div className="max-h-[360px] overflow-auto">
              {results.map((r) => {
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 break-words leading-tight">{r.name}</div>
                      {r.formattedAddress ? (
                        <div className="text-xs text-gray-500 break-words leading-tight mt-0.5">{r.formattedAddress}</div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

