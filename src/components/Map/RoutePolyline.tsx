import React, { useEffect, useRef } from 'react';

interface LocationWithMode {
  lat: number;
  lng: number;
  placeId?: string;
  travelMode?: string;
  time?: string;
}

interface RoutePolylineProps {
  map?: google.maps.Map;
  locations: LocationWithMode[];
  color?: string;
  onRouteCalculated?: (result: any) => void;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({ 
  map, 
  locations, 
  color = '#3B82F6',
  onRouteCalculated 
}) => {
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const routesLibraryLoadedRef = useRef(false);

  const locationsString = JSON.stringify(locations);

  useEffect(() => {
    if (!map || !window.google) return;

    // Load the routes library if not already loaded
    const loadRoutesLibrary = async () => {
      if (routesLibraryLoadedRef.current) return true;
      try {
        // @ts-ignore - routes library types may not be fully available
        await window.google.maps.importLibrary('routes');
        routesLibraryLoadedRef.current = true;
        return true;
      } catch (e) {
        console.error('[DEBUG] Failed to load routes library:', e);
        return false;
      }
    };

    // Clean up existing polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    if (locations.length < 2) {
      if (onRouteCalculated) {
        onRouteCalculated({ routes: [] });
      }
      return;
    }

    const calculateRoutes = async () => {
      const libraryLoaded = await loadRoutesLibrary();
      if (!libraryLoaded) {
        console.error('[DEBUG] Routes library not available, falling back to straight lines');
        drawFallbackLines(locations);
        return;
      }

      // @ts-ignore - routes library types may not be fully available
      const Route = window.google.maps.routes.Route;
      let totalPolylines: google.maps.Polyline[] = [];
      let allSuccessful = true;

      for (let i = 0; i < locations.length - 1; i++) {
        const origin = locations[i];
        const destination = locations[i + 1];
        if (origin.lat === destination.lat && origin.lng === destination.lng) {
          continue;
        }

        const travelMode = origin.travelMode || 'TRANSIT';

        const originLocation = { lat: origin.lat, lng: origin.lng };
        const destinationLocation = { lat: destination.lat, lng: destination.lng };

        try {
          console.log('[DEBUG] Requesting route with new API, segment', i, 'travelMode:', travelMode);

          const request: any = {
            origin: originLocation,
            destination: destinationLocation,
            travelMode,
            fields: ['path'],
          };

          if (travelMode === 'TRANSIT') {
            request.transitPreference = {
              routingPreference: 'LESS_WALKING'
            };
            if (origin.time) {
              const [hours, minutes] = origin.time.split(':');
              const now = new Date();
              now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
              request.departureTime = now;
            } else {
              request.departureTime = new Date();
            }
          }

          const result = await Route.computeRoutes(request);
          console.log('[DEBUG] Route API result:', JSON.stringify(result).slice(0, 500));

          if (result.routes && result.routes.length > 0) {
            // Use createPolylines to get the actual polylines
            const routePolylines = result.routes[0].createPolylines();
            
            for (const polyline of routePolylines) {
              // Set the color appropriately
              polyline.setOptions({
                strokeColor: color,
                strokeOpacity: 0.9,
                strokeWeight: 5,
              });
              polyline.setMap(map);
              polylinesRef.current.push(polyline);
              totalPolylines.push(polyline);
            }

            // If we got polylines, we're done for this segment
            if (totalPolylines.length > 0) continue;
          }

          // If we get here with no polylines, try fallback
          allSuccessful = false;
          drawSegmentLine(origin, destination, '#9CA3AF');

        } catch (error) {
          console.error('[DEBUG] Route API error for segment', i, ':', error);
          allSuccessful = false;
          drawSegmentLine(origin, destination, '#9CA3AF');
        }
      }

      if (onRouteCalculated && totalPolylines.length > 0) {
        onRouteCalculated({ routes: [{ polylines: totalPolylines }] });
      }
    };

    const drawSegmentLine = (origin: LocationWithMode, destination: LocationWithMode, strokeColor: string) => {
      const fallbackPath = [
        new window.google.maps.LatLng(origin.lat, origin.lng),
        new window.google.maps.LatLng(destination.lat, destination.lng)
      ];
      const fallbackPolyline = new window.google.maps.Polyline({
        path: fallbackPath,
        geodesic: true,
        strokeColor,
        strokeOpacity: 0.7,
        strokeWeight: 4,
      });
      fallbackPolyline.setMap(map);
      polylinesRef.current.push(fallbackPolyline);
    };

    const drawFallbackLines = (locs: LocationWithMode[]) => {
      for (let i = 0; i < locs.length - 1; i++) {
        drawSegmentLine(locs[i], locs[i + 1], '#9CA3AF');
      }
    };

    calculateRoutes();

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, locationsString, color]);

  return null;
};
