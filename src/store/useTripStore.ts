import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase/client';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  dayIndex: number;
  orderIndex: number;
  placeId?: string;
  travelMode?: string; // 'DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'
  time?: string;
  mapUrl?: string;
}

export interface Transportation {
  id: string;
  type: string; // e.g., 'flight', 'train', 'bus'
  departure: string;
  arrival: string;
  departureTime?: string;
  arrivalTime?: string;
  dayIndex: number;
  orderIndex?: number;
  // Flight specific optional fields
  flightNumber?: string;
  terminal?: string;
  pnr?: string;
  depLat?: number;
  depLng?: number;
  arrLat?: number;
  arrLng?: number;
  travelMode?: string; // 'DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'
  custom_data?: any;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  dayIndex: number;
  orderIndex?: number;
  lat?: number;
  lng?: number;
  placeId?: string;
  photoUrl?: string;
  mapUrl?: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  locations: Location[];
  transportations: Transportation[];
  accommodations: Accommodation[];
  isPublic?: boolean;
  is_shared?: boolean;
  share_token?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline?: boolean;
}

interface TripState {
  // Global trips list
  trips: Trip[];
  isLoadingTrips: boolean;
  fetchTrips: (userId: string) => Promise<void>;
  
  // Public trips for Explore page
  publicTrips: Trip[];
  isLoadingPublicTrips: boolean;
  fetchPublicTrips: () => Promise<void>;

  addTrip: (trip: Trip, userId: string) => Promise<void>;
  updateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;

  // Currently active trip for planning
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  isLoadingActiveTrip: boolean;
  fetchTripDetails: (id: string) => Promise<void>;

  // Active trip details (for PlanTrip page)
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  is_shared: boolean;
  share_token: string | null;
  locations: Location[];
  transportations: Transportation[];
  accommodations: Accommodation[];
  
  // Collaboration & Presence
  collaborators: Collaborator[];
  onlineUsers: any[];
  fetchCollaborators: (tripId: string) => Promise<void>;
  updateTripVisibility: (tripId: string, isPublic: boolean) => Promise<void>;
  updateTripShareStatus: (tripId: string, isShared: boolean) => Promise<void>;
  inviteCollaborator: (tripId: string, email: string, role: 'editor' | 'viewer') => Promise<void>;
  removeCollaborator: (tripId: string, userId: string) => Promise<void>;
  subscribeToPresence: (tripId: string, user: {id: string, name: string, avatar_url?: string}) => void;
  unsubscribeFromPresence: () => void;
  presenceChannel: any | null;
  
  setTitle: (title: string) => void;
  setDestination: (destination: string) => void;
  setDates: (start: string, end: string) => void;
  
  // Real DB actions for children
  addLocation: (location: Omit<Location, 'id' | 'orderIndex'>) => Promise<void>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  reorderLocations: (dayIndex: number, reorderedIds: string[]) => Promise<void>;
  
  reorderMixedTimeline: (dayIndex: number, reorderedItems: {id: string, type: 'location' | 'transport_departure' | 'transport_arrival'}[]) => Promise<void>;
  
  addTransportation: (transport: Omit<Transportation, 'id'>) => Promise<void>;
  updateTransportation: (id: string, updates: Partial<Transportation>) => Promise<void>;
  deleteTransportation: (id: string) => Promise<void>;
  
  addAccommodation: (accommodation: Omit<Accommodation, 'id'>) => Promise<void>;
  updateAccommodation: (id: string, updates: Partial<Accommodation>) => Promise<void>;
  deleteAccommodation: (id: string) => Promise<void>;
  
  loadActiveTrip: (trip: Trip) => void;

  // Clean up active state
  clearActiveTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      isLoadingTrips: false,
      
      publicTrips: [],
      isLoadingPublicTrips: false,
      
      fetchPublicTrips: async () => {
        set({ isLoadingPublicTrips: true });
        try {
          // fetch trips
          const { data: tripsData, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });
            
          if (tripsError) throw tripsError;
          
          // fetch user info separately
          const userIds = [...new Set(tripsData.map(t => t.user_id))];
          let usersMap: Record<string, any> = {};
          
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .in('id', userIds);
              
            if (!usersError && usersData) {
              usersData.forEach(u => {
                usersMap[u.id] = u;
              });
            }
          }
          
