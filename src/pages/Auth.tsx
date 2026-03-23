import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';

export const Auth: React.FC<{ type: 'login' | 'register' }> = ({ type }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google 登录失败，请稍后重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        setSuccessMsg('重置密码链接已发送至您的邮箱，请查收并点击链接重置密码。');
      } else if (type === 'register') {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        
        // We rely entirely on the Supabase trigger to create the user profile now.
        // We removed the frontend insert here because:
        // 1. It causes a 42501 (RLS violation) error since the user isn't authenticated yet
        // 2. The trigger handles it securely on the backend
        
        if (data.session) {
          // Auto sign-in if email confirmation is disabled
          navigate('/');
        } else {
          // Require email confirmation
          setSuccessMsg('注册成功！请前往您的邮箱点击验证链接以激活账号。（如果未收到，请检查垃圾邮件/Spam文件夹）');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      // Translate common Supabase errors
      let errorMsg = err.message;
      if (errorMsg === 'Invalid login credentials') errorMsg = '邮箱或密码错误';
      if (errorMsg === 'User already registered') errorMsg = '该邮箱已被注册';
      if (errorMsg === 'Password should be at least 6 characters') errorMsg = '密码长度至少需要6个字符';
      if (errorMsg === 'Email not confirmed') errorMsg = '邮箱尚未验证，请查收验证邮件';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Atlas PRISMX</h1>
          <p className="text-gray-500">
            {isForgotPassword 
              ? '请输入您的邮箱，我们将发送重置密码的链接' 
              : type === 'login' 
                ? '欢迎回来！请登录以继续。' 
                : '创建账号，开启您的旅程。'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>
          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? '处理中...' : isForgotPassword ? '发送重置链接' : (type === 'login' ? '登录' : '注册')}
          </button>
        </form>

        {!isForgotPassword && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex justify-center items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                继续使用 Google
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500 space-y-2">
          {isForgotPassword ? (
            <p><button onClick={() => {setIsForgotPassword(false); setError(null); setSuccessMsg(null);}} className="text-blue-600 hover:underline font-medium">返回登录</button></p>
          ) : type === 'login' ? (
            <>
              <p><button onClick={() => {setIsForgotPassword(true); setError(null); setSuccessMsg(null);}} className="text-gray-500 hover:text-blue-600 transition-colors">忘记密码？</button></p>
              <p>还没有账号？ <a href="/register" className="text-blue-600 hover:underline font-medium">去注册</a></p>
            </>
          ) : (
            <p>已经有账号了？ <a href="/login" className="text-blue-600 hover:underline font-medium">去登录</a></p>
          )}
        </div>
      </div>
    </div>
  );
};
