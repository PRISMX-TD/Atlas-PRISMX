import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, MapPin, Map as MapIcon, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { supabase } from '../supabase/client';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuthStore();
  const { trips, isLoadingTrips, fetchTrips, loadActiveTrip } = useTripStore();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
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
    if (user?.id) {
      fetchTrips(user.id);
    }
  }, [user?.id, fetchTrips]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleEditProfile = () => {
    setEditName(profile?.name || user?.email?.split('@')[0] || '旅行者');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    
    setIsUpdating(true);
    try {
      await updateProfile({ name: editName.trim() });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setGlobalConfirmDialog({
        isOpen: true,
        message: '更新个人信息失败，请重试',
        onConfirm: () => {}
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h2>
          <button 
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium"
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4 pb-20 relative">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">个人中心</h1>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">
              {profile?.name || user.email?.split('@')[0] || '旅行者'}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button 
            onClick={handleEditProfile}
            className="text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            编辑
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 px-2">我的行程</h3>
          
          {isLoadingTrips ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : trips.length > 0 ? (
            trips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => {
                  loadActiveTrip(trip);
                  navigate(`/plan/${trip.id}`);
                }}
                className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                  <MapIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{trip.title}</h4>
                  <p className="text-xs text-gray-500">
                    {Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)))}天 • {trip.locations.length}个地点
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              暂无行程，开始规划您的第一次旅行吧！
            </div>
          )}

          <div 
            onClick={() => navigate('/')}
            className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors text-orange-500 border border-dashed border-orange-200"
          >
            <MapPin className="w-5 h-5" />
            <span className="font-medium">规划新行程</span>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <button className="w-full bg-white rounded-xl p-4 flex items-center justify-between text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-400" />
              <span>设置</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-white rounded-xl p-4 flex items-center justify-between text-red-600 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span>退出登录</span>
            </div>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" />
                编辑个人资料
              </h3>
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="输入你的昵称..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                  maxLength={20}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isUpdating ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
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
    </div>
  );
};