          const formattedTrips: any[] = tripsData.map(t => {
            const author = usersMap[t.user_id] || {};
            return {
              id: t.id,
              title: t.title,
              destination: t.destination || t.description || '', 
              startDate: t.start_date ? t.start_date.split('T')[0] : '',
              endDate: t.end_date ? t.end_date.split('T')[0] : '',
              locations: [], 
              transportations: [],
              accommodations: [],
              authorName: author.name || '匿名用户',
              authorAvatar: author.avatar_url
            };
          });
          
          set({ publicTrips: formattedTrips, isLoadingPublicTrips: false });
        } catch (error) {
          console.error('Error fetching public trips:', error);
          set({ isLoadingPublicTrips: false });
        }
      },

      fetchTrips: async (userId: string) => {
        set({ isLoadingTrips: true });
        try {
          // 1. 获取当前用户作为协作者的行程 ID
          const { data: memberData, error: memberError } = await supabase
            .from('trip_members')
            .select('trip_id')
            .eq('user_id', userId);
            
          if (memberError) throw memberError;
          
          const collaboratedTripIds = memberData?.map(m => m.trip_id) || [];
          
          // 2. 获取用户自己创建的，或者参与协作的行程
          let query = supabase.from('trips').select('*');
          
          if (collaboratedTripIds.length > 0) {
            query = query.or(`user_id.eq.${userId},id.in.(${collaboratedTripIds.join(',')})`);
          } else {
            query = query.eq('user_id', userId);
          }
          
          const { data, error } = await query.order('created_at', { ascending: false });
            
          if (error) throw error;
          
          const formattedTrips: Trip[] = data.map(t => ({
            id: t.id,
            title: t.title,
            destination: t.destination || t.description || '', 
            startDate: t.start_date ? t.start_date.split('T')[0] : '',
            endDate: t.end_date ? t.end_date.split('T')[0] : '',
            isPublic: t.is_public,
            locations: [], 
            transportations: [],
            accommodations: []
          }));
          
          // Force completely overwrite trips with fresh data from server
          set({ trips: [...formattedTrips], isLoadingTrips: false });
        } catch (error) {
          console.error('Error fetching trips:', error);
          set({ isLoadingTrips: false });
        }
      },

      addTrip: async (trip, userId) => {
        set((state) => ({ trips: [trip, ...state.trips] }));
        
        try {
          const { error } = await supabase
            .from('trips')
            .insert({
              id: trip.id,
              user_id: userId,
              title: trip.title,
              destination: trip.destination,
              description: trip.destination, 
              start_date: trip.startDate,
              end_date: trip.endDate
            });
            
          if (error) throw error;
        } catch (error) {
          console.error('Error adding trip:', error);
          set((state) => ({ trips: state.trips.filter(t => t.id !== trip.id) }));
          throw error; // Re-throw so caller knows it failed
        }
      },

      updateTrip: async (id, updatedFields) => {
        // Update trips list in state
        set((state) => ({
          trips: state.trips.map(t => t.id === id ? { ...t, ...updatedFields } : t)
        }));
        
        // Update active trip state if it's the one being edited
        if (get().activeTripId === id) {
          const updates: any = {};
          if (updatedFields.title !== undefined) updates.title = updatedFields.title;
          if (updatedFields.destination !== undefined) updates.destination = updatedFields.destination;
          if (updatedFields.startDate !== undefined) updates.startDate = updatedFields.startDate;
          if (updatedFields.endDate !== undefined) updates.endDate = updatedFields.endDate;
          set(updates);
        }
        
        const dbUpdate: any = {};
        if (updatedFields.title !== undefined) dbUpdate.title = updatedFields.title;
        if (updatedFields.destination !== undefined) {
          dbUpdate.destination = updatedFields.destination;
          dbUpdate.description = updatedFields.destination;
        }
        if (updatedFields.startDate !== undefined) dbUpdate.start_date = updatedFields.startDate;
        if (updatedFields.endDate !== undefined) dbUpdate.end_date = updatedFields.endDate;
        if (updatedFields.isPublic !== undefined) dbUpdate.is_public = updatedFields.isPublic;
        
        if (Object.keys(dbUpdate).length > 0) {
          try {
            const { error } = await supabase
              .from('trips')
              .update(dbUpdate)
              .eq('id', id);
              
            if (error) throw error;
          } catch (error) {
            console.error('Error updating trip:', error);
          }
        }
      },

      deleteTrip: async (id) => {
        const previousTrips = get().trips;
        set((state) => ({
          trips: state.trips.filter(t => t.id !== id),
          activeTripId: state.activeTripId === id ? null : state.activeTripId
        }));
        
        try {
          // Delete child records first to avoid foreign key constraint errors
          // Note: If Supabase schema has ON DELETE CASCADE set, these might be redundant, 
          // but doing it explicitly ensures data is cleaned up even without cascade constraints.
          await Promise.all([
            supabase.from('locations').delete().eq('trip_id', id),
            supabase.from('transportations').delete().eq('trip_id', id),
            supabase.from('accommodations').delete().eq('trip_id', id)
          ]);

          // Then delete the trip
          const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', id);
            
          if (error) throw error;
        } catch (error) {
          console.error('Error deleting trip:', error);
          set({ trips: previousTrips });
        }
      },

      activeTripId: null,
      setActiveTripId: (id) => set({ activeTripId: id }),
      isLoadingActiveTrip: false,

      // Collaboration & Presence implementation
      collaborators: [],
      onlineUsers: [],
      presenceChannel: null,

      fetchCollaborators: async (tripId: string) => {
        try {
          // Fetch members
          const { data: members, error } = await supabase
            .from('trip_members')
            .select(`
              user_id,
              role
            `)
            .eq('trip_id', tripId);
            
          if (error) throw error;
          
          // Manually fetch users since the relationship might be broken in cache
          const userIds = members?.map((m: any) => m.user_id) || [];
          let usersData: any[] = [];
          if (userIds.length > 0) {
            const { data } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .in('id', userIds);
            if (data) usersData = data;
          }
          
          // Fetch owner from trips table if not in members (fallback)
          const { data: trip } = await supabase.from('trips').select('user_id').eq('id', tripId).single();
          
          const formattedCollaborators: Collaborator[] = members?.map((m: any) => {
            const user = usersData.find(u => u.id === m.user_id);
            return {
              id: m.user_id,
              name: user?.name || 'Unknown User',
              avatar_url: user?.avatar_url,
              role: m.role
            };
          }) || [];

          // Add owner if not explicitly in trip_members (though they should be)
          if (trip && !formattedCollaborators.find(c => c.id === trip.user_id)) {
            const { data: owner } = await supabase.from('users').select('id, name, avatar_url').eq('id', trip.user_id).single();
            if (owner) {
              formattedCollaborators.push({
                id: owner.id,
                name: owner.name,
                avatar_url: owner.avatar_url,
                role: 'owner'
              });
            }
          }
          
          set({ collaborators: formattedCollaborators });
        } catch (error) {
          console.error('Error fetching collaborators:', error);
        }
      },

      updateTripVisibility: async (tripId: string, isPublic: boolean) => {
        try {
          const { error } = await supabase
            .from('trips')
            .update({ is_public: isPublic })
            .eq('id', tripId);
          if (error) throw error;
          
          // Update active trip state
          if (get().activeTripId === tripId) {
            set({ isPublic });
          }
          
          // Update in trips list as well
          set((state) => ({
            trips: state.trips.map(t => t.id === tripId ? { ...t, isPublic } : t)
          }));
        } catch (error) {
          console.error('Error updating trip visibility:', error);
          throw error;
        }
      },

      updateTripShareStatus: async (tripId: string, isShared: boolean) => {
        try {
          const { error } = await supabase
            .from('trips')
            .update({ is_shared: isShared })
            .eq('id', tripId);
            
          if (error) throw error;
          
          if (get().activeTripId === tripId) {
            set({ is_shared: isShared });
          }
        } catch (error) {
          console.error('Error updating trip share status:', error);
          throw error;
        }
      },

      inviteCollaborator: async (tripId: string, email: string, role: 'editor' | 'viewer') => {
        try {
          // 1. Check if user exists by email
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('email', email)
            .single();
            
          if (userError || !userData) {
            throw new Error('未找到该邮箱对应的用户，请确保对方已注册。');
          }
          
          // 2. Check if already a member
          const { data: existingMember } = await supabase
            .from('trip_members')
            .select('id')
            .eq('trip_id', tripId)
            .eq('user_id', userData.id)
            .single();
            
          if (existingMember) {
            throw new Error('该用户已经是行程成员。');
          }

          // 3. Add to trip_members directly (auto-accept since they are registered)
          // In a real complex app, you might use trip_invites and require them to accept.
          // For simplicity here, we add them directly.
          const { error: insertError } = await supabase
            .from('trip_members')
            .insert({
              trip_id: tripId,
              user_id: userData.id,
              role: role
            });
            
          if (insertError) throw insertError;
          
          // Refresh collaborators
          await get().fetchCollaborators(tripId);
        } catch (error: any) {
          console.error('Error inviting collaborator:', error);
          throw error;
        }
      },

      removeCollaborator: async (tripId: string, userId: string) => {
        try {
          const { error } = await supabase
            .from('trip_members')
            .delete()
            .eq('trip_id', tripId)
            .eq('user_id', userId);
            
          if (error) throw error;
          
          // Refresh collaborators
          await get().fetchCollaborators(tripId);
          
          // Also immediately remove from online users if they were there
          set(state => ({
            onlineUsers: state.onlineUsers.filter(u => u.id !== userId)
          }));
        } catch (error) {
          console.error('Error removing collaborator:', error);
          throw error;
        }
      },

      subscribeToPresence: (tripId: string, user: {id: string, name: string, avatar_url?: string}) => {
        const state = get();
        if (state.presenceChannel) {
          get().unsubscribeFromPresence();
        }

        const channel = supabase.channel(`trip-${tripId}`, {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const online = Object.keys(presenceState).map(key => {
              return presenceState[key][0];
            });
            
            // Filter online users to only show actual current collaborators
            const currentCollaborators = get().collaborators;
            const validMemberIds = new Set(currentCollaborators.map(c => c.id));
            set({ onlineUsers: (online as any[]).filter(u => validMemberIds.has(u.id)) });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` }, async () => {
            // When trip_members table changes for this trip, refresh collaborators
            await get().fetchCollaborators(tripId);
            // After fetching new collaborators, filter onlineUsers to only include valid current members
            const currentCollaborators = get().collaborators;
            const validMemberIds = new Set(currentCollaborators.map(c => c.id));
            set(state => ({
              onlineUsers: state.onlineUsers.filter(u => validMemberIds.has(u.id))
            }));
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                id: user.id,
                name: user.name,
                avatar_url: user.avatar_url,
                online_at: new Date().toISOString(),
              });
            }
          });

        set({ presenceChannel: channel });
      },

      unsubscribeFromPresence: () => {
        const { presenceChannel } = get();
        if (presenceChannel) {
          supabase.removeChannel(presenceChannel);
          set({ presenceChannel: null, onlineUsers: [] });
        }
      },

      fetchTripDetails: async (id: string) => {
        console.log('[DEBUG] fetchTripDetails called for trip ID:', id);
        set({ isLoadingActiveTrip: true, activeTripId: id });
        try {
          // Fetch trip basic info
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', id)
            .single();
            
          if (tripError) throw tripError;
          console.log('[DEBUG] Trip data fetched:', tripData);

          // Fetch relations
          // Use a helper function to safely fetch data that might fail due to RLS
          const safeFetch = async (query: any) => {
            try {
              const res = await query;
              if (res.error) {
                console.warn('Query returned error, falling back to empty data:', res.error);
                return { data: [] };
              }
              return res;
            } catch (err) {
              console.warn('Query threw error, falling back to empty data:', err);
              return { data: [] };
            }
          };

          const [locRes, transRes, accRes] = await Promise.all([
            safeFetch(supabase.from('locations').select('*').eq('trip_id', id).order('order_index', { ascending: true })),
            safeFetch(supabase.from('transportations').select('*').eq('trip_id', id)),
            safeFetch(supabase.from('accommodations').select('*').eq('trip_id', id))
          ]);
          
          console.log('[DEBUG] Relations fetched:', { locRes, transRes, accRes });

          const locations = (locRes.data || []).map(l => {
            const customData = l.custom_data || {};
            return {
              id: l.id,
              name: l.name,
              lat: l.latitude,
              lng: l.longitude,
              address: l.address,
              dayIndex: l.day_index || 0,
              orderIndex: l.order_index || 0,
              placeId: customData.placeId,
              travelMode: customData.travelMode || 'TRANSIT',
              time: customData.time,
              mapUrl: customData.mapUrl
            };
          });

          const transportations = (transRes.data || []).map(t => {
            const customData = t.custom_data || {};
            
            // Format dates back to YYYY-MM-DDTHH:mm if they are full ISO strings
            // Fix: Do not use JS Date object which converts to local timezone and causes time jumping.
            // Just extract the string directly since we save it as YYYY-MM-DDTHH:mm:00
            let depTime = t.departure_time;
            if (depTime && depTime.includes('T')) {
              // Extract exactly what was saved before the Z or timezone offset
              depTime = depTime.substring(0, 16); 
            }
            
            let arrTime = t.arrival_time;
            if (arrTime && arrTime.includes('T')) {
              arrTime = arrTime.substring(0, 16);
            }

            return {
              id: t.id,
              type: t.type,
              departure: t.departure_location,
              arrival: t.arrival_location,
              departureTime: depTime,
              arrivalTime: arrTime,
              dayIndex: t.day_index || 0,
              orderIndex: t.order_index || 0,
              flightNumber: customData.flightNumber,
              terminal: customData.terminal,
              pnr: customData.pnr,
              depLat: customData.depLat,
              depLng: customData.depLng,
              arrLat: customData.arrLat,
              arrLng: customData.arrLng,
              travelMode: customData.travelMode || 'TRANSIT'
            };
          });

          const accommodations = (accRes.data || []).map(a => ({
            id: a.id,
            name: a.name,
            address: a.address,
            checkIn: a.check_in_time,
            checkOut: a.check_out_time,
            dayIndex: a.day_index || 0,
            lat: a.lat,
            lng: a.lng,
            placeId: a.place_id,
            photoUrl: a.photo_url,
            mapUrl: a.map_url
          }));

          set({
            title: tripData.title,
            destination: tripData.destination || tripData.description || '',
            startDate: tripData.start_date.split('T')[0],
            endDate: tripData.end_date.split('T')[0],
            isPublic: tripData.is_public || false,
            is_shared: tripData.is_shared || false,
            share_token: tripData.share_token || null,
            locations,
            transportations,
            accommodations,
            isLoadingActiveTrip: false
          });
          
          console.log('[DEBUG] State updated with fresh data:', { locations, transportations, accommodations });

        } catch (error) {
          console.error('[DEBUG] Error fetching trip details:', error);
          set({ isLoadingActiveTrip: false });
        }
      },

      title: '新行程',
      destination: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      isPublic: false,
      is_shared: false,
      share_token: null,
      locations: [],
      transportations: [],
      accommodations: [],
      
      setTitle: (title) => set({ title }),
      setDestination: (destination) => set({ destination }),
      setDates: (startDate, endDate) => set({ startDate, endDate }),
      
      addLocation: async (location) => {
        const state = get();
        if (!state.activeTripId) return;

        const newId = uuidv4();
        // Count both locations and transportations for a proper sequential orderIndex
        const locCount = state.locations.filter(l => l.dayIndex === location.dayIndex).length;
        const transCount = state.transportations.filter(t => t.dayIndex === location.dayIndex).length;
        const orderIndex = locCount + transCount;
        
        const newLocation = { ...location, id: newId, orderIndex, travelMode: location.travelMode || 'TRANSIT', time: location.time };
        set({ locations: [...state.locations, newLocation] });

        try {
          await supabase.from('locations').insert({
            id: newId,
            trip_id: state.activeTripId,
            name: location.name,
            latitude: location.lat,
            longitude: location.lng,
            address: location.address,
            day_index: location.dayIndex,
            order_index: orderIndex,
            custom_data: { 
              travelMode: location.travelMode || 'TRANSIT',
              placeId: location.placeId || null,
              time: location.time || null,
              photoUrl: (location as any).photoUrl || null,
              mapUrl: (location as any).mapUrl || null
            }
          });
        } catch (e) {
          console.error('Failed to add location:', e);
          set({ locations: get().locations.filter(l => l.id !== newId) });
        }
      },

      deleteLocation: async (id) => {
        const prev = get().locations;
        set({ locations: prev.filter(l => l.id !== id) });
        try {
          await supabase.from('locations').delete().eq('id', id);
        } catch (e) {
          console.error('Failed to delete location:', e);
          set({ locations: prev });
        }
      },
      
      updateLocation: async (id, updates) => {
        const prev = get().locations;
        set({ locations: prev.map(l => l.id === id ? { ...l, ...updates } : l) });
        
        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.lat !== undefined) dbUpdates.latitude = updates.lat;
          if (updates.lng !== undefined) dbUpdates.longitude = updates.lng;
          if (updates.address !== undefined) dbUpdates.address = updates.address;
          if (updates.dayIndex !== undefined) dbUpdates.day_index = updates.dayIndex;
          if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;
          
          if (updates.travelMode !== undefined || updates.placeId !== undefined || updates.time !== undefined || (updates as any).photoUrl !== undefined || (updates as any).mapUrl !== undefined) {
            const current = prev.find(l => l.id === id);
            dbUpdates.custom_data = {
              travelMode: updates.travelMode ?? current?.travelMode ?? 'TRANSIT',
              placeId: updates.placeId ?? current?.placeId ?? null,
              time: updates.time ?? current?.time ?? null,
              photoUrl: (updates as any).photoUrl ?? (current as any)?.photoUrl ?? null,
              mapUrl: (updates as any).mapUrl ?? (current as any)?.mapUrl ?? null
            };
          }
          
          if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('locations').update(dbUpdates).eq('id', id);
          }
        } catch (e) {
          console.error('Failed to update location:', e);
          set({ locations: prev });
        }
      },

      reorderLocations: async (dayIndex, reorderedIds) => {
        const state = get();
        const locations = [...state.locations];
        
        // Update local state first
        reorderedIds.forEach((id, index) => {
          const loc = locations.find(l => l.id === id);
          if (loc) {
            loc.orderIndex = index;
            loc.dayIndex = dayIndex;
          }
        });
        
        set({ locations });
        
        // Sync to DB
        try {
          console.log('[DEBUG] Sending reorder updates for IDs:', reorderedIds);
          
          // Use Promise.all to send individual update requests instead of upsert
          // to avoid violating not-null constraints for fields we aren't updating
          const updatePromises = reorderedIds.map((id, index) => 
            supabase.from('locations').update({
              order_index: index,
              day_index: dayIndex
            }).eq('id', id)
          );
          
          const results = await Promise.all(updatePromises);
          
          // Check if any of the updates failed
          const errors = results.filter(r => r.error).map(r => r.error);
          if (errors.length > 0) {
            console.error('[DEBUG] Some updates failed:', errors);
            throw errors[0];
          }
          
          console.log('[DEBUG] Reorder updates successful');
        } catch (e) {
          console.error('[DEBUG] Failed to reorder locations:', e);
          // Fetch fresh data to rollback to correct state
          if (state.activeTripId) {
            get().fetchTripDetails(state.activeTripId);
          }
        }
      },
      
      reorderMixedTimeline: async (dayIndex, reorderedItems) => {
        const state = get();
        
        // Use maps to store new indices for immutable updates
        const locationIndices = new Map<string, number>();
        const transportIndices = new Map<string, number>();
        
        reorderedItems.forEach((item, index) => {
          if (item.type === 'location') {
            locationIndices.set(item.id, index);
          } else {
            transportIndices.set(item.id, index);
          }
        });

        // Arrays to hold DB updates
        const updatePromises: PromiseLike<any>[] = [];

        // Immutable update for locations
        const newLocations = state.locations.map(loc => {
          if (locationIndices.has(loc.id)) {
            const newIndex = locationIndices.get(loc.id)!;
            updatePromises.push(
              supabase.from('locations').update({
                order_index: newIndex,
                day_index: dayIndex
              }).eq('id', loc.id)
            );
            return { ...loc, orderIndex: newIndex, dayIndex };
          }
          return loc;
        });

        // Immutable update for transportations
        const newTransportations = state.transportations.map(trans => {
          if (transportIndices.has(trans.id)) {
            const newIndex = transportIndices.get(trans.id)!;
            updatePromises.push(
              supabase.from('transportations').update({
                order_index: newIndex,
                day_index: dayIndex
              }).eq('id', trans.id)
            );
            return { ...trans, orderIndex: newIndex, dayIndex };
          }
          return trans;
        });
        
        // Update local state immediately with new object references
        set({ locations: newLocations, transportations: newTransportations });
        
        try {
          const results = await Promise.all(updatePromises);
          const errors = results.filter((r: any) => r?.error).map((r: any) => r.error);
          if (errors.length > 0) {
            throw errors[0];
          }
        } catch (error) {
          console.error('Error reordering timeline:', error);
          if (state.activeTripId) {
            get().fetchTripDetails(state.activeTripId);
          }
        }
      },

      addTransportation: async (transport) => {
        const state = get();
        if (!state.activeTripId) return;

        const newId = uuidv4();
        // Count both locations and transportations for a proper sequential orderIndex
        const locCount = state.locations.filter(l => l.dayIndex === transport.dayIndex).length;
        const transCount = state.transportations.filter(t => t.dayIndex === transport.dayIndex).length;
        const orderIndex = locCount + transCount;

        const newTransport = { 
          ...transport, 
          id: newId,
          orderIndex,
          // Make sure local state gets the lat/lng immediately without waiting for refresh
          depLat: transport.depLat,
          depLng: transport.depLng,
          arrLat: transport.arrLat,
          arrLng: transport.arrLng
        };
        set({ transportations: [...state.transportations, newTransport] });

        try {
          // Normalize type to english if it happens to be chinese
          let normalizedType = transport.type;
          if (normalizedType === '航班') normalizedType = 'flight';
          else if (normalizedType === '火车' || normalizedType === '高铁') normalizedType = 'train';
          else if (normalizedType === '巴士') normalizedType = 'bus';
          else if (normalizedType === '自驾') normalizedType = 'driving';

          let depTimeStr = transport.departureTime || null;
          let arrTimeStr = transport.arrivalTime || null;
          
          // Fix: Ensure we are sending a local timestamp to Supabase without converting to UTC
          // Supabase timestamp columns accept 'YYYY-MM-DDTHH:mm:00' exactly as is.
          if (depTimeStr && depTimeStr.length === 16) { // YYYY-MM-DDTHH:mm
            depTimeStr = `${depTimeStr}:00`;
          } else if (depTimeStr && !depTimeStr.includes('T')) {
            depTimeStr = `1970-01-01T${depTimeStr}:00`;
          }
          
          if (arrTimeStr && arrTimeStr.length === 16) {
            arrTimeStr = `${arrTimeStr}:00`;
          } else if (arrTimeStr && !arrTimeStr.includes('T')) {
            arrTimeStr = `1970-01-01T${arrTimeStr}:00`;
          }

          const { error } = await supabase.from('transportations').insert({
            id: newId,
            trip_id: state.activeTripId,
            type: normalizedType,
            departure_location: transport.departure,
            arrival_location: transport.arrival,
            departure_time: depTimeStr,
            arrival_time: arrTimeStr,
            day_index: transport.dayIndex,
            order_index: orderIndex,
            custom_data: {
              flightNumber: transport.flightNumber || null,
              terminal: transport.terminal || null,
              pnr: transport.pnr || null,
              depLat: transport.depLat || null,
              depLng: transport.depLng || null,
              arrLat: transport.arrLat || null,
              arrLng: transport.arrLng || null
            }
          });
          
          if (error) {
            console.error('[DEBUG] Supabase insert transport error:', error);
            throw error;
          }
        } catch (e) {
          console.error('Failed to add transport:', e);
          set({ transportations: get().transportations.filter(t => t.id !== newId) });
        }
      },

      deleteTransportation: async (id) => {
        const prev = get().transportations;
        set({ transportations: prev.filter(t => t.id !== id) });
        try {
          await supabase.from('transportations').delete().eq('id', id);
        } catch (e) {
          console.error('Failed to delete transport:', e);
          set({ transportations: prev });
        }
      },

      updateTransportation: async (id, updates) => {
        const prev = get().transportations;
        set({ transportations: prev.map(t => t.id === id ? { ...t, ...updates } : t) });
        
        try {
          const dbUpdates: any = {};
          if (updates.type !== undefined) {
            let normalizedType = updates.type;
            if (normalizedType === '航班') normalizedType = 'flight';
            else if (normalizedType === '火车' || normalizedType === '高铁') normalizedType = 'train';
            else if (normalizedType === '巴士') normalizedType = 'bus';
            else if (normalizedType === '自驾') normalizedType = 'driving';
            dbUpdates.type = normalizedType;
          }
          if (updates.departure !== undefined) dbUpdates.departure_location = updates.departure;
          if (updates.arrival !== undefined) dbUpdates.arrival_location = updates.arrival;
          if (updates.departureTime !== undefined) {
            let depTime = updates.departureTime;
            // Ensure proper format without UTC conversion
            if (depTime && depTime.length === 16) depTime = `${depTime}:00`;
            else if (depTime && !depTime.includes('T')) depTime = `1970-01-01T${depTime}:00`;
            dbUpdates.departure_time = depTime || null;
          }
          if (updates.arrivalTime !== undefined) {
            let arrTime = updates.arrivalTime;
            if (arrTime && arrTime.length === 16) arrTime = `${arrTime}:00`;
            else if (arrTime && !arrTime.includes('T')) arrTime = `1970-01-01T${arrTime}:00`;
            dbUpdates.arrival_time = arrTime || null;
          }
          if (updates.dayIndex !== undefined) dbUpdates.day_index = updates.dayIndex;

          // Handle custom data fields
          if (updates.flightNumber !== undefined || updates.terminal !== undefined || updates.pnr !== undefined || 
              updates.depLat !== undefined || updates.depLng !== undefined || 
              updates.arrLat !== undefined || updates.arrLng !== undefined ||
              updates.travelMode !== undefined) {
            const current = prev.find(t => t.id === id);
            dbUpdates.custom_data = {
              ...current?.custom_data,
              flightNumber: updates.flightNumber ?? current?.flightNumber ?? null,
              terminal: updates.terminal ?? current?.terminal ?? null,
              pnr: updates.pnr ?? current?.pnr ?? null,
              depLat: updates.depLat ?? current?.depLat ?? null,
              depLng: updates.depLng ?? current?.depLng ?? null,
              arrLat: updates.arrLat ?? current?.arrLat ?? null,
              arrLng: updates.arrLng ?? current?.arrLng ?? null,
              travelMode: updates.travelMode ?? current?.travelMode ?? 'TRANSIT'
            };
          }

          if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('transportations').update(dbUpdates).eq('id', id);
            if (error) {
              console.error('[DEBUG] Supabase update transport error:', error);
              throw error;
            }
          }
        } catch (e) {
          console.error('Failed to update transport:', e);
          set({ transportations: prev });
        }
      },
      
      addAccommodation: async (accommodation) => {
        const state = get();
        if (!state.activeTripId) return;

        const newId = uuidv4();
        const newAcc = { ...accommodation, id: newId };
        set({ accommodations: [...state.accommodations, newAcc] });

        try {
          await supabase.from('accommodations').insert({
            id: newId,
            trip_id: state.activeTripId,
            name: accommodation.name,
            address: accommodation.address,
            check_in_time: accommodation.checkIn || null,
            check_out_time: accommodation.checkOut || null,
            day_index: accommodation.dayIndex,
            lat: accommodation.lat,
            lng: accommodation.lng,
            place_id: accommodation.placeId,
            photo_url: accommodation.photoUrl,
            map_url: accommodation.mapUrl
          });
        } catch (e) {
          console.error('Failed to add accommodation:', e);
          set({ accommodations: get().accommodations.filter(a => a.id !== newId) });
        }
      },

      deleteAccommodation: async (id) => {
        const prev = get().accommodations;
        set({ accommodations: prev.filter(a => a.id !== id) });
        try {
          await supabase.from('accommodations').delete().eq('id', id);
        } catch (e) {
          console.error('Failed to delete accommodation:', e);
          set({ accommodations: prev });
        }
      },

      updateAccommodation: async (id, updates) => {
        const prev = get().accommodations;
        set({ accommodations: prev.map(a => a.id === id ? { ...a, ...updates } : a) });
        
        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.address !== undefined) dbUpdates.address = updates.address;
          if (updates.checkIn !== undefined) dbUpdates.check_in_time = updates.checkIn;
          if (updates.checkOut !== undefined) dbUpdates.check_out_time = updates.checkOut;
          if (updates.dayIndex !== undefined) dbUpdates.day_index = updates.dayIndex;
          if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
          if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
          if (updates.placeId !== undefined) dbUpdates.place_id = updates.placeId;
          if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
          if (updates.mapUrl !== undefined) dbUpdates.map_url = updates.mapUrl;
          
          if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('accommodations').update(dbUpdates).eq('id', id);
          }
        } catch (e) {
          console.error('Failed to update accommodation:', e);
          set({ accommodations: prev });
        }
      },

      loadActiveTrip: (trip) => {
        set({
          activeTripId: trip.id,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          locations: trip.locations || [],
          transportations: trip.transportations || [],
          accommodations: trip.accommodations || [],
        });
      },

      clearActiveTrip: () => {
        get().unsubscribeFromPresence();
        set({
          activeTripId: null,
          title: '新行程',
          destination: '',
          isPublic: false,
          locations: [],
          transportations: [],
          accommodations: [],
          collaborators: [],
          onlineUsers: []
        });
      }
    }),
    {
      name: 'trip-storage', 
      // We are completely removing the persistence of children arrays (locations, etc).
      // They MUST be fetched from the database every single time to ensure multi-device sync.
      merge: (persistedState: any, currentState) => {
        const merged = { ...currentState };
        
        if (persistedState) {
          // ONLY persist basic primitive info that is safe to cache
          if (persistedState.activeTripId !== undefined) merged.activeTripId = persistedState.activeTripId;
        }
        
        return merged;
      },
      partialize: (state) => ({ 
        activeTripId: state.activeTripId,
      }), 
    }
  )
);
