import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { PlanTrip } from './pages/PlanTrip';
import { TripDetail } from './pages/TripDetail';
import { Auth } from './pages/Auth';
import { Explore } from './pages/Explore';
import { Profile } from './pages/Profile';
import { UpdatePassword } from './pages/UpdatePassword';
import { useAuthStore } from './store/useAuthStore';
import { BottomNav } from './components/BottomNav';
import { useEffect } from 'react';
import { SharedTripDetail } from './pages/SharedTripDetail';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  // Check auth state manually here since we removed the initialize method
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    import('./supabase/client').then(({ supabase }) => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    });
  }, [setSession, setUser, setLoading]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth type="login" />} />
          <Route path="/register" element={<Auth type="register" />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/share/:shareToken" element={<SharedTripDetail />} />
          <Route path="/trip/:id" element={<TripDetail />} />
          
          {/* Protected Routes */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plan/:id" 
            element={
              <ProtectedRoute>
                <PlanTrip />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect all other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Routes>
          {/* Hide BottomNav on map/plan/share pages where it gets in the way of the map layout */}
          <Route path="/plan/:id" element={null} />
          <Route path="/share/:shareToken" element={null} />
          <Route path="*" element={<BottomNav />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
