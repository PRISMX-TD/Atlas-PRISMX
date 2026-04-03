import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { MapWrapper, Map, Marker, RoutePolyline } from '../components/Map';
import { MapPin, Calendar, Clock, Image as ImageIcon, ArrowLeft, Plane, Hotel, Navigation, Share2, Copy, Check, X } from 'lucide-react';
import { format, addDays } from 'date-fns';

export const SharedTripDetail: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  
  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  
  // Sidebar resizer state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sharedSidebarWidth');
    return saved ? parseInt(saved, 10) : 450;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  
  // Share link copy state
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('sharedSidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar) return;
      const newWidth = Math.min(Math.max(e.clientX, 320), 800);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
    };

    if (isDraggingSidebar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingSidebar]);

  useEffect(() => {
    const fetchSharedTrip = async () => {
      if (!shareToken) return;
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_shared_trip_data', {
          p_share_token: shareToken
        });

        if (rpcError) throw rpcError;
        if (!data || !data.trip) throw new Error('行程不存在或已被取消分享');

        setTripData(data);
      } catch (err: any) {
        console.error('Error fetching shared trip:', err);
        setError(err.message || '获取行程失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedTrip();
  }, [shareToken]);

  const mapMarkers = React.useMemo(() => {
    if (!tripData) return [];
    const markers: any[] = [];
    
    // Only show markers for the active day
    const dayLocs = tripData.locations.filter((loc: any) => loc.day_index === activeDay);
    
    dayLocs.forEach((loc: any) => {
      markers.push({
        id: `loc-${loc.id}`,
        lat: loc.latitude,
        lng: loc.longitude,
        title: loc.name,
        type: 'location',
        orderIndex: loc.order_index
      });
    });

    const dayTrans = tripData.transportations.filter((t: any) => t.day_index === activeDay);
    dayTrans.forEach((trans: any) => {
      const customData = trans.custom_data || {};
      if (customData.depLat && customData.depLng) {
        markers.push({
          id: `trans-dep-${trans.id}`,
          lat: customData.depLat,
          lng: customData.depLng,
          title: trans.departure_location,
          type: 'transport_departure'
        });
      }
      if (customData.arrLat && customData.arrLng) {
        markers.push({
          id: `trans-arr-${trans.id}`,
          lat: customData.arrLat,
          lng: customData.arrLng,
          title: trans.arrival_location,
          type: 'transport_arrival'
        });
      }
    });

    const dayAcc = tripData.accommodations.filter((a: any) => a.day_index === activeDay);
    dayAcc.forEach((acc: any) => {
      if (acc.lat && acc.lng) {
        markers.push({
          id: `acc-${acc.id}`,
          lat: acc.lat,
          lng: acc.lng,
          title: acc.name,
          type: 'accommodation'
        });
      }
    });
    
    return markers;
  }, [tripData, activeDay]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">无法访问该行程</h2>
          <p className="text-gray-500">{error || '行程不存在或已被取消分享'}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const { trip, locations, transportations, accommodations } = tripData;
  const startDate = trip.start_date.split('T')[0];
  const endDate = trip.end_date.split('T')[0];
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const computedDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
  const days = Number.isFinite(computedDays) ? Math.max(1, computedDays) : 1;
  const currentDayDate = addDays(new Date(startDate), activeDay);

  // Get items for the current day
  const dayLocations = locations.filter((l: any) => l.day_index === activeDay).map((l: any) => ({
    ...l, 
    type: 'location',
    time: l.custom_data?.time,
    travelMode: l.custom_data?.travelMode || 'TRANSIT'
  }));
  
  const dayTransports = transportations.filter((t: any) => t.day_index === activeDay).flatMap((t: any) => {
    const res = [];
    const depTimeStr = t.departure_time ? t.departure_time.substring(0, 16) : undefined;
    const arrTimeStr = t.arrival_time ? t.arrival_time.substring(0, 16) : undefined;
    
    if (t.departure_location) {
      res.push({
        ...t,
        type: 'transport_departure',
        order_index: t.order_index,
        time: depTimeStr ? depTimeStr.split('T')[1] : undefined
      });
    }
    if (t.arrival_location) {
      res.push({
        ...t,
        type: 'transport_arrival',
        order_index: t.order_index + 0.1,
        time: arrTimeStr ? arrTimeStr.split('T')[1] : undefined
      });
    }
    return res;
  });

  const dayAccommodations = accommodations.filter((a: any) => a.day_index === activeDay).map((a: any) => ({
    ...a,
    type: 'accommodation',
    order_index: a.order_index || 999
  }));

  const allDayItems = [...dayLocations, ...dayTransports, ...dayAccommodations].sort((a, b) => {
    return (a.order_index || 0) - (b.order_index || 0);
  });

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {trip.title}
            </h1>
            <div className="flex items-center text-xs text-gray-500 gap-3 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination || trip.description || '未指定目的地'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {startDate} 至 {endDate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center mr-2">
            <span className="text-xs font-medium text-gray-400">Powered by</span>
            <span className="ml-1 text-sm font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">Atlas PRISMX</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:flex px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
          >
            创建我的行程
          </button>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
            只读模式
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div 
          className="flex flex-col bg-white shrink-0 border-r border-gray-200"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="flex flex-1 overflow-hidden">
            {/* Days Nav */}
            <div className="w-20 border-r border-gray-100 bg-gray-50/50 overflow-y-auto hide-scrollbar py-4 flex flex-col items-center gap-2">
              {Array.from({ length: days }).map((_, i) => {
                const date = addDays(new Date(startDate), i);
                const isActive = activeDay === i;
                
                return (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={`w-14 py-3 rounded-2xl flex flex-col items-center transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={`text-xs font-medium mb-1 ${isActive ? 'text-blue-100' : ''}`}>
                      Day {i + 1}
                    </span>
                    <span className="text-sm font-bold">
                      {format(date, 'MM/dd')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">第 {activeDay + 1} 天</h2>
                  <p className="text-gray-500 mt-1">{format(currentDayDate, 'yyyy年MM月dd日 EEEE')}</p>
                </div>

                <div className="relative space-y-4 before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {allDayItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 relative z-10">
                      <p className="text-gray-500 text-sm">该天还没有安排行程</p>
                    </div>
                  ) : (
                    allDayItems.map((item: any, index: number) => {
                      const isLocation = item.type === 'location';
                      const isTransportDep = item.type === 'transport_departure';
                      const isTransportArr = item.type === 'transport_arrival';
                      const isAccommodation = item.type === 'accommodation';

                      return (
                        <div key={`${item.type}-${item.id}-${index}`} className="relative z-10 flex items-start gap-4">
                          {/* Timeline Node */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 ${
                              isLocation ? 'bg-orange-100 text-orange-600' :
                              isTransportDep || isTransportArr ? 'bg-blue-100 text-blue-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {isLocation ? <MapPin className="w-5 h-5" /> :
                               isTransportDep ? <Plane className="w-5 h-5" /> :
                               isTransportArr ? <Navigation className="w-5 h-5" /> :
                               <Hotel className="w-5 h-5" />}
                            </div>
                            {index < allDayItems.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                            )}
                          </div>

                          {/* Content Card */}
                          <div className="flex-1 pb-4">
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <h3 className="font-bold text-gray-900 text-lg">
                                    {isLocation ? item.name : 
                                     isTransportDep ? item.departure_location : 
                                     isTransportArr ? item.arrival_location : 
                                     item.name}
                                  </h3>
                                  {item.address && (
                                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2" title={item.address}>
                                      {item.address}
                                    </p>
                                  )}
                                  {item.custom_data?.mapUrl && (
                                    <a 
                                      href={item.custom_data.mapUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors mt-2 relative z-20"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Navigation className="w-3 h-3" />
                                      查看 Google Maps
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  <span>{item.time ? `访问: ${item.time}` : '访问: --:--'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          className="w-1 cursor-col-resize bg-transparent hover:bg-blue-400 active:bg-blue-600 z-20 transition-colors"
          onMouseDown={() => setIsDraggingSidebar(true)}
        />

        {/* Map Area */}
        <div className="flex-1 relative bg-gray-100">
          <MapWrapper>
            <Map 
              center={dayLocations.length > 0 ? { lat: dayLocations[0].latitude, lng: dayLocations[0].longitude } : { lat: 35.6762, lng: 139.6503 }}
              zoom={12}
              className="w-full h-full"
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
            >
              {mapMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  title={marker.title}
                  label={marker.type === 'location' ? ((marker.orderIndex || 0) + 1).toString() : undefined}
                  type={marker.type}
                />
              ))}
              <RoutePolyline
                locations={dayLocations.map((l: any) => ({
                  lat: l.latitude, 
                  lng: l.longitude, 
                  placeId: l.custom_data?.placeId, 
                  travelMode: l.travelMode, 
                  time: l.time
                }))}
              />
            </Map>
          </MapWrapper>
          
          {/* Mobile CTA (only visible on small screens) */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 sm:hidden">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-white text-gray-900 shadow-lg rounded-full font-medium text-sm flex items-center gap-2 border border-gray-100"
            >
              创建我的行程
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
