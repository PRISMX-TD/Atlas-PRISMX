import React, { useEffect, useMemo, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface AutocompleteInputProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  clearOnSelect?: boolean;
  defaultValue?: string;
  hideIcon?: boolean;
  onChange?: (value: string) => void;
  types?: string[];
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  onPlaceSelect, 
  placeholder = "搜索地点并添加到行程...",
  className = "",
  clearOnSelect = true,
  defaultValue = "",
  hideIcon = false,
  onChange,
  types
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<any>(null);

  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const stylesId = useMemo(() => 'gmp-place-autocomplete-styles', []);

  const toLegacyLocation = (loc: any) => {
    if (!loc) return null;
    if (typeof loc.lat === 'function' && typeof loc.lng === 'function') {
      return loc;
    }
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return {
        lat: () => loc.lat,
        lng: () => loc.lng
      };
    }
    return null;
  };

  const toLegacyPlaceResult = (place: any): google.maps.places.PlaceResult | null => {
    if (!place) return null;
    const location = toLegacyLocation(place.location);
    const name = typeof place.displayName === 'string' ? place.displayName : (place.displayName?.text ?? place.displayName);
    const formattedAddress = place.formattedAddress;
    const id = place.id;

    if (!location && !name && !formattedAddress) return null;

    return {
      name,
      formatted_address: formattedAddress,
      place_id: id,
      geometry: location
        ? {
            location
          }
        : undefined
    } as any;
  };

  useEffect(() => {
    let cancelled = false;
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const ensureStyles = () => {
      if (document.getElementById(stylesId)) return;
      const style = document.createElement('style');
      style.id = stylesId;
      style.textContent = `
        gmp-place-autocomplete {
          width: 100%;
          background: transparent;
          --gmp-color-surface: transparent;
          --gmp-color-on-surface: #374151;
        }
        gmp-place-autocomplete::part(input) {
          border: none;
          background: transparent;
          padding: 0;
          font-size: 0.875rem;
          outline: none;
          width: 100%;
          color: #374151;
        }
        gmp-place-autocomplete::part(input)::placeholder {
          color: #9ca3af;
        }
        gmp-place-autocomplete::part(input):focus {
          outline: none;
          box-shadow: none;
        }
      `;
      document.head.appendChild(style);
    };

    const init = async () => {
      if (!containerRef.current || !window.google || !window.google.maps) return false;

      try {
        await window.google.maps.importLibrary('places');
        ensureStyles();

        if (!containerRef.current) return false;

        if (!elementRef.current) {
          const el = document.createElement('gmp-place-autocomplete') as any;
          el.setAttribute('placeholder', placeholder || '');

          if (defaultValue) {
            el.value = defaultValue;
          }

          const handlePlaceSelect = async (evt: any) => {
            const selected = evt?.detail?.place ?? evt?.place;
            if (!selected) return;

            const provisional = toLegacyPlaceResult(selected);
            if (provisional) {
              onPlaceSelectRef.current(provisional);
            }

            try {
              if (typeof selected.fetchFields === 'function') {
                await selected.fetchFields({
                  fields: ['displayName', 'formattedAddress', 'location', 'id']
                });
              }
            } catch {
              if (clearOnSelect) {
                setTimeout(() => {
                  if (cancelled) return;
                  try {
                    el.value = '';
                  } catch {
                    // ignore
                  }
                }, 0);
              }
              return;
            }

            const legacy = toLegacyPlaceResult(selected);
            if (!legacy) return;
            onPlaceSelectRef.current(legacy);

            if (clearOnSelect) {
              setTimeout(() => {
                if (cancelled) return;
                try {
                  el.value = '';
                } catch {
                  // ignore
                }
              }, 0);
            }
          };

          el.addEventListener('gmp-placeselect', handlePlaceSelect);

          el.addEventListener('input', (e: any) => {
            const value = e?.target?.value;
            if (typeof value === 'string') {
              onChangeRef.current?.(value);
            }
          });

          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(el);
          elementRef.current = el;
        } else {
          elementRef.current.setAttribute('placeholder', placeholder || '');
        }

        return true;
      } catch {
        return false;
      }
    };

    if (!init()) {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts += 1;
        if (attempts > 50) {
          if (checkInterval) clearInterval(checkInterval);
          return;
        }
        init().then((ok) => {
          if (ok && checkInterval) clearInterval(checkInterval);
        });
      }, 100);
    }

    return () => {
      cancelled = true;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [clearOnSelect, defaultValue, placeholder, stylesId]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    if (Array.isArray(types) && types.length > 0) {
      el.setAttribute('types', types.join(','));
    } else {
      el.removeAttribute('types');
    }
  }, [types]);

  return (
    <div className={`flex items-center w-full relative ${className}`}>
      {!hideIcon && <MapPin className="text-gray-400 w-5 h-5 mr-2 shrink-0" />}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
};
