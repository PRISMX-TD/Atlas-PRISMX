import React, { useEffect, useRef } from 'react';

interface MapProps extends google.maps.MapOptions {
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onIdle?: (map: google.maps.Map) => void;
  children?: React.ReactNode;
}

export const Map: React.FC<MapProps> = ({
  onClick,
  onIdle,
  children,
  style,
  className,
  ...options
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<google.maps.Map>();

  useEffect(() => {
    if (ref.current && !map) {
      setMap(new window.google.maps.Map(ref.current, { ...options, mapId: options.mapId || 'DEMO_MAP_ID' }));
    }
  }, [ref, map]);

  // Use deep compare effect for options
  useEffect(() => {
    if (map) {
      // Create a copy of options
      const mapOptions = { ...options };
      
      // We don't want to constantly reset the center on every re-render
      // because it prevents the user from panning the map freely.
      // We'll let the map manage its own center unless explicitly panning.
      if (mapOptions.center) {
        delete mapOptions.center;
      }
      if (mapOptions.zoom) {
        delete mapOptions.zoom;
      }
      
      map.setOptions(mapOptions);
    }
  }, [map, options]);

  // Handle explicit panTo when center prop changes
  useEffect(() => {
    if (map && options.center) {
      // Use setCenter if it's the very first load, panTo otherwise
      // @ts-ignore
      const isFirstLoad = !map.getCenter();
      if (isFirstLoad) {
        map.setCenter(options.center);
        if (options.zoom) map.setZoom(options.zoom);
      } else {
        map.panTo(options.center);
      }
    }
  }, [map, options.center?.lat, options.center?.lng]);

  useEffect(() => {
    if (map) {
      ['click', 'idle'].forEach((eventName) =>
        google.maps.event.clearListeners(map, eventName)
      );

      if (onClick) {
        map.addListener('click', onClick);
      }

      if (onIdle) {
        map.addListener('idle', () => onIdle(map));
      }
    }
  }, [map, onClick, onIdle]);

  return (
    <>
      <div ref={ref} style={style} className={className} />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // @ts-ignore
          return React.cloneElement(child, { map });
        }
      })}
    </>
  );
};
