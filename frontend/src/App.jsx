import { useState } from 'react';
import { useAuth } from './context/useAuth.js';
import Login from './features/auth/components/Login.jsx';
import Register from './features/auth/components/Register.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import OverviewDashboard from './features/dashboard/components/OverviewDashboard.jsx';
import ScrapperConfig from './features/scrappers/components/ScrapperConfig.jsx';
import TaskManager from './features/tasks/components/TaskManager.jsx';
import ScheduleManager from './features/schedules/components/ScheduleManager.jsx';
import SavedResults from './features/results/components/SavedResults.jsx';
import NotificationSettings from './features/notifications/components/NotificationSettings.jsx';
import SavedSearchPresets from './features/presets/components/SavedSearchPresets.jsx';
import FeedStatus from './features/feeds/components/FeedStatus.jsx';

function App() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Display a dark system initializing screen during active session token validations
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0b141c] flex flex-col items-center justify-center font-mono select-none">
        <div className="w-10 h-10 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-500 tracking-widest uppercase animate-pulse">Checking your session...</p>
      </div>
    );
  }

  // Route protection rules: If session token is unauthenticated, bind them to security gates
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <Register onNavigate={() => setAuthView('login')} />;
    }
    return <Login onNavigate={() => setAuthView('register')} />;
  }

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout}>
      {activeTab === 'dashboard' && <OverviewDashboard />}
      {activeTab === 'scrappers' && <ScrapperConfig />}
      {activeTab === 'results' && <SavedResults />}
      {activeTab === 'tasks' && <TaskManager />}
      {activeTab === 'schedules' && <ScheduleManager />}
      {activeTab === 'notifications' && <NotificationSettings />}
      {activeTab === 'presets' && <SavedSearchPresets />}
      {activeTab === 'feeds' && <FeedStatus />}
    </AppLayout>
  );
}

export default App;