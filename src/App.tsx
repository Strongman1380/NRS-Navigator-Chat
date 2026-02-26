import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import EnhancedPublicChat from './components/EnhancedPublicChat';
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard';
import { usePushNotifications } from './hooks/usePushNotifications';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();

  // Register push notifications for admin users on native platforms
  usePushNotifications(user?.id, isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (isAdmin) {
    return <EnhancedAdminDashboard />;
  }

  return <EnhancedPublicChat />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
