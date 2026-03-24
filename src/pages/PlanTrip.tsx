import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { MapWrapper, Map, Marker, RoutePolyline } from '../components/Map';
import { AutocompleteInput } from '../components/Map/AutocompleteInput';
import { PlacesSearchBox } from '../components/Map/PlacesSearchBox';
import { useTripStore } from '../store/useTripStore';
import { useAuthStore } from '../store/useAuthStore';
import { Calendar, MapPin, Plane, Hotel, Plus, ArrowLeft, Settings2, MoreVertical, X, Trash2, Map as MapIcon, List, ChevronUp, ChevronDown, Clock, Route as RouteIcon, Navigation, Edit2, Share2, Users, Copy, Check } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

export const PlanTrip: React.FC = () => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuthStore();
  const initialTitle = location.state?.title || '新行程';
  const initialDest = location.state?.destination || '未指定目的地';
  const initialStart = location.state?.startDate || new Date().toISOString().split('T')[0];
  const initialEnd = location.state?.endDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  
  const { 
    title, startDate, endDate, locations, transportations, accommodations, destination, isPublic, is_shared, share_token,
    setTitle, setDates, setDestination, activeTripId, deleteTrip, updateTrip, fetchTripDetails, isLoadingActiveTrip,
    addLocation, addTransportation, addAccommodation,
    updateLocation, updateTransportation, updateAccommodation,
    deleteLocation, deleteTransportation, deleteAccommodation, reorderLocations, reorderMixedTimeline,
    collaborators, onlineUsers, fetchCollaborators, subscribeToPresence, updateTripVisibility, updateTripShareStatus
  } = useTripStore();

  const currentUserRole = React.useMemo(() => {
    if (!user) return 'viewer';
    const member = collaborators.find(c => c.id === user.id);
    return member ? member.role : (isPublic ? 'viewer' : 'none');
  }, [collaborators, user, isPublic]);

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor';
  
  const [activeDay, setActiveDay] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  
  // Local state for editing
  const [editTitle, setEditTitle] = useState(title);
  const [editDestination, setEditDestination] = useState(destination || '');
  const [editStartDate, setEditStartDate] = useState(startDate.split('T')[0]);
  const [editEndDate, setEditEndDate] = useState(endDate.split('T')[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sidebar resizer state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 450;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  // Track expanded cards (using a Set or array of string IDs)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add Location from Map Search state
  const [showMapSearchConfirm, setShowMapSearchConfirm] = useState(false);
  const [mapSearchSelectedPlace, setMapSearchSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [mapSearchTargetDay, setMapSearchTargetDay] = useState<number>(0);
  const [mapSearchTime, setMapSearchTime] = useState<string>('');

  // Share Modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState({ type: '', text: '' });
  const [isCopied, setIsCopied] = useState(false);

  React.useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  const [globalConfirmDialog, setGlobalConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  React.useEffect(() => {
    // ALWAYS fetch the latest trip details from the database when opening this page,
    // regardless of what activeTripId currently is. This ensures cross-browser 
    // and cross-session synchronization of child data (locations, etc).
    if (id) {
      fetchTripDetails(id);
      fetchCollaborators(id);
      if (user) {
        subscribeToPresence(id, { 
          id: user.id, 
          name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous', 
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url 
        });
      }
    }
  }, [id, fetchTripDetails, fetchCollaborators, subscribeToPresence, user, profile]);

  React.useEffect(() => {
    // Only set initial state if it's passed from the creation modal and the store is empty/default
    if (location.state && (title === 'My Trip' || title === '新行程' || title === '未命名行程')) {
      setTitle(initialTitle);
      setDates(initialStart, initialEnd);
      setDestination(initialDest);
      setEditTitle(initialTitle);
      setEditDestination(initialDest);
      setEditStartDate(initialStart.split('T')[0]);
      setEditEndDate(initialEnd.split('T')[0]);
    } else if (!isLoadingActiveTrip) {
      // Sync local state when global state changes (e.g. when loading an existing trip)
      setEditTitle(title);
      setEditDestination(destination || '');
      setEditStartDate(startDate.split('T')[0]);
      setEditEndDate(endDate.split('T')[0]);
    }
  }, [location.state, title, destination, startDate, endDate, initialTitle, initialDest, initialStart, initialEnd, setTitle, setDates, setDestination, isLoadingActiveTrip]);

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitle(editTitle);
    setDestination(editDestination);
    
    // Use the YYYY-MM-DD string directly to prevent timezone shift issues
    const newStart = editStartDate;
    const newEnd = editEndDate;
    
    // Update local store state
    setDates(newStart, newEnd);
    
    // If there's an active trip, update it in the database too
    if (activeTripId) {
      await updateTrip(activeTripId, {
        title: editTitle,
        destination: editDestination,
        startDate: newStart,
        endDate: newEnd
      });
    }
    
    setShowEditModal(false);
  };

  const handleDeleteTrip = () => {
    if (activeTripId) {
      deleteTrip(activeTripId);
    }
    navigate('/');
  };

  const confirmDeleteLocation = (id: string) => {
    setGlobalConfirmDialog({
      isOpen: true,
      message: '确定要删除这个地点吗？',
      onConfirm: () => {
        deleteLocation(id);
        setGlobalConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const confirmDeleteTransportation = (id: string) => {
    setGlobalConfirmDialog({
      isOpen: true,
      message: '确定要删除这段交通信息吗？',
      onConfirm: () => {
        deleteTransportation(id);
        setGlobalConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const confirmDeleteAccommodation = (id: string) => {
    setGlobalConfirmDialog({
      isOpen: true,
      message: '确定要删除这个住宿吗？',
      onConfirm: () => {
        deleteAccommodation(id);
        setGlobalConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Helper to calculate day index from a date string relative to trip start date
  const getDayIndexFromDate = (dateStr?: string) => {
    if (!dateStr || !dateStr.includes('T')) return null;
    const itemDate = new Date(dateStr.split('T')[0]);
    const tripStart = new Date(startDate.split('T')[0]);
    itemDate.setHours(0,0,0,0);
    tripStart.setHours(0,0,0,0);
    const diffTime = itemDate.getTime() - tripStart.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const activeDayLocations = locations.filter(l => l.dayIndex === activeDay).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  
  // Separate accommodations into check-in and check-out for cross-day logic
  const activeDayAccommodationsCheckIn = accommodations.filter(a => {
    const checkInDay = getDayIndexFromDate(a.checkIn);
    if (checkInDay !== null) return checkInDay === activeDay;
    return a.dayIndex === activeDay;
  });

  const activeDayAccommodationsCheckOut = accommodations.filter(a => {
    if (!a.checkOut) return false;
    const checkOutDay = getDayIndexFromDate(a.checkOut);
    return checkOutDay === activeDay;
  });

  // Calculate the accommodation for "tonight" (the one covering the night of activeDay)
  const currentNightAccommodation = accommodations.find(a => {
    const checkInDay = getDayIndexFromDate(a.checkIn) ?? a.dayIndex;
    const checkOutDay = a.checkOut ? getDayIndexFromDate(a.checkOut) : checkInDay + 1; // Default 1 night if no checkout
    return activeDay >= checkInDay && activeDay < (checkOutDay || checkInDay + 1);
  });
  
  // Find departures on this day dynamically based on actual date
  const activeDayTransportsDeparture = transportations.filter(t => {
    const depDay = getDayIndexFromDate(t.departureTime);
    if (depDay !== null) return depDay === activeDay;
    return t.dayIndex === activeDay;
  });
  
  // Find arrivals that land on this day dynamically based on actual date
  const activeDayTransportsArrival = transportations.filter(t => {
    const arrDay = getDayIndexFromDate(t.arrivalTime);
    if (arrDay !== null) return arrDay === activeDay;
    return t.dayIndex === activeDay;
  });

  // Helper to extract time for sorting
  const getItemTime = (item: any) => {
    // Return timestamp or a very large number so items without time go to the bottom
    const fallbackTime = 9999999999999;
    
    // Helper to safely extract just the HH:mm portion and convert to minutes since midnight for robust sorting
    const getMinutesFromTimeStr = (timeStr: string) => {
      if (!timeStr) return fallbackTime;
      try {
        // Handle ISO strings like "2026-05-12T08:10:00" or just "08:10"
        const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
        const [hours, minutes] = timePart.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return fallbackTime;
        return hours * 60 + minutes;
      } catch (e) {
        return fallbackTime;
      }
    };

    if (item.itemType === 'transport_departure') return getMinutesFromTimeStr(item.departureTime);
    if (item.itemType === 'transport_arrival') return getMinutesFromTimeStr(item.arrivalTime);
    
    // For locations
    if (item.time) {
      return getMinutesFromTimeStr(item.time);
    }
    
    return fallbackTime;
  };

  // Helper function to format 24h time to Chinese AM/PM format (e.g. "下午 02:00")
  const formatTimeAMPM = (timeStr?: string) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    const [hours, minutes] = timeStr.split(':');
    if (!hours || !minutes) return timeStr;
    const h = parseInt(hours, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? '下午' : '上午';
    const displayHour = h % 12 || 12;
    const paddedHour = displayHour.toString().padStart(2, '0');
    return `${ampm} ${paddedHour}:${minutes}`;
  };

  // Combine all markers to be shown on the map
  const mapMarkers = [
    // Regular locations
    ...locations.filter(l => l.dayIndex === activeDay).map(l => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      title: l.name,
      type: 'location' as const,
      orderIndex: l.orderIndex
    })),
    // Accommodations (both check-in, check-out, and current night should show on map)
    ...Array.from(new globalThis.Map([...activeDayAccommodationsCheckIn, ...activeDayAccommodationsCheckOut, ...(currentNightAccommodation ? [currentNightAccommodation] : [])].map(a => [a.id, a])).values())
      .filter(a => a.lat && a.lng).map(a => ({
        id: a.id,
        lat: a.lat!,
        lng: a.lng!,
        title: a.name,
        type: 'accommodation' as const
      })),
    // Transport Departures
    ...activeDayTransportsDeparture.filter(t => t.depLat && t.depLng).map(t => ({
      id: `dep-${t.id}`,
      lat: t.depLat!,
      lng: t.depLng!,
      title: `${t.departure} (出发)`,
      type: 'transport_departure' as const
    })),
    // Transport Arrivals (using the same cross-day logic as the timeline)
    ...activeDayTransportsArrival.filter(t => t.arrLat && t.arrLng).map(t => ({
      id: `arr-${t.id}`,
      lat: t.arrLat!,
      lng: t.arrLng!,
      title: `${t.arrival} (到达)`,
      type: 'transport_arrival' as const
    }))
  ];
  console.log('[DEBUG] Map Markers to render:', mapMarkers);

  // Combine and sort items for mixed timeline using purely orderIndex
  const mixedTimeline = [
    ...activeDayLocations.map(l => ({ ...l, itemType: 'location' as const })),
    ...activeDayTransportsDeparture.map(t => ({ ...t, itemType: 'transport_departure' as const })),
    ...activeDayTransportsArrival.map(t => ({ ...t, itemType: 'transport_arrival' as const }))
  ].sort((a, b) => {
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });

  // Directions state
  const [routeInfo, setRouteInfo] = useState<{distance: string, duration: string} | null>(null);

  const handleRouteCalculated = (result: any) => {
    if (result.routes && result.routes.length > 0) {
      const route = result.routes[0];
      let totalDist = 0;
      let totalDur = 0;

      if (route.legs && route.legs.length > 0) {
        route.legs.forEach((leg: any) => {
          totalDist += leg.distanceMeters || leg.distance?.value || 0;
          totalDur += leg.durationMillis || leg.duration?.value || 0;
        });
      } else {
        totalDist = route.distanceMeters || 0;
        totalDur = route.durationMillis || 0;
      }

      // Convert to readable format
      const distStr = totalDist > 1000 ? `${(totalDist / 1000).toFixed(1)} km` : `${totalDist} m`;

      const hours = Math.floor(totalDur / 3600);
      const minutes = Math.floor((totalDur % 3600) / 60);
      const durStr = hours > 0 ? `${hours}小时 ${minutes}分钟` : `${minutes}分钟`;

      setRouteInfo({ distance: distStr, duration: durStr });
    }
  };

  // Reset route info when changing days or locations
  React.useEffect(() => {
    setRouteInfo(null);
  }, [activeDay, locations.length]);

  const handleMoveLocation = (index: number, direction: 'up' | 'down') => {
    const newMixed = [...mixedTimeline];
    
    // We can swap any item with its adjacent item
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMixed.length) return;

    // Swap their positions in the mixed array
    [newMixed[index], newMixed[targetIndex]] = [newMixed[targetIndex], newMixed[index]];

    // Extract the new relative order and their types
    const newOrder = newMixed.map(item => ({
      id: item.id,
      type: item.itemType
    }));

    // Save the new order to the store/DB
    reorderMixedTimeline(activeDay, newOrder);
  };

  const reorderItem = (index: number, delta: number) => {
    handleMoveLocation(index, delta < 0 ? 'up' : 'down');
  };

  // Helper to parse YYYY-MM-DD into a local Date object safely to avoid timezone shifts
  const parseLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const start = parseLocal(startDate);
  const end = parseLocal(endDate);
  const totalDays = Math.max(1, differenceInDays(end, start) + 1);
  
  const [showFabMenu, setShowFabMenu] = useState(false);
  
  // Modals state
  const [showAddTransport, setShowAddTransport] = useState(false);
  const [showAddAccommodation, setShowAddAccommodation] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const openEditLocation = (loc: any) => {
    setEditingId(loc.id);
    setLocName(loc.name);
    setLocAddress(loc.address || '');
    setLocLat(loc.lat);
    setLocLng(loc.lng);
    setLocPlaceId(loc.placeId || null);
    setShowAddLocation(true);
  };

  const openEditTransport = (t: any) => {
    setEditingId(t.id);
    setTransType(t.type);
    setTransDep(t.departure);
    setTransArr(t.arrival);
    setTransDepTime(t.departureTime?.split('T')[1]?.substring(0, 5) || '');
    setTransDepDate(t.departureTime?.split('T')[0] || '');
    setTransArrTime(t.arrivalTime?.split('T')[1]?.substring(0, 5) || '');
    setTransArrDate(t.arrivalTime?.split('T')[0] || '');
    setTransFlightNum(t.flightNumber || '');
    setTransPnr(t.pnr || '');
    setTransDepLat(t.depLat);
    setTransDepLng(t.depLng);
    setTransArrLat(t.arrLat);
    setTransArrLng(t.arrLng);
    setShowAddTransport(true);
  };

  const openEditAccommodation = (a: any) => {
    setEditingId(a.id);
    setAccSearchMode(false); // Default to manual mode for editing
    setAccName(a.name);
    setAccAddress(a.address || '');
    setAccCheckInDate(a.checkIn?.split('T')[0] || '');
    setAccCheckInTime(a.checkIn?.split('T')[1]?.substring(0, 5) || '');
    setAccCheckOutDate(a.checkOut?.split('T')[0] || '');
    setAccCheckOutTime(a.checkOut?.split('T')[1]?.substring(0, 5) || '');
    setAccLat(a.lat || null);
    setAccLng(a.lng || null);
    setAccPlaceId(a.placeId || null);
    setAccPhotoUrl(a.photoUrl || null);
    setAccMapUrl(a.mapUrl || '');
    setShowAddAccommodation(true);
  };

  // Form states
  const [transType, setTransType] = useState('flight');
  const [transDep, setTransDep] = useState('');
  const [transDepLat, setTransDepLat] = useState<number | undefined>();
  const [transDepLng, setTransDepLng] = useState<number | undefined>();
  const [transArr, setTransArr] = useState('');
  const [transArrLat, setTransArrLat] = useState<number | undefined>();
  const [transArrLng, setTransArrLng] = useState<number | undefined>();
  const [transDepTime, setTransDepTime] = useState('');
  const [transArrTime, setTransArrTime] = useState('');
  const [transDepDate, setTransDepDate] = useState('');
  const [transArrDate, setTransArrDate] = useState('');
  const [transFlightNum, setTransFlightNum] = useState('');
  const [transPnr, setTransPnr] = useState('');

  const [accName, setAccName] = useState('');
  const [accSearchMode, setAccSearchMode] = useState(true);
  const [accAddress, setAccAddress] = useState('');
  const [accCheckInDate, setAccCheckInDate] = useState('');
  const [accCheckInTime, setAccCheckInTime] = useState('');
  const [accCheckOutDate, setAccCheckOutDate] = useState('');
  const [accCheckOutTime, setAccCheckOutTime] = useState('');
  const [accLat, setAccLat] = useState<number | null>(null);
  const [accLng, setAccLng] = useState<number | null>(null);
  const [accPlaceId, setAccPlaceId] = useState<string | null>(null);
  const [accPhotoUrl, setAccPhotoUrl] = useState<string | null>(null);
  const [accMapUrl, setAccMapUrl] = useState('');
  
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [locPlaceId, setLocPlaceId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetTransportForm = () => {
    setTransType('flight'); setTransDep(''); setTransDepLat(undefined); setTransDepLng(undefined);
    setTransArr(''); setTransArrLat(undefined); setTransArrLng(undefined);
    setTransDepTime(''); setTransArrTime(''); setTransDepDate(''); setTransArrDate(''); 
    setTransFlightNum(''); setTransPnr(''); setEditingId(null);
  };

  const resetAccommodationForm = () => {
    setAccName(''); setAccAddress(''); setAccCheckInDate(''); setAccCheckInTime('');
    setAccCheckOutDate(''); setAccCheckOutTime(''); setAccLat(null); setAccLng(null);
    setAccPlaceId(null); setAccPhotoUrl(null); setAccMapUrl(''); setEditingId(null);
    setAccSearchMode(true);
  };

  const resetLocationForm = () => {
    setLocName(''); setLocAddress(''); setLocLat(null); setLocLng(null); setLocPlaceId(null); setEditingId(null);
  };

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.name) setLocName(place.name);
    if (place.formatted_address) setLocAddress(place.formatted_address);
    if (place.place_id) setLocPlaceId(place.place_id);
    if (place.geometry?.location) {
      setLocLat(place.geometry.location.lat());
      setLocLng(place.geometry.location.lng());
    }
  };

  const handleAddTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transDep || !transArr) {
      setGlobalConfirmDialog({
        isOpen: true,
        message: "请填写出发地和目的地",
        onConfirm: () => {}
      });
      return;
    }
    
    // Combine date and time
    let finalDepTime = '';
    if (transDepDate && transDepTime) {
      finalDepTime = `${transDepDate}T${transDepTime}:00`;
    } else if (transDepTime) {
      finalDepTime = transDepTime;
    }
    
    let finalArrTime = '';
    if (transArrDate && transArrTime) {
      finalArrTime = `${transArrDate}T${transArrTime}:00`;
    } else if (transArrTime) {
      finalArrTime = transArrTime;
    }

    // Determine accurate dayIndex from the departure date if available, fallback to activeDay
    const calcDayIndex = getDayIndexFromDate(finalDepTime) ?? activeDay;

    if (editingId) {
      await updateTransportation(editingId, {
        type: transType,
        departure: transDep,
        arrival: transArr,
        departureTime: finalDepTime,
        arrivalTime: finalArrTime,
        dayIndex: calcDayIndex,
        flightNumber: transType === 'flight' ? transFlightNum : undefined,
        pnr: transType === 'flight' ? transPnr : undefined,
        depLat: transDepLat,
        depLng: transDepLng,
        arrLat: transArrLat,
        arrLng: transArrLng
      });
    } else {
      await addTransportation({
        type: transType,
        departure: transDep,
        arrival: transArr,
        departureTime: finalDepTime,
        arrivalTime: finalArrTime,
        dayIndex: calcDayIndex,
        flightNumber: transType === 'flight' ? transFlightNum : undefined,
        pnr: transType === 'flight' ? transPnr : undefined,
        depLat: transDepLat,
        depLng: transDepLng,
        arrLat: transArrLat,
        arrLng: transArrLng
      });
    }
    setShowAddTransport(false);
    setShowFabMenu(false);
    // Reset
    resetTransportForm();
  };

  const handleAddAccommodation = async (e: React.FormEvent) => {
    e.preventDefault();
    const checkInStr = accCheckInDate ? `${accCheckInDate}T${accCheckInTime || '14:00'}:00` : '';
    const checkOutStr = accCheckOutDate ? `${accCheckOutDate}T${accCheckOutTime || '11:00'}:00` : '';
    
    // We should compute dayIndex based on the check-in date
    let dayIndexToUse = activeDay;
    if (checkInStr) {
      const idx = getDayIndexFromDate(checkInStr);
      if (idx !== null) {
        dayIndexToUse = idx;
      }
    }

    let finalLat = accLat;
    let finalLng = accLng;

    // Try to auto-geocode if manual mode and no lat/lng provided
    if (!accSearchMode && finalLat === null && finalLng === null) {
      // 1. Try to extract from URL
      if (accMapUrl) {
        const match = accMapUrl.match(/(-?\d{1,2}\.\d+)[,%]\s*(-?\d{1,3}\.\d+)/);
        if (match) {
          finalLat = parseFloat(match[1]);
          finalLng = parseFloat(match[2]);
        }
      }
      
      // 2. Try Google Geocoder as fallback
      if (finalLat === null && window.google) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const result = await geocoder.geocode({ address: accName });
          if (result.results && result.results.length > 0) {
            finalLat = result.results[0].geometry.location.lat();
            finalLng = result.results[0].geometry.location.lng();
          }
        } catch (err) {
          console.warn('Geocoding failed for manual accommodation:', err);
        }
      }
    }

    if (editingId) {
      await updateAccommodation(editingId, {
        name: accName,
        address: accAddress,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        dayIndex: dayIndexToUse,
        lat: finalLat || undefined,
        lng: finalLng || undefined,
        placeId: accPlaceId || undefined,
        photoUrl: accPhotoUrl || undefined,
        mapUrl: accMapUrl || undefined
      });
    } else {
      await addAccommodation({
        name: accName,
        address: accAddress,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        dayIndex: dayIndexToUse,
        lat: finalLat || undefined,
        lng: finalLng || undefined,
        placeId: accPlaceId || undefined,
        photoUrl: accPhotoUrl || undefined,
        mapUrl: accMapUrl || undefined
      });
    }
    setShowAddAccommodation(false);
    setShowFabMenu(false);
    resetAccommodationForm();
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateLocation(editingId, {
        name: locName,
        lat: locLat ?? (35.6762 + (Math.random() - 0.5) * 0.1),
        lng: locLng ?? (139.6503 + (Math.random() - 0.5) * 0.1),
        address: locAddress,
        placeId: locPlaceId || undefined,
        dayIndex: activeDay
      });
    } else {
      await addLocation({
        name: locName,
        lat: locLat ?? (35.6762 + (Math.random() - 0.5) * 0.1), // Fallback coordinates
        lng: locLng ?? (139.6503 + (Math.random() - 0.5) * 0.1),
        address: locAddress,
        placeId: locPlaceId || undefined,
        dayIndex: activeDay
      });
    }
    setShowAddLocation(false);
    setShowFabMenu(false);
    resetLocationForm();
  };

  if (isLoadingActiveTrip) {
    return (
      <div className="flex h-screen h-[100dvh] w-full bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <MapWrapper>
      <div className="flex h-screen h-[100dvh] w-full bg-gray-50 overflow-hidden relative">
        <style>{`
          @media (min-width: 768px) {
            .resizable-sidebar {
              width: ${sidebarWidth}px !important;
            }
            .fab-position {
              left: ${sidebarWidth}px !important;
              transform: translateX(-6rem) !important;
              margin-left: 0 !important;
            }
          }
        `}</style>
        {/* Sidebar / Timeline */}
        <div className={`w-full bg-white shadow-2xl flex-col z-20 h-full shrink-0 relative resizable-sidebar ${showMobileMap ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Drag Handle */}
        <div 
          className="hidden md:block absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-[100] group"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSidebar(true);
          }}
        >
          <div className={`w-0.5 h-full mx-auto transition-colors ${isDraggingSidebar ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-300'}`} />
        </div>

        {/* Header - Clean White Design */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-4 bg-white">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
            <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px] sm:max-w-xs">{destination || '未指定目的地'}</span>
              <span className="mx-1 text-gray-300">|</span>
              <Calendar className="w-3.5 h-3.5" />
              {canEdit ? (
                `${startDate.split('T')[0]} 至 ${endDate.split('T')[0]}`
              ) : (
                `${totalDays}天经典路线`
              )}
            </div>
          </div>
          
          {/* Online Users Avatars */}
          <div className="hidden md:flex items-center -space-x-2 mr-2">
            {onlineUsers.slice(0, 3).map((ou, i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs overflow-hidden z-10"
                title={`${ou.name} (在线)`}
              >
                {ou.avatar_url ? (
                  <img src={ou.avatar_url} alt={ou.name} className="w-full h-full object-cover" />
                ) : (
                  ou.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
            ))}
            {onlineUsers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs z-0">
                +{onlineUsers.length - 3}
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowShareModal(true)} 
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors text-sm font-medium"
          >
            <Share2 className="w-4 h-4" />
            分享
          </button>

          {canEdit && (
            <button 
              onClick={() => {
                setEditTitle(title);
                setEditDestination(destination || '');
                setEditStartDate(startDate.split('T')[0]);
                setEditEndDate(endDate.split('T')[0]);
                setShowEditModal(true);
              }} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"
              title="编辑行程信息"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Vertical Days Selector */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col overflow-y-auto hide-scrollbar py-4 items-center gap-2">
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayDate = addDays(start, i);
              const isActive = activeDay === i;
              return (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
                  }`}
                >
                  <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                    Day
                  </span>
                  <span className="text-base sm:text-lg font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {canEdit && (
                    <span className={`text-[8px] sm:text-[10px] font-medium mt-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                      {format(dayDate, 'MM/dd')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Daily Content Area */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 bg-white relative">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">第 {activeDay + 1} 天</h2>
                {canEdit && <p className="text-gray-500 mt-1">{format(addDays(start, activeDay), 'yyyy年MM月dd日 EEEE')}</p>}
              </div>
            </div>

            {/* Current Night Accommodation Banner */}
            {currentNightAccommodation && (() => {
              const isExpanded = expandedCards.has(`acc-${currentNightAccommodation.id}`);
              return (
              <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white group transition-all duration-200">
                <div className="bg-purple-600 px-4 py-2.5 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <Hotel className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-wider">今晚住宿</span>
                  </div>
                  <div className="flex items-center gap-3 transition-opacity">
                    {(currentNightAccommodation.mapUrl || (currentNightAccommodation.lat && currentNightAccommodation.lng)) && (
                      <a 
                        href={currentNightAccommodation.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${currentNightAccommodation.lat},${currentNightAccommodation.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-purple-200 transition-colors flex items-center gap-1"
                        title="导航到酒店"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">导航</span>
                      </a>
                    )}
                    <div className="w-px h-3 bg-purple-400/50 hidden sm:block"></div>
                    {canEdit && (
                      <>
                        <button 
                          onClick={() => openEditAccommodation(currentNightAccommodation)}
                          className="hover:text-purple-200 transition-colors"
                          title="编辑住宿"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDeleteAccommodation(currentNightAccommodation.id)}
                          className="hover:text-red-300 transition-colors"
                          title="删除住宿"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Basic Info Row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image Thumbnail */}
                    <div className="w-full sm:w-32 h-32 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center relative border border-gray-100">
                      {currentNightAccommodation.photoUrl ? (
                        <img 
                          src={currentNightAccommodation.photoUrl.startsWith('https') ? currentNightAccommodation.photoUrl : `https://places.googleapis.com/v1/${currentNightAccommodation.photoUrl}/media?maxHeightPx=400&maxWidthPx=400&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`} 
                          alt={currentNightAccommodation.name} 
                          className="w-full h-full object-cover absolute inset-0" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Hotel className="w-8 h-8 text-gray-300 z-0" />
                      )}
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-lg font-bold text-gray-900 truncate mb-1" title={currentNightAccommodation.name}>{currentNightAccommodation.name}</h3>
                      {currentNightAccommodation.address && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3" title={currentNightAccommodation.address}>{currentNightAccommodation.address}</p>
                      )}
                      
                      {/* Compact Check-in Row (Read-only) */}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-sm text-gray-700 font-medium shrink-0">入住:</span>
                          <span className="text-sm text-gray-600 font-medium bg-purple-50/50 px-2 py-1 rounded-lg border border-purple-100/50">
                            {formatTimeAMPM(currentNightAccommodation.checkIn?.split('T')[1]?.substring(0, 5) || '14:00')}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => toggleCardExpansion(`acc-${currentNightAccommodation.id}`)}
                          className="flex items-center justify-center w-8 h-8 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 transition-colors shrink-0 shadow-sm"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail View - FULL WIDTH */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col gap-4">
                        {/* Check-in Row */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-purple-600 font-medium">入住</label>
                          <div className="flex flex-wrap sm:flex-nowrap gap-2">
                            <div className="flex-1 min-w-[130px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-purple-400 transition-shadow">
                              <input
                                disabled={!canEdit}
                                type="date"
                                value={currentNightAccommodation.checkIn?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const date = e.target.value;
                                  const time = currentNightAccommodation.checkIn?.split('T')[1] || '14:00';
                                  const newDayIndex = getDayIndexFromDate(`${date}T${time}`) ?? currentNightAccommodation.dayIndex;
                                  updateAccommodation(currentNightAccommodation.id, { 
                                    checkIn: `${date}T${time}`,
                                    dayIndex: newDayIndex
                                  });
                                }}
                                className="text-sm bg-transparent outline-none text-gray-700 w-full"
                              />
                            </div>
                            <div className="flex-1 sm:flex-none sm:w-[7.5rem] min-w-[100px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-purple-400 transition-shadow">
                              <input
                                disabled={!canEdit}
                                type="time"
                                value={currentNightAccommodation.checkIn?.split('T')[1]?.substring(0, 5) || '14:00'}
                                onChange={(e) => {
                                  const time = e.target.value;
                                  const date = currentNightAccommodation.checkIn?.split('T')[0] || format(addDays(start, activeDay), 'yyyy-MM-dd');
                                  const newDayIndex = getDayIndexFromDate(`${date}T${time}`) ?? currentNightAccommodation.dayIndex;
                                  updateAccommodation(currentNightAccommodation.id, { 
                                    checkIn: `${date}T${time}`,
                                    dayIndex: newDayIndex
                                  });
                                }}
                                className="text-sm bg-transparent outline-none font-mono text-gray-700 w-full"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Check-out Row */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-gray-500 font-medium">退房</label>
                          <div className="flex flex-wrap sm:flex-nowrap gap-2">
                            <div className="flex-1 min-w-[130px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-gray-400 transition-shadow">
                              <input
                                type="date"
                                value={currentNightAccommodation.checkOut?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const date = e.target.value;
                                  const time = currentNightAccommodation.checkOut?.split('T')[1] || '11:00';
                                  updateAccommodation(currentNightAccommodation.id, { checkOut: `${date}T${time}` });
                                }}
                                className="text-sm bg-transparent outline-none text-gray-700 w-full"
                              />
                            </div>
                            <div className="flex-1 sm:flex-none sm:w-[7.5rem] min-w-[100px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-gray-400 transition-shadow">
                              <input
                                type="time"
                                value={currentNightAccommodation.checkOut?.split('T')[1]?.substring(0, 5) || '11:00'}
                                onChange={(e) => {
                                  const time = e.target.value;
                                  const date = currentNightAccommodation.checkOut?.split('T')[0] || format(addDays(start, activeDay + 1), 'yyyy-MM-dd');
                                  updateAccommodation(currentNightAccommodation.id, { checkOut: `${date}T${time}` });
                                }}
                                className="text-sm bg-transparent outline-none font-mono text-gray-700 w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* Route Info Badge */}
            {activeDayLocations.length > 1 && routeInfo && (
              <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RouteIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">路线规划</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 opacity-70" /> {routeInfo.distance}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 opacity-70" /> {routeInfo.duration}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="relative before:absolute before:left-[15px] before:top-0 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {/* Render the list */}
                {mixedTimeline.map((item, index) => {
                  if (item.itemType === 'transport_departure') {
                  const t = item as any;
                  const isFlight = t.type === 'flight' || t.type === '航班';
                  const isExpanded = expandedCards.has(`trans-dep-${t.id}`);
                  
                  if (isFlight) {
                    return (
                      <div key={`trans-dep-${t.id}`} className="relative flex items-start gap-4 mb-6">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 z-10 relative mt-2">
                          <Plane className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 relative">
                          <div className="absolute top-3 right-3 flex gap-2">
                            {t.depLat && t.depLng && (
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${t.depLat},${t.depLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="导航到机场"
                              >
                                <Navigation className="w-4 h-4" />
                              </a>
                            )}
                            {canEdit && (
                              <>
                                <button onClick={() => openEditTransport(t)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="编辑整个航班">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => confirmDeleteTransportation(t.id)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="删除整个航班">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                          
                          <div className="text-xs font-bold text-blue-600 tracking-wider mb-1">FLIGHT DEPARTURE</div>
                          <div className="font-bold text-gray-900 pr-24 text-lg leading-tight mb-3 truncate" title={t.departure}>{t.departure}</div>
                          
                          <div className="flex flex-wrap items-center justify-between mt-2 pt-3 border-t border-gray-50 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                              <span className="text-sm text-gray-600 font-medium shrink-0">起飞：</span>
                              <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                                {formatTimeAMPM(t.departureTime?.split('T')[1]?.substring(0, 5) || '--:--')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {/* Sort buttons for flight departure */}
                              {canEdit && (
                                <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white h-8">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, -1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors border-r border-gray-200 flex items-center justify-center active:bg-orange-100"
                                    title="向上移动"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, 1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center active:bg-orange-100"
                                    title="向下移动"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => toggleCardExpansion(`trans-dep-${t.id}`)}
                                className="flex items-center justify-center w-8 h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-500 transition-colors shadow-sm"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-xs text-gray-500 font-medium">起飞</label>
                                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                    <div className="flex-1 min-w-[130px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-400 transition-shadow">
                                      <input 
                                        disabled={!canEdit}
                                        type="date" 
                                        value={t.departureTime?.split('T')[0] || ''} 
                                        onChange={(e) => {
                                          const date = e.target.value;
                                          const time = t.departureTime?.split('T')[1] || '00:00';
                                          const newDayIndex = getDayIndexFromDate(`${date}T${time}`) ?? t.dayIndex;
                                          updateTransportation(t.id, { 
                                            departureTime: `${date}T${time}`,
                                            dayIndex: newDayIndex
                                          });
                                        }} 
                                        className="text-sm bg-transparent outline-none text-gray-700 w-full" 
                                      />
                                    </div>
                                    <div className="flex-1 sm:flex-none sm:w-[7.5rem] min-w-[100px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-400 transition-shadow">
                                      <input 
                                        disabled={!canEdit}
                                        type="time" 
                                        value={t.departureTime?.split('T')[1]?.substring(0, 5) || ''} 
                                        onChange={(e) => {
                                          const time = e.target.value;
                                          const date = t.departureTime?.split('T')[0] || startDate.split('T')[0];
                                          const newDayIndex = getDayIndexFromDate(`${date}T${time}`) ?? t.dayIndex;
                                          updateTransportation(t.id, { 
                                            departureTime: `${date}T${time}`,
                                            dayIndex: newDayIndex
                                          });
                                        }} 
                                        className="text-sm bg-transparent outline-none font-mono text-gray-700 w-full" 
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <label className="text-xs text-gray-500 font-medium">航班号</label>
                                    <input 
                                      disabled={!canEdit}
                                      type="text" 
                                      value={t.flightNumber || ''} 
                                      onChange={(e) => updateTransportation(t.id, { flightNumber: e.target.value })} 
                                      placeholder="如 MH318" 
                                      className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-blue-400 text-gray-600 uppercase w-full" 
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <label className="text-xs text-gray-500 font-medium">预订号/PNR</label>
                                    <input 
                                      disabled={!canEdit}
                                      type="text" 
                                      value={t.pnr || ''} 
                                      onChange={(e) => updateTransportation(t.id, { pnr: e.target.value })} 
                                      placeholder="如 X8A9B2" 
                                      className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-blue-400 text-gray-600 uppercase w-full" 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`trans-dep-${t.id}`} className="relative flex items-start gap-4 mb-6">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-gray-100 text-gray-600 shadow shrink-0 z-10 relative mt-2">
                        <RouteIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 relative">
                        <div className="absolute top-3 right-3 flex gap-2">
                          {t.depLat && t.depLng && (
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${t.depLat},${t.depLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                              title="导航到出发地"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {canEdit && (
                            <>
                              <button 
                                onClick={() => openEditTransport(t)}
                                className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                title="编辑交通"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => confirmDeleteTransportation(t.id)}
                                className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="删除交通"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-bold text-gray-500 tracking-wider mb-1">
                          {t.type === 'train' ? '火车/高铁' : t.type === 'bus' ? '巴士' : t.type === 'driving' ? '自驾' : t.type} 出发
                        </div>
                        <div className="text-lg font-bold text-gray-800 pr-24 mb-3 truncate" title={t.departure}>
                          {t.departure}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between mt-2 pt-3 border-t border-gray-50 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-600 font-medium shrink-0">出发：</span>
                            <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                              {formatTimeAMPM(t.departureTime?.split('T')[1]?.substring(0, 5) || '--:--')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            {/* Sort buttons for transport departure */}
                            {canEdit && (
                              <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white h-8">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, -1); }}
                                  className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors border-r border-gray-200 flex items-center justify-center active:bg-orange-100"
                                  title="向上移动"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); reorderItem(index, 1); }}
                                  className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center active:bg-orange-100"
                                  title="向下移动"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <button 
                              onClick={() => toggleCardExpansion(`trans-dep-${t.id}`)}
                              className="flex items-center justify-center w-8 h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-500 transition-colors shadow-sm"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-1 min-w-0">
                                <label className="text-xs text-gray-500 font-medium">出发日期</label>
                                <input
                                  type="date"
                                  value={t.departureTime?.split('T')[0] || ''}
                                  onChange={(e) => {
                                    const date = e.target.value;
                                    const time = t.departureTime?.split('T')[1] || '00:00';
                                    const newDayIndex = getDayIndexFromDate(`${date}T${time}`) ?? t.dayIndex;
                                    updateTransportation(t.id, { 
                                      departureTime: `${date}T${time}`,
                                      dayIndex: newDayIndex
                                    });
                                  }}
                                  className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-gray-400 text-gray-600 w-full min-w-[140px]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.itemType === 'transport_arrival') {
                  const t = item as any;
                  const isFlight = t.type === 'flight' || t.type === '航班';
                  const isExpanded = expandedCards.has(`trans-arr-${t.id}`);
                  
                  if (isFlight) {
                    return (
                      <div key={`trans-arr-${t.id}`} className="relative flex items-start gap-4 mb-6">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-blue-50 text-blue-400 shadow-sm shrink-0 z-10 relative mt-2">
                          <Plane className="w-3.5 h-3.5 rotate-90" />
                        </div>
                        <div className="flex-1 min-w-0 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 relative opacity-90">
                          <div className="absolute top-3 right-3 flex gap-2">
                            {t.arrLat && t.arrLng && (
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${t.arrLat},${t.arrLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="导航到机场"
                              >
                                <Navigation className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          
                          <div className="text-xs font-bold text-gray-500 tracking-wider mb-1">FLIGHT ARRIVAL</div>
                          <div className="font-bold text-gray-800 pr-16 text-lg leading-tight mb-3 truncate" title={t.arrival}>{t.arrival}</div>
                          
                          <div className="flex flex-wrap items-center justify-between mt-2 pt-3 border-t border-gray-50 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Clock className="w-4 h-4 text-blue-300 shrink-0" />
                              <span className="text-sm text-gray-500 font-medium shrink-0">降落：</span>
                              <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                                {formatTimeAMPM(t.arrivalTime?.split('T')[1]?.substring(0, 5) || '--:--')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {/* Sort buttons for flight arrival */}
                              {canEdit && (
                                <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white h-8">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, -1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors border-r border-gray-200 flex items-center justify-center active:bg-orange-100"
                                    title="向上移动"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, 1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center active:bg-orange-100"
                                    title="向下移动"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => toggleCardExpansion(`trans-arr-${t.id}`)}
                                className="flex items-center justify-center w-8 h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-400 transition-colors shadow-sm"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-xs text-gray-400 font-medium">降落</label>
                                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                    <div className="flex-1 min-w-[130px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-300 transition-shadow">
                                      <input 
                                        disabled={!canEdit}
                                        type="date" 
                                        value={t.arrivalTime?.split('T')[0] || ''} 
                                        onChange={(e) => {
                                          const date = e.target.value;
                                          const time = t.arrivalTime?.split('T')[1] || '00:00';
                                          updateTransportation(t.id, { arrivalTime: `${date}T${time}` });
                                        }} 
                                        className="text-sm bg-transparent outline-none text-gray-700 w-full" 
                                      />
                                    </div>
                                    <div className="flex-1 sm:flex-none sm:w-[7.5rem] min-w-[100px] flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-300 transition-shadow">
                                      <input 
                                        disabled={!canEdit}
                                        type="time" 
                                        value={t.arrivalTime?.split('T')[1]?.substring(0, 5) || ''} 
                                        onChange={(e) => {
                                          const time = e.target.value;
                                          const date = t.arrivalTime?.split('T')[0] || startDate.split('T')[0];
                                          updateTransportation(t.id, { arrivalTime: `${date}T${time}` });
                                        }} 
                                        className="text-sm bg-transparent outline-none font-mono text-gray-700 w-full" 
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`trans-arr-${t.id}`} className="relative flex items-start gap-4 mb-6">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-gray-50 text-gray-400 shadow-sm shrink-0 z-10 relative mt-2">
                        <RouteIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 relative opacity-90">
                        <div className="absolute top-3 right-3 flex gap-2">
                          {t.arrLat && t.arrLng && (
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${t.arrLat},${t.arrLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                              title="导航到目的地"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-xs font-bold text-gray-500 tracking-wider mb-1">
                          {t.type === 'train' ? '火车/高铁' : t.type === 'bus' ? '巴士' : t.type === 'driving' ? '自驾' : t.type} 到达
                        </div>
                        <div className="text-lg font-bold text-gray-800 pr-16 mb-3 truncate" title={t.arrival}>
                          {t.arrival}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between mt-2 pt-3 border-t border-gray-50 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-600 font-medium shrink-0">到达：</span>
                            <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                              {formatTimeAMPM(t.arrivalTime?.split('T')[1]?.substring(0, 5) || '--:--')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {/* Sort buttons for transport arrival */}
                              {canEdit && (
                                <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white h-8">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, -1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors border-r border-gray-200 flex items-center justify-center active:bg-orange-100"
                                    title="向上移动"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, 1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center active:bg-orange-100"
                                    title="向下移动"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <button 
                                onClick={() => toggleCardExpansion(`trans-arr-${t.id}`)}
                              className="flex items-center justify-center w-8 h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-500 transition-colors shadow-sm"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-1 min-w-0">
                                <label className="text-xs text-gray-500 font-medium">到达日期</label>
                                <input
                                  type="date"
                                  value={t.arrivalTime?.split('T')[0] || ''}
                                  onChange={(e) => {
                                    const date = e.target.value;
                                    const time = t.arrivalTime?.split('T')[1] || '00:00';
                                    updateTransportation(t.id, { arrivalTime: `${date}T${time}` });
                                  }}
                                  className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-gray-400 text-gray-600 w-full min-w-[140px]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.itemType === 'location') {
                  const l = item as any;
                  // Determine travel mode from previous location to this location
                  let navTravelMode = 'transit'; // default
                  
                  // Find previous location in mixed timeline
                  let prevLoc = null;
                  for (let i = index - 1; i >= 0; i--) {
                    if (mixedTimeline[i].itemType === 'location') {
                      prevLoc = mixedTimeline[i] as any;
                      break;
                    }
                  }

                  if (prevLoc) {
                    const prevTravelMode = prevLoc.travelMode;
                    if (prevTravelMode === 'DRIVING') navTravelMode = 'driving';
                    else if (prevTravelMode === 'WALKING') navTravelMode = 'walking';
                    else if (prevTravelMode === 'BICYCLING') navTravelMode = 'bicycling';
                    else navTravelMode = 'transit';
                  }

                  // Find if there's a next location to show the travel mode selector
                  let hasNextLoc = false;
                  for (let i = index + 1; i < mixedTimeline.length; i++) {
                    if (mixedTimeline[i].itemType === 'location') {
                      hasNextLoc = true;
                      break;
                    }
                  }

                  const isExpanded = expandedCards.has(`loc-${l.id}`);

                  return (
                    <React.Fragment key={`loc-${l.id}`}>
                      <div className="relative flex items-start gap-4 mb-6">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-orange-100 text-orange-600 shadow shrink-0 z-10 relative mt-2">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 relative flex flex-col">
                          {/* Top Right Action Icons */}
                          <div className="absolute top-3 right-3 flex gap-2 z-20">
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}&travelmode=${navTravelMode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title="导航到这里"
                            >
                              <Navigation className="w-4 h-4" />
                            </a>
                            {canEdit && (
                              <>
                                <button 
                                  onClick={() => openEditLocation(l)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                                  title="编辑"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => confirmDeleteLocation(l.id)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Title and Address */}
                          <h3 className="font-bold text-gray-900 pr-24 text-lg leading-tight mb-1 truncate" title={l.name}>{l.name}</h3>
                          {l.address && <p className="text-sm text-gray-500 pr-24 leading-relaxed mb-3 line-clamp-2" title={l.address}>{l.address}</p>}

                          {/* Time, Sort, and Expand Toggle Row */}
                          <div className="flex flex-wrap items-center justify-between mt-auto pt-2 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                              <span className="text-sm text-gray-700 font-medium shrink-0">访问:</span>
                              <span className="text-sm text-gray-600 font-medium bg-orange-50/50 px-2 py-1 rounded-lg border border-orange-100/50 shrink-0 whitespace-nowrap">
                                {formatTimeAMPM(l.time || '--:--')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 z-30 ml-auto">
                              {/* Sort buttons moved out of expanded view for easy access */}
                              {canEdit && (
                                <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white h-8">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, -1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors border-r border-gray-200 flex items-center justify-center active:bg-orange-100"
                                    title="向上移动"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); reorderItem(index, 1); }}
                                    className="w-8 h-full bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center active:bg-orange-100"
                                    title="向下移动"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              
                              {/* Toggle Expansion Button */}
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCardExpansion(`loc-${l.id}`);
                                }}
                                className="flex items-center justify-center w-8 h-8 bg-orange-50 hover:bg-orange-100 rounded-lg text-orange-600 transition-colors shadow-sm"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 relative z-30">
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-xs text-orange-600 font-medium">访问时间</label>
                                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-orange-400 transition-shadow w-full">
                                    <input
                                      disabled={!canEdit}
                                      type="time"
                                      value={l.time || ''}
                                      onChange={(e) => updateLocation(l.id, { time: e.target.value })}
                                      className="text-sm bg-transparent outline-none font-mono text-gray-700 w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Travel Mode to next location */}
                      {hasNextLoc && (
                        <div className="relative flex items-center gap-4 mb-6">
                          <div className="w-8 shrink-0 z-10 flex justify-center relative">
                            <div className="bg-white border border-gray-200 rounded-full shadow-sm p-1 flex">
                              <select 
                                disabled={!canEdit}
                                value={l.travelMode || 'TRANSIT'}
                                onChange={(e) => updateLocation(l.id, { travelMode: e.target.value })}
                                className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer appearance-none text-center pl-1 pr-2"
                                title="前往下一地点的出行方式"
                              >
                                <option value="TRANSIT">🚌 公交</option>
                                <option value="DRIVING">🚗 驾车</option>
                                <option value="WALKING">🚶 步行</option>
                                <option value="BICYCLING">🚲 骑行</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex-1"></div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                return null;
              })}

              {/* Empty State */}
              {activeDayLocations.length === 0 && activeDayTransportsDeparture.length === 0 && activeDayTransportsArrival.length === 0 && (
                <div className="text-center py-16 px-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 mt-4 relative z-10">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <MapPin className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-600 mb-1">这天还没有任何计划</p>
                  <p className="text-sm text-gray-400">点击右下角的按钮开始添加</p>
                </div>
              )}
            </div>
            
            {/* Spacer for FAB */}
            <div className="h-24"></div>
          </div>
        </div>

      {/* Floating Action Button (FAB) and Mobile Map Toggle Container */}
      {/* Placed OUTSIDE the flex-1 list container, but INSIDE the main wrapper so it naturally overlays the entire screen */}
      <div 
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] flex items-center justify-center gap-4 pointer-events-none ${isDraggingSidebar ? '' : 'transition-all'}`}
      >
        {/* Mobile View Toggle - Show only on mobile, toggle between List/Map */}
        <div className="flex items-center justify-center pointer-events-auto md:hidden">
          <button 
            onClick={() => setShowMobileMap(!showMobileMap)}
            className="bg-white h-14 px-6 rounded-full shadow-2xl font-bold text-sm flex items-center justify-center gap-2 text-gray-800 hover:scale-105 transition-all duration-300 border border-gray-200"
          >
            {showMobileMap ? <><List className="w-5 h-5 text-blue-600" /> 列表</> : <><MapIcon className="w-5 h-5 text-blue-600" /> 地图</>}
          </button>
        </div>
      </div>

      {/* Main FAB Container - Fixed to bottom right of the screen */}
      {canEdit && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex-col items-end pointer-events-auto ${showMobileMap ? 'hidden md:flex' : 'flex'}`}>
          {/* Expanded Menu */}
          <div className={`absolute bottom-16 right-0 flex flex-col gap-2 items-end transition-all duration-200 ${showFabMenu ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible'}`}>
            <button onClick={() => { resetTransportForm(); setShowAddTransport(true); }} className="flex items-center justify-end gap-3 group">
              <span className="bg-white px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">添加交通</span>
              <div className="w-12 h-12 shrink-0 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-blue-600 hover:scale-105 transition-all">
                <Plane className="w-5 h-5" />
              </div>
            </button>
            <button onClick={() => { resetAccommodationForm(); setShowAddAccommodation(true); }} className="flex items-center justify-end gap-3 group">
              <span className="bg-white px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">添加住宿</span>
              <div className="w-12 h-12 shrink-0 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-purple-600 hover:scale-105 transition-all">
                <Hotel className="w-5 h-5" />
              </div>
            </button>
            <button onClick={() => { resetLocationForm(); setShowAddLocation(true); }} className="flex items-center justify-end gap-3 group">
              <span className="bg-white px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">添加地点</span>
              <div className="w-12 h-12 shrink-0 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-orange-600 hover:scale-105 transition-all">
                <MapPin className="w-5 h-5" />
              </div>
            </button>
          </div>
          
          {/* Main FAB */}
          <button 
            onClick={() => setShowFabMenu(!showFabMenu)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all duration-300 relative z-10 ${
              showFabMenu ? 'bg-gray-800 rotate-45' : 'bg-blue-600'
            }`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      </div>

      {showMobileMap && (
        <div
          className="md:hidden fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => setShowMobileMap(false)}
            className="pointer-events-auto bg-white h-14 px-6 rounded-full shadow-2xl font-bold text-sm flex items-center justify-center gap-2 text-gray-800 border border-gray-200"
          >
            <List className="w-5 h-5 text-blue-600" /> 列表
          </button>
        </div>
      )}

      {/* Map Area */}
      <div className={`${showMobileMap ? 'block' : 'hidden'} md:block flex-1 relative`}>
        <Map 
          center={activeDayLocations.length > 0 
            ? { lat: activeDayLocations[0].lat, lng: activeDayLocations[0].lng } 
            : { lat: 35.6762, lng: 139.6503 }} 
          zoom={12} 
          className="w-full h-full"
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
        >
          {mapMarkers.map((marker, index) => (
            <Marker 
              key={marker.id} 
              position={{ lat: marker.lat, lng: marker.lng }} 
              title={marker.title}
              label={marker.type === 'location' ? ((marker.orderIndex || 0) + 1).toString() : undefined}
              type={marker.type}
            />
          ))}
          <RoutePolyline 
            locations={activeDayLocations.map(l => ({lat: l.lat, lng: l.lng, placeId: l.placeId, travelMode: l.travelMode || 'TRANSIT', time: l.time}))} 
            onRouteCalculated={handleRouteCalculated}
          />
        </Map>
        
        {/* Floating Search in Map */}
        {canEdit && (
          <div className="absolute top-4 left-4 right-4 mx-auto max-w-md bg-white rounded-full shadow-lg p-2 flex items-center px-4">
            {googleMapsApiKey ? (
              <PlacesSearchBox
                apiKey={googleMapsApiKey}
                placeholder="搜索地点并添加到行程..."
                onSelect={(place, extra) => {
                  (place as any).__photoUrl = extra?.photoUrl;
                  setMapSearchSelectedPlace(place);
                  setMapSearchTargetDay(activeDay);
                  setMapSearchTime('');
                  setShowMapSearchConfirm(true);
                }}
              />
            ) : (
              <div className="w-full text-sm text-red-600">缺少 Google Maps API Key</div>
            )}
          </div>
        )}
      </div>

      {/* Empty block to replace the old Mobile View Toggle location */}

      {/* Edit Trip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">编辑行程信息</h2>
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="删除此行程"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {showDeleteConfirm && (
                <div className="bg-red-50 p-4 rounded-xl mb-4">
                  <p className="text-red-700 text-sm mb-3 font-medium text-center">确定要删除此行程吗？此操作无法撤销。</p>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      取消
                    </button>
                    <button 
                      type="button"
                      onClick={handleDeleteTrip}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">行程标题</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主要目的地</label>
                <input 
                  type="text" 
                  required
                  value={editDestination}
                  onChange={e => setEditDestination(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出发日期</label>
                  <input 
                    type="date" 
                    required
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input 
                    type="date" 
                    required
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transport Modal */}
      {showAddTransport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Plane className="text-blue-600" /> {editingId ? '编辑交通' : '添加交通'}</h2>
              <button onClick={() => { setShowAddTransport(false); resetTransportForm(); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTransport} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">交通类型</label>
                <select value={transType} onChange={e => setTransType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="flight">航班</option>
                  <option value="train">火车/高铁</option>
                  <option value="bus">巴士</option>
                  <option value="driving">自驾</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出发地</label>
                  <div className="w-full border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                    <PlacesSearchBox 
                      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                      placeholder={transDep || "搜索出发地"}
                      className="w-full px-3"
                      types={transType === 'flight' ? ['airport'] : transType === 'train' ? ['transit_station'] : transType === 'bus' ? ['bus_station'] : []}
                      onSelect={(place) => {
                        console.log('[DEBUG] Selected Dep Place:', place.name);
                        setTransDep(place.name || place.formatted_address || '');
                        if (place.geometry?.location) {
                          setTransDepLat(typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat as any);
                          setTransDepLng(typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng as any);
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
                  <div className="w-full border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                    <PlacesSearchBox 
                      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                      placeholder={transArr || "搜索目的地"}
                      className="w-full px-3"
                      types={transType === 'flight' ? ['airport'] : transType === 'train' ? ['transit_station'] : transType === 'bus' ? ['bus_station'] : []}
                      onSelect={(place) => {
                        console.log('[DEBUG] Selected Arr Place:', place.name);
                        setTransArr(place.name || place.formatted_address || '');
                        if (place.geometry?.location) {
                          setTransArrLat(typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat as any);
                          setTransArrLng(typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng as any);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出发时间</label>
                  <div className="flex gap-2">
                    <input type="date" value={transDepDate} onChange={e => {
                      setTransDepDate(e.target.value);
                      // Auto-sync arrival date if it's empty or was same as previous departure date
                      if (!transArrDate || transArrDate === transDepDate) {
                        setTransArrDate(e.target.value);
                      }
                    }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="time" value={transDepTime} onChange={e => setTransDepTime(e.target.value)} className="w-[120px] px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">到达时间</label>
                  <div className="flex gap-2">
                    <input type="date" value={transArrDate} onChange={e => setTransArrDate(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="time" value={transArrTime} onChange={e => setTransArrTime(e.target.value)} className="w-[120px] px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              {transType === 'flight' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">航班号 (可选)</label>
                    <input type="text" value={transFlightNum} onChange={e => setTransFlightNum(e.target.value)} placeholder="如 MH318" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预订号 (可选)</label>
                    <input type="text" value={transPnr} onChange={e => setTransPnr(e.target.value)} placeholder="如 X8A9B2" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                  </div>
                </div>
              )}
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium mt-4">{editingId ? '保存修改' : '确认添加'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Accommodation Modal */}
      {showAddAccommodation && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Hotel className="text-purple-600" /> {editingId ? '编辑住宿' : '添加住宿'}</h2>
              <button onClick={() => { setShowAddAccommodation(false); resetAccommodationForm(); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 pb-2">
              <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setAccSearchMode(true)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${accSearchMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  智能搜索
                </button>
                <button
                  type="button"
                  onClick={() => setAccSearchMode(false)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!accSearchMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  手动输入
                </button>
              </div>
            </div>

            <form onSubmit={handleAddAccommodation} className="px-6 pb-6 space-y-4">
              {accSearchMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">搜索酒店</label>
                  <PlacesSearchBox
                    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                    placeholder="输入酒店名称..."
                    className="w-full"
                    onSelect={(place, extra) => {
                      if (place.name) setAccName(place.name);
                      if (place.formatted_address) setAccAddress(place.formatted_address);
                      if (place.place_id) setAccPlaceId(place.place_id);
                      if (place.geometry?.location) {
                        setAccLat(typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat as any);
                        setAccLng(typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng as any);
                      }
                      if (extra?.photoUrl) setAccPhotoUrl(extra.photoUrl);
                    }}
                  />
                  {accName && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="font-medium text-purple-900">{accName}</p>
                      <p className="text-sm text-purple-700 mt-1">{accAddress}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">酒店/民宿名称</label>
                    <input type="text" required value={accName} onChange={e => setAccName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps 链接 (可选)</label>
                    <input type="url" value={accMapUrl} onChange={e => setAccMapUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入住日期</label>
                  <input type="date" value={accCheckInDate} onChange={e => setAccCheckInDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入住时间</label>
                  <input type="time" value={accCheckInTime} onChange={e => setAccCheckInTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退房日期</label>
                  <input type="date" value={accCheckOutDate} onChange={e => setAccCheckOutDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退房时间</label>
                  <input type="time" value={accCheckOutTime} onChange={e => setAccCheckOutTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>

              <button type="submit" disabled={!accName} className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-4">{editingId ? '保存修改' : '确认添加'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><MapPin className="text-orange-600" /> {editingId ? '编辑地点' : '添加地点'}</h2>
              <button onClick={() => { setShowAddLocation(false); resetLocationForm(); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddLocation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地点名称</label>
                <input type="text" required value={locName} onChange={e => setLocName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细地址 (可选)</label>
                <input type="text" value={locAddress} onChange={e => setLocAddress(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium">{editingId ? '保存修改' : '确认添加'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Map Search Confirmation Modal */}
      {showMapSearchConfirm && mapSearchSelectedPlace && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Image Area */}
            <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-0"></div>
              {(mapSearchSelectedPlace as any).__photoUrl ? (
                <img
                  src={(mapSearchSelectedPlace as any).__photoUrl}
                  alt={mapSearchSelectedPlace.name || '地点图片'}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-100 z-0">
                  <MapPin className="w-12 h-12 text-blue-300" />
                </div>
              )}
              
              <button 
                onClick={() => setShowMapSearchConfirm(false)} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Moved the icon outside of the overflow-hidden header so it can overlay both header and body */}
            <div className="relative z-30">
              <div className="absolute -top-8 left-6 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white transform rotate-3">
                <MapPin className="w-8 h-8 text-blue-600 transform -rotate-3" />
              </div>
            </div>

            <div className="pt-10 px-6 pb-6 relative z-10 bg-white">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1 pr-4">{mapSearchSelectedPlace.name || '未命名地点'}</h2>
                {mapSearchSelectedPlace.formatted_address && (
                  <p className="text-sm text-gray-500 line-clamp-2">{mapSearchSelectedPlace.formatted_address}</p>
                )}
              </div>

              <div className="space-y-5">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    添加到哪一天？
                  </label>
                  <select 
                    value={mapSearchTargetDay}
                    onChange={(e) => setMapSearchTargetDay(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm font-medium text-gray-700"
                  >
                    {Array.from({ length: totalDays }).map((_, i) => (
                      <option key={i} value={i}>
                        第 {i + 1} 天 — {format(addDays(start, i), 'yyyy-MM-dd')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Clock className="w-4 h-4 text-orange-500" />
                    预计到达时间 (可选)
                  </label>
                  <input 
                    type="time" 
                    value={mapSearchTime}
                    onChange={(e) => setMapSearchTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm text-gray-700 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setShowMapSearchConfirm(false)}
                  className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  取消
                </button>
                <button 
                  onClick={async () => {
                    let lat = mapSearchSelectedPlace.geometry?.location?.lat?.();
                    let lng = mapSearchSelectedPlace.geometry?.location?.lng?.();

                    if ((lat === undefined || lng === undefined) && mapSearchSelectedPlace.place_id && window.google?.maps) {
                      try {
                        await window.google.maps.importLibrary('places');
                        const PlaceCtor = (window.google.maps as any).places?.Place;
                        if (PlaceCtor) {
                          const p = new PlaceCtor({ id: mapSearchSelectedPlace.place_id });
                          await p.fetchFields({ fields: ['location'] });
                          lat = p.location?.lat?.();
                          lng = p.location?.lng?.();
                        }
                      } catch {
                        // ignore and fallback to 0
                      }
                    }

                    await addLocation({
                      name: mapSearchSelectedPlace.name || '未知地点',
                      lat: lat ?? 0,
                      lng: lng ?? 0,
                      address: mapSearchSelectedPlace.formatted_address || '',
                      placeId: mapSearchSelectedPlace.place_id || undefined,
                      dayIndex: mapSearchTargetDay,
                      time: mapSearchTime || undefined
                    });
                    setShowMapSearchConfirm(false);
                    // Automatically switch to the selected day tab so user sees their new addition
                    setActiveDay(mapSearchTargetDay);
                  }}
                  className="flex-[2] px-4 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> 确认加入行程
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Confirmation Dialog */}
      {globalConfirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-blue-600 font-bold text-lg">!</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  系统提示
                </h3>
              </div>
              <p className="text-gray-600 mb-8 ml-1">{globalConfirmDialog.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setGlobalConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    globalConfirmDialog.onConfirm();
                    setGlobalConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-medium shadow-sm hover:shadow"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                分享与协作
              </h3>
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setInviteMessage({ type: '', text: '' });
                  setInviteEmail('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Read-Only Share Link */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">只读分享链接</h4>
                <div className="flex flex-col gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">启用链接分享</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        获取一个唯一的加密链接，任何获得该链接的人都可以只读查看此行程
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (activeTripId) {
                          updateTripShareStatus(activeTripId, !is_shared);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${is_shared ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${is_shared ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  {is_shared && share_token && (
                    <div className="flex items-center gap-2 mt-2 bg-white p-2 rounded-lg border border-gray-200">
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/share/${share_token}`}
                        className="flex-1 bg-transparent text-sm text-gray-600 outline-none px-2"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/share/${share_token}`);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center shrink-0"
                        title="复制链接"
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Visibility Setting */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">社区公开</h4>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{isPublic ? '公开至发现页' : '不在发现页显示'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isPublic ? '任何人都可以在"发现"页面看到这个行程' : '不会出现在公共发现页中'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (activeTripId) {
                        updateTripVisibility(activeTripId, !isPublic);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPublic ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Invite Members */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">邀请协作者</h4>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="email" 
                      placeholder="输入注册用户的邮箱..." 
                      className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <select 
                    className="border border-gray-300 rounded-xl text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  >
                    <option value="editor">编辑者</option>
                    <option value="viewer">查看者</option>
                  </select>
                  <button 
                    onClick={async () => {
                      if (!activeTripId || !inviteEmail) return;
                      setIsInviting(true);
                      setInviteMessage({ type: '', text: '' });
                      try {
                        await useTripStore.getState().inviteCollaborator(activeTripId, inviteEmail, inviteRole);
                        setInviteMessage({ type: 'success', text: '邀请成功！' });
                        setInviteEmail('');
                      } catch (err: any) {
                        setInviteMessage({ type: 'error', text: err.message || '邀请失败' });
                      } finally {
                        setIsInviting(false);
                      }
                    }}
                    disabled={isInviting || !inviteEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isInviting ? '邀请中...' : '邀请'}
                  </button>
                </div>
                {inviteMessage.text && (
                  <p className={`text-xs mt-2 ${inviteMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    {inviteMessage.text}
                  </p>
                )}
              </div>

              {/* Current Members */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex justify-between">
                  <span>当前成员 ({collaborators.length})</span>
                </h4>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {collaborators.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm overflow-hidden">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            member.name?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {member.name}
                            {member.id === user?.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">你自己</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.role === 'owner' ? '所有者' : member.role === 'editor' ? '可编辑' : '仅查看'}
                          </div>
                        </div>
                      </div>
                      {member.role !== 'owner' && member.id !== user?.id && (
                        <button 
                          onClick={() => {
                            if (activeTripId) {
                              setGlobalConfirmDialog({
                                isOpen: true,
                                message: `确定要移除成员 ${member.name} 吗？`,
                                onConfirm: async () => {
                                  try {
                                    await useTripStore.getState().removeCollaborator(activeTripId, member.id);
                                  } catch (e) {
                                    setGlobalConfirmDialog({
                                      isOpen: true,
                                      message: '移除失败',
                                      onConfirm: () => {}
                                    });
                                  }
                                }
                              });
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="移除成员"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </MapWrapper>
  );
};
