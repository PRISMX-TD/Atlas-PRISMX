import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, Share2, MapPin, Calendar } from 'lucide-react';
import { useTripStore } from '../store/useTripStore';
import { format } from 'date-fns';

export const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { publicTrips, isLoadingPublicTrips, fetchPublicTrips } = useTripStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{show: boolean, message: string}>({show: false, message: ''});

  const showToast = (message: string) => {
    setToastMessage({show: true, message});
    setTimeout(() => {
      setToastMessage({show: false, message: ''});
    }, 2000);
  };

  useEffect(() => {
    fetchPublicTrips();
  }, [fetchPublicTrips]);

  const filteredTrips = publicTrips.filter(trip => 
    trip.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (trip.destination && trip.destination.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4 pb-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">探索</h1>
        
        {/* Search Bar */}
        <div className="bg-white rounded-full flex items-center px-4 py-3 shadow-sm mb-8">
          <Search className="text-gray-400 w-5 h-5 mr-3" />
          <input
            type="text"
            placeholder="搜索目的地、行程..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-gray-800"
          />
        </div>

        {/* Featured Trips */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">精选行程</h2>
          
          {isLoadingPublicTrips ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTrips.length > 0 ? (
            filteredTrips.map((trip: any) => {
              const days = Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div 
                  key={trip.id} 
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-orange-50 relative flex flex-col items-center justify-center text-blue-300">
                    <MapPin className="w-12 h-12 mb-2" />
                    <span className="font-medium text-lg text-blue-400">{trip.destination}</span>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-800 shadow-sm">
                      {days}天路线
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {trip.authorAvatar ? (
                            <img src={trip.authorAvatar} alt="avatar" className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px] text-gray-500 font-bold">
                              {trip.authorName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <p className="text-sm text-gray-500">{trip.authorName}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-50 transition-colors"
                          onClick={(e) => { e.stopPropagation(); /* TODO: Like logic */ }}
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-50 transition-colors"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigator.clipboard.writeText(`${window.location.origin}/trip/${trip.id}`);
                            showToast('链接已复制');
                          }}
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-500 bg-white rounded-2xl shadow-sm">
              <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>暂无公开行程</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage.show && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {toastMessage.message}
        </div>
      )}
    </div>
  );
};
