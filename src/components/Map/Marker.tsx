import React, { useEffect, useRef } from 'react';

interface MarkerProps {
  map?: google.maps.Map;
  position: google.maps.LatLngLiteral;
  title?: string;
  label?: string;
  onClick?: (e: google.maps.MapMouseEvent) => void;
  draggable?: boolean;
  icon?: string | google.maps.Icon | google.maps.Symbol;
  type?: 'location' | 'accommodation' | 'transport_departure' | 'transport_arrival';
}

export const Marker: React.FC<MarkerProps> = ({ 
  map, 
  position, 
  title, 
  label,
  onClick, 
  draggable = false,
  icon,
  type
}) => {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;

    let isMounted = true;

    const initMarker = async () => {
      try {
        // Ensure marker library is loaded
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        
        if (!isMounted) return;

        const bgColor = type === 'transport_departure' ? "#3b82f6" : // blue-500
                        type === 'transport_arrival' ? "#10b981" : // emerald-500
                        type === 'accommodation' ? "#a855f7" : // purple-500
                        "#f97316"; // orange-500 (default location)

        const borderColor = type === 'transport_departure' ? "#2563eb" : 
                            type === 'transport_arrival' ? "#059669" : 
                            type === 'accommodation' ? "#9333ea" : 
                            "white";

        let innerContent = label || '';
        let fontSize = label?.length && label.length > 1 ? '12px' : '16px';
        
        if (type === 'transport_departure') {
          innerContent = '🛫';
          fontSize = '16px';
        } else if (type === 'transport_arrival') {
          innerContent = '🛬';
          fontSize = '16px';
        } else if (type === 'accommodation') {
          innerContent = '🏨';
          fontSize = '16px';
        } else if (!innerContent) {
          innerContent = '📍';
        }

        // Create the marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.innerHTML = `
          <div style="
            width: 36px;
            height: 36px;
            background: ${bgColor};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid ${borderColor};
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              transform: rotate(45deg);
              font-size: ${fontSize};
              color: white;
              font-weight: 800;
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            ">${innerContent}</div>
          </div>
        `;

        // Create the advanced marker
        markerRef.current = new AdvancedMarkerElement({
          position,
          map,
          title,
          gmpDraggable: draggable,
          content: markerElement,
        });

        // Add click listener
        if (onClick) {
          clickListenerRef.current = markerRef.current.addListener('click', onClick);
        }
      } catch (error) {
        console.error("Failed to load marker library", error);
      }
    };

    initMarker();

    return () => {
      isMounted = false;
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
      }
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
  }, [map]); // Dependency array updated to recreate marker when map is ready

  // Update position when it changes
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.position = position;
    }
  }, [position.lat, position.lng]);

  // Update map when it changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.map = map || null;
    }
  }, [map]);

  // Update label when it changes
  useEffect(() => {
    if (markerRef.current && markerRef.current.content) {
      const content = markerRef.current.content as HTMLElement;
      const labelDiv = content.querySelector('div > div') as HTMLElement;
      if (labelDiv) {
        if (type === 'transport_departure') {
          labelDiv.innerHTML = '🛫';
          labelDiv.style.fontSize = '16px';
        } else if (type === 'transport_arrival') {
          labelDiv.innerHTML = '🛬';
          labelDiv.style.fontSize = '16px';
        } else if (type === 'accommodation') {
          labelDiv.innerHTML = '🏨';
          labelDiv.style.fontSize = '16px';
        } else {
          labelDiv.innerHTML = label || '📍';
          labelDiv.style.fontSize = label?.length && label.length > 1 ? '12px' : '16px';
        }
      }
    }
  }, [label, type]);

  return null;
};
