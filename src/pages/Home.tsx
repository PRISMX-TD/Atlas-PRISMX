import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapWrapper, Map } from '../components/Map';
import { MapPin, Plus, Search, Calendar, Map as MapIcon, Compass, Trash2, CheckSquare } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white flex flex-col pb-16">
      {/* Hero Section */}
      <div className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop')" 
          }}
        ></div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 text-sm font-medium tracking-wide">
            发现世界，规划未来
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
            ATLAS
          </h1>
          <div className="text-white/70 text-lg md:text-xl font-medium tracking-[0.2em] mb-6 uppercase">
            by PRISMX
          </div>
          <p className="text-lg md:text-2xl text-gray-200 mb-10 max-w-2xl font-light leading-relaxed drop-shadow-md">
            您的智能旅游规划助手。轻松规划路线、管理行程、记录美好回忆，让每一次出发都充满期待。
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center w-full sm:w-auto">
            <button 
              onClick={() => navigate('/register')}
              className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)] w-full sm:w-auto"
            >
              免费开始规划
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="bg-transparent hover:bg-white/10 text-white border border-white/50 px-8 py-4 rounded-full text-lg font-medium transition-all backdrop-blur-sm w-full sm:w-auto"
            >
              登录账号
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 px-6 max-w-7xl mx-auto w-full bg-white">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">为您打造的核心体验</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">从灵感爆发到踏上旅途，我们提供一站式的智能服务</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-10">
          <div className="group p-8 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 transform group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-blue-600/20">
              <MapIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">直观的地图规划</h3>
            <p className="text-gray-600 leading-relaxed">在交互式地图上轻松拖拽添加景点，自动规划最佳路线，让行程一目了然。</p>
          </div>
          
          <div className="group p-8 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-8 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-lg shadow-orange-500/20">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">智能日程管理</h3>
            <p className="text-gray-600 leading-relaxed">统筹管理交通、住宿和每日活动，清晰的时间轴让您的旅行井井有条。</p>
          </div>
          
          <div className="group p-8 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-8 transform group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-purple-600/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">探索与分享</h3>
            <p className="text-gray-600 leading-relaxed">发现其他旅行者的精彩路线，一键分享您的旅行日记和精美照片。</p>
          </div>
        </div>
      </div>

      {/* Footer with Risk Warning */}
      <div className="bg-gray-50 border-t border-gray-100 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed max-w-4xl mx-auto">
            <strong className="font-medium text-gray-500">风险提示：</strong> 本平台提供的所有旅游路线、行程规划及相关信息仅供参考。实际旅行中可能因天气、交通、政策或不可抗力等因素发生变动。请您在出行前仔细核实相关信息，并根据自身情况做好充分准备。我们建议您购买适当的旅游保险，以保障旅途安全。平台不对因使用本服务而产生的任何直接或间接损失承担法律责任。
          </p>
          <div className="mt-4 text-xs text-gray-400">
            &copy; {new Date().getFullYear()} ATLAS by PRISMX. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { trips, isLoadingTrips, fetchTrips, addTrip, loadActiveTrip, deleteTrip } = useTripStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Batch delete states
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  React.useEffect(() => {
    if (user?.id) {
      // Always fetch fresh data from Supabase when Dashboard mounts
      // This ensures if data was changed in another tab/browser, we get the latest
      fetchTrips(user.id);
    }
  }, [user?.id, fetchTrips]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const newTrip = {
      id: uuidv4(),
      title,
      destination,
      startDate: startDate,
      endDate: endDate,
      locations: [],
      transportations: [],
      accommodations: []
    };
    
    // 1. Set navigating state to true (optional, if you want a loading spinner, but we'll just close it)
    
    // 2. Add to global store and supabase
    try {
      await addTrip(newTrip, user.id);
      
      // 3. Set as active trip
      loadActiveTrip(newTrip);
      
      // 4. Reset form states and Close modal
      setTitle('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setShowCreateModal(false);
      
      // 5. Navigate to plan page
      navigate(`/plan/${newTrip.id}`);
    } catch (error) {
      console.error("Failed to create trip", error);
      // Optional: show error toast here
    }
  };

  const handleOpenTrip = (trip: any) => {
    if (isEditMode) {
      toggleTripSelection(trip.id);
      return;
    }
    
    // We navigate directly. PlanTrip will detect the URL ID 
    // and ALWAYS call fetchTripDetails to get the latest locations from DB.
    // We intentionally don't call loadActiveTrip(trip) here because 'trip' from the 
    // Home list doesn't contain the locations arrays (to save bandwidth).
    navigate(`/plan/${trip.id}`);
  };

  const toggleTripSelection = (id: string) => {
    const newSelection = new Set(selectedTrips);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTrips(newSelection);
  };

  const handleBatchDelete = async () => {
    // Delete all selected trips sequentially
    for (const id of selectedTrips) {
      await deleteTrip(id);
    }
    setSelectedTrips(new Set());
    setShowDeleteConfirm(false);
    setIsEditMode(false);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Clear selection when exiting edit mode
      setSelectedTrips(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">欢迎回来，{profile?.name || user?.email?.split('@')[0] || '旅行者'}！</h1>
            <p className="text-gray-500 mt-1">准备好下一次冒险了吗？</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
        </div>

        {/* Action Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">开启新旅程</h2>
            <p className="text-blue-100">输入目的地，立即开始规划您的专属行程。</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            创建新行程
          </button>
        </div>

        {/* Trips List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">我的行程</h3>
            {trips.length > 0 && (
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <span className="text-sm text-gray-500 mr-2">已选择 {selectedTrips.size} 项</span>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={selectedTrips.size === 0}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedTrips.size > 0 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" /> 删除
                    </button>
                    <button 
                      onClick={toggleEditMode}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      完成
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={toggleEditMode}
                    className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CheckSquare className="w-4 h-4" /> 批量管理
                  </button>
                )}
              </div>
            )}
          </div>
          
          {isLoadingTrips ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Empty State / Create New Card (hidden in edit mode) */}
              {!isEditMode && (
                <div 
                  onClick={() => setShowCreateModal(true)}
                  className="h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium">新建行程</span>
                </div>
              )}

              {/* Existing trips from store */}
              {trips.map(trip => {
                const parseLocal = (dateStr: string) => {
                  if (!dateStr) return new Date();
                  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
                  return new Date(y, m - 1, d);
                };
                return (
                <div 
                  key={trip.id}
                  onClick={() => handleOpenTrip(trip)}
                  className={`h-40 bg-white rounded-2xl shadow-sm border p-5 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group ${
                    isEditMode 
                      ? selectedTrips.has(trip.id)
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-100 hover:shadow-md hover:border-blue-200'
                  }`}
                >
                  {/* Selection Checkbox (visible only in edit mode) */}
                  {isEditMode && (
                    <div className="absolute top-4 right-4 z-20">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedTrips.has(trip.id)
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selectedTrips.has(trip.id) && <CheckSquare className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-gray-800 truncate pr-2">{trip.title}</h4>
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap">规划中</span>
                    </div>
                    {trip.destination && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {trip.destination}
                      </p>
                    )}
                  </div>
                  <div className="relative z-10 text-sm text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(parseLocal(trip.startDate), 'yyyy年MM月dd日')} - {format(parseLocal(trip.endDate), 'MM月dd日')}</span>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Batch Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">确认删除行程？</h2>
              <p className="text-gray-500 text-sm mb-6">
                您即将删除选中的 <span className="font-bold text-red-600">{selectedTrips.size}</span> 个行程。此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  onClick={handleBatchDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">创建新行程</h2>
              <p className="text-sm text-gray-500 mt-1">填写基本信息，之后随时可以修改</p>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">行程标题</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如：我的毕业旅行" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主要目的地</label>
                <input 
                  type="text" 
                  required
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="例如：巴黎，法国" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出发日期</label>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                >
                  开始规划
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const Home: React.FC = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  return user ? <Dashboard /> : <LandingPage />;
};
