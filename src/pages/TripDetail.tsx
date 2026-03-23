import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/useTripStore';
import { useAuthStore } from '../store/useAuthStore';
import { MapPin, Calendar, Clock, ArrowLeft, Image as ImageIcon, Upload, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { MapWrapper, Map, Marker, RoutePolyline } from '../components/Map';

// Add this before the component:
export const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { title, destination, startDate, endDate, locations, transportations, accommodations, fetchTripDetails, isLoadingActiveTrip } = useTripStore();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'photos'>('overview');
  const [photos, setPhotos] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [globalConfirmDialog, setGlobalConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  // Generate markers for map
  const mapMarkers = React.useMemo(() => {
    const markers: any[] = [];
    
    locations.forEach(loc => {
      markers.push({
        id: `loc-${loc.id}`,
        lat: loc.lat,
        lng: loc.lng,
        title: loc.name,
        type: 'location',
        orderIndex: loc.orderIndex
      });
    });

    transportations.forEach(trans => {
      if (trans.depLat && trans.depLng) {
        markers.push({
          id: `trans-dep-${trans.id}`,
          lat: trans.depLat,
          lng: trans.depLng,
          title: trans.departure,
          type: 'transport_departure'
        });
      }
      if (trans.arrLat && trans.arrLng) {
        markers.push({
          id: `trans-arr-${trans.id}`,
          lat: trans.arrLat,
          lng: trans.arrLng,
          title: trans.arrival,
          type: 'transport_arrival'
        });
      }
    });

    accommodations.forEach(acc => {
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
  }, [locations, transportations, accommodations]);

  useEffect(() => {
    if (id) {
      // Execute without failing the entire render if one fails
      fetchTripDetails(id).catch(console.error);
      fetchPhotos().catch(console.error);
      
      // Explicitly check permissions safely
      const initPermissions = async () => {
        if (!user || !id) return;
        try {
          const { data: trip, error: tripError } = await supabase.from('trips').select('user_id').eq('id', id).single();
          if (!tripError && trip?.user_id === user.id) {
            setCanEdit(true);
            return;
          }
          
          const { data: member, error: memberError } = await supabase.from('trip_members').select('role').eq('trip_id', id).eq('user_id', user.id).maybeSingle();
          if (!memberError && member && (member.role === 'owner' || member.role === 'editor')) {
            setCanEdit(true);
          }
        } catch (e) {
          console.error('Permission check failed:', e);
        }
      };
      
      initPermissions();
    }
  }, [id, fetchTripDetails, user]);

  const fetchPhotos = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('trip_id', id)
        .order('uploaded_at', { ascending: false });
        
      if (error) throw error;
      
      // Get public URLs
      const photosWithUrls = await Promise.all(data.map(async (photo) => {
        const { data: { publicUrl } } = supabase.storage
          .from('trip_photos')
          .getPublicUrl(photo.storage_path);
          
        return { ...photo, url: publicUrl };
      }));
      
      setPhotos(photosWithUrls);
    } catch (e) {
      console.error('Error fetching photos', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id || !user) return;
    
    setIsUploading(true);
    const files = Array.from(e.target.files);
    
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('trip_photos')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        // Save to DB
        await supabase.from('photos').insert({
          trip_id: id,
          storage_path: filePath
        });
      }
      
      // Refresh photos
      await fetchPhotos();
    } catch (e) {
      console.error('Error uploading photos', e);
      setGlobalConfirmDialog({
        isOpen: true,
        message: '上传失败，请重试',
        onConfirm: () => {}
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, storagePath: string) => {
    setGlobalConfirmDialog({
      isOpen: true,
      message: '确定要删除这张照片吗？',
      onConfirm: async () => {
        try {
          // Delete from DB
          await supabase.from('photos').delete().eq('id', photoId);
          
          // Delete from storage
          await supabase.storage.from('trip_photos').remove([storagePath]);
          
          setPhotos(photos.filter(p => p.id !== photoId));
        } catch (e) {
          console.error('Error deleting photo', e);
        }
      }
    });
  };

  if (isLoadingActiveTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const computedDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
  const days = Number.isFinite(computedDays) ? Math.max(1, computedDays) : 1;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
          <p className="text-xs text-gray-500">
            {destination} · {days}天路线
            {canEdit && ` · ${startDate.split('T')[0]}`}
          </p>
        </div>
        {canEdit && (
          <button 
            onClick={() => navigate(`/plan/${id}`)}
            className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
          >
            编辑行程
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-6 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          行程概览
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'map' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          地图标注
        </button>
        <button 
          onClick={() => setActiveTab('photos')}
          className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'photos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          照片墙
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="max-w-3xl mx-auto p-4 space-y-6">
            {/* Show info based on permission */}
            {canEdit && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">总天数</div>
                    <div className="text-lg font-bold text-gray-900">{days} 天</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">目的地</div>
                    <div className="text-lg font-bold text-gray-900 truncate">{destination || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">地点数</div>
                    <div className="text-lg font-bold text-gray-900">{locations.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">日期</div>
                    <div className="text-sm font-medium text-gray-900">{startDate.split('-').slice(1).join('/')} 至 {endDate.split('-').slice(1).join('/')}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 px-2">行程路线</h3>
              {Array.from({ length: days }).map((_, dayIndex) => {
                const dayLocs = locations.filter(l => l.dayIndex === dayIndex).sort((a, b) => a.orderIndex - b.orderIndex);
                if (dayLocs.length === 0) return null;
                
                return (
                  <div key={dayIndex} className="bg-white rounded-2xl p-4 shadow-sm">
                    <h4 className="font-semibold text-blue-600 mb-3">第 {dayIndex + 1} 天</h4>
                    <div className="space-y-4">
                      {dayLocs.map((loc, i) => (
                        <div key={loc.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </div>
                            {i < dayLocs.length - 1 && <div className="w-0.5 h-full bg-gray-100 my-1"></div>}
                          </div>
                          <div className="pb-2">
                            <div className="font-medium text-gray-900">{loc.name}</div>
                            {loc.address && <div className="text-xs text-gray-500 mt-1">{loc.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-[60vh] w-full mt-4">
            <MapWrapper>
              <Map 
                center={locations.length > 0 ? { lat: locations[0].lat, lng: locations[0].lng } : { lat: 35.6762, lng: 139.6503 }}
                zoom={12}
                className="w-full h-full rounded-2xl shadow-sm"
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
                  locations={locations.map(l => ({lat: l.lat, lng: l.lng, placeId: l.placeId, travelMode: l.travelMode || 'TRANSIT', time: l.time}))}
                />
              </Map>
            </MapWrapper>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="max-w-4xl mx-auto p-4">
            {canEdit && (
              <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="font-semibold text-gray-900">旅行回忆</h3>
                  <p className="text-xs text-gray-500 mt-1">上传照片，记录美好瞬间</p>
                </div>
                <label className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium cursor-pointer hover:bg-blue-100 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" />
                  {isUploading ? '上传中...' : '上传照片'}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
            )}

            {photos.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无照片</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="aspect-square relative group rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                    <img src={photo.url} alt="Trip memory" className="w-full h-full object-cover" />
                    {canEdit && (
                      <button 
                        onClick={() => handleDeletePhoto(photo.id, photo.storage_path)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
    </div>
  );
};
