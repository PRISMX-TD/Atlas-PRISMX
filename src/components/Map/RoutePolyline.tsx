import React, { useEffect, useRef } from 'react';

interface LocationWithMode {
  lat: number;
  lng: number;
  placeId?: string;
  travelMode?: string;
  time?: string;
  skipToNext?: boolean; // New flag to skip drawing route to the next point (e.g. during a flight)
}

interface RoutePolylineProps {
  map?: google.maps.Map;
  locations: LocationWithMode[];
  color?: string;
  baseDate?: Date;
  onRouteCalculated?: (result: any) => void;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({ 
  map, 
  locations, 
  color = '#3B82F6',
  baseDate,
  onRouteCalculated 
}) => {
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const routesLibraryLoadedRef = useRef(false);

  const locationsString = JSON.stringify(locations);

  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    let isCancelled = false;

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
      // 1. Try to get DirectionsService
      let directionsService: google.maps.DirectionsService | null = null;
      
      try {
        // First check if it's already available globally
        if (window.google?.maps?.DirectionsService) {
          directionsService = new window.google.maps.DirectionsService();
        } else {
          // Try to import it
          const { DirectionsService } = await window.google.maps.importLibrary('directions') as any;
          if (isCancelled) return;
          directionsService = new DirectionsService();
        }
      } catch (e) {
        console.warn('[DEBUG] Directions library failed to load, trying fallback', e);
      }

      // 2. Try to get Routes library
      let routesLibrary: any = null;
      try {
        routesLibrary = await window.google.maps.importLibrary('routes');
      } catch (e) {
        console.warn('[DEBUG] Routes library failed to load');
      }

      const Route = routesLibrary?.Route;
      let totalDistance = 0;
      let totalDuration = 0;

      for (let i = 0; i < locations.length - 1; i++) {
        if (isCancelled) return;
        const origin = locations[i];
        const destination = locations[i + 1];
        if (origin.lat === destination.lat && origin.lng === destination.lng) continue;
        if (origin.skipToNext) continue; // Skip flight segments or other explicitly marked segments

        const travelMode = origin.travelMode || 'TRANSIT';
        let routeFound = false;

        // --- TRY DIRECTIONS SERVICE (Best for Transit) ---
        if (directionsService) {
          try {
            const depDate = baseDate ? new Date(baseDate) : new Date();
            if (origin.time) {
              const [hours, minutes] = origin.time.split(':');
              depDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            } else {
              depDate.setHours(9, 0, 0, 0);
            }

            const dsOrigin = origin.placeId ? { placeId: origin.placeId } : { lat: origin.lat, lng: origin.lng };
            const dsDest = destination.placeId ? { placeId: destination.placeId } : { lat: destination.lat, lng: destination.lng };

            const dsRequest: google.maps.DirectionsRequest = {
              origin: dsOrigin,
              destination: dsDest,
              travelMode: travelMode as google.maps.TravelMode,
            };

            if (travelMode === 'TRANSIT') {
              dsRequest.transitOptions = {
                departureTime: depDate,
                routingPreference: google.maps.TransitRoutePreference.LESS_WALKING
              };
            }

            let dsResult = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
              directionsService!.route(dsRequest, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              });
            });

            // Fallback: If Transit returns ZERO_RESULTS, try Walking
            if (!dsResult && travelMode === 'TRANSIT') {
              console.log(`[DEBUG] Transit returned ZERO_RESULTS for segment ${i}, trying WALKING fallback...`);
              dsResult = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
                directionsService!.route({
                  origin: dsOrigin,
                  destination: dsDest,
                  travelMode: google.maps.TravelMode.WALKING
                }, (result, status) => {
                  if (status === google.maps.DirectionsStatus.OK) resolve(result);
                  else resolve(null);
                });
              });
            }

            if (isCancelled) return;

            if (dsResult && dsResult.routes && dsResult.routes.length > 0) {
              const route = dsResult.routes[0];
              const polyline = new window.google.maps.Polyline({
                path: route.overview_path,
                strokeColor: color,
                strokeOpacity: 0.9,
                strokeWeight: 5,
                map: map
              });
              polylinesRef.current.push(polyline);
              
              if (route.legs) {
                route.legs.forEach(leg => {
                  totalDistance += leg.distance?.value || 0;
                  totalDuration += leg.duration?.value || 0;
                });
              }
              routeFound = true;
              console.log(`[DEBUG] Segment ${i} found via DirectionsService (${dsResult.request.travelMode})`);
            }
          } catch (e) {
            console.warn(`[DEBUG] DirectionsService error for segment ${i}:`, e);
          }
        }

        // --- TRY ROUTES API (FALLBACK for non-transit or if DS completely failed) ---
        if (!routeFound && Route) {
          try {
            // Simplified request to avoid "unknown property placeId" or other SDK mismatch errors
            const request: any = {
              origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
              destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
              travelMode: travelMode === 'TRANSIT' ? 'WALK' : travelMode, // Routes API uses WALK instead of WALKING
              fields: ['path', 'distanceMeters', 'duration'],
            };

            const result = await Route.computeRoutes(request);
            if (isCancelled) return;

            if (result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              const routePolylines = route.createPolylines();
              for (const p of routePolylines) {
                p.setOptions({ strokeColor: color, strokeOpacity: 0.9, strokeWeight: 5 });
                p.setMap(map);
                polylinesRef.current.push(p);
              }
              totalDistance += route.distanceMeters || 0;
              if (route.duration) {
                totalDuration += parseInt(route.duration.replace('s', ''), 10) || 0;
              }
              routeFound = true;
              console.log(`[DEBUG] Segment ${i} found via Routes API fallback`);
            }
          } catch (e) {
            // Silently fail
          }
        }

        // --- FALLBACK TO STRAIGHT LINE ---
        if (!routeFound && !isCancelled) {
          drawSegmentLine(origin, destination, '#9CA3AF');
        }
      }

      if (onRouteCalculated && !isCancelled) {
        onRouteCalculated({ 
          routes: [{ 
            distanceMeters: totalDistance,
            durationMillis: totalDuration * 1000
          }] 
        });
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
      isCancelled = true;
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, locationsString, color]);

  return null;
};
