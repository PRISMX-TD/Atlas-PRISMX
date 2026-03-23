import React from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

export const MapWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <div>Google Maps API key is missing</div>;
  }

  const render = (status: Status) => {
    if (status === Status.LOADING) return <div className="flex h-full items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    if (status === Status.FAILURE) return <div className="flex h-full items-center justify-center bg-gray-50 text-red-500">Error loading map</div>;
    return <>{children}</>;
  };

  return (
    <Wrapper
      apiKey={apiKey}
      render={render}
      libraries={['places', 'geometry', 'marker']}
      version="beta"
      language="zh"
    >
    </Wrapper>
  );
};
