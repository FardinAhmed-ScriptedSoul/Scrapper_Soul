import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Login from './features/auth/components/Login.jsx';
import Register from './features/auth/components/Register.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import OverviewDashboard from './features/dashboard/components/OverviewDashboard.jsx';
import ScrapperConfig from './features/scrappers/components/ScrapperConfig.jsx';
import TaskManager from './features/tasks/components/TaskManager.jsx';
import ProxyManager from './features/proxies/components/ProxyManager.jsx';
import SystemSettings from './features/settings/components/SystemSettings.jsx';

function App() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Display a dark system initializing screen during active session token validations
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0b141c] flex flex-col items-center justify-center font-mono select-none">
        <div className="w-10 h-10 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-500 tracking-widest uppercase animate-pulse">Initializing Mainframe Handshake...</p>
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
      {activeTab === 'tasks' && <TaskManager />}
      {activeTab === 'proxies' && <ProxyManager />}
      {activeTab === 'settings' && <SystemSettings />}
    </AppLayout>
  );
}

export default App;