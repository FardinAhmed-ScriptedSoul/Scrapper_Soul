import { useState } from 'react';
import { useAuth } from '../../context/useAuth.js';

const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { id: 'scrappers', label: 'Scrape', icon: 'search' },
  { id: 'results', label: 'Results', icon: 'inventory_2' },
  { id: 'tasks', label: 'Tasks', icon: 'assignment' },
  { id: 'schedules', label: 'Schedules', icon: 'schedule' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'presets', label: 'Presets', icon: 'bookmark' },
  { id: 'feeds', label: 'Feed Status', icon: 'rss_feed' },
];

export default function AppLayout({ children, activeTab, setActiveTab, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const accountName = user?.username || user?.email || 'Account';

  return (
    <div className="min-h-screen bg-[#0b141c] text-[#dae3ee] flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden w-full bg-[#0d1117] border-b border-slate-800 px-4 py-3 flex justify-between items-center z-30">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-blue-400 text-xl">database</span>
          <span className="font-bold tracking-wide text-white text-sm">Scrapper-Soul</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Slide-out Navigation Drawer Layer for Mobile Devices */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <nav 
            className="w-64 h-full bg-[#0d1117] border-r border-slate-800 p-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-800">
                <span className="material-symbols-outlined text-blue-400">database</span>
                <span className="font-bold tracking-wide text-white">Scrapper-Soul</span>
              </div>
              <ul className="space-y-2">
                {NAVIGATION_ITEMS.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        activeTab === item.id 
                          ? 'bg-blue-950/40 text-blue-400 border border-blue-900/50' 
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Disconnect</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Persistent Sidebar Framework for Tablet and Desktop Devices */}
      <aside className="hidden md:flex md:w-64 bg-[#0d1117] border-r border-slate-800 flex-col justify-between p-6 shrink-0 h-screen sticky top-0 select-none">
        <div className="space-y-8">
          {/* Main Logo Header Area */}
          <div className="flex items-center space-x-3 pl-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center radiant-glow">
              <span className="material-symbols-outlined text-blue-400 text-lg">database</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-white leading-none">Scrapper-Soul</h1>
              <span className="text-[10px] text-slate-500 font-medium tracking-normal">Data collection</span>
            </div>
          </div>

          {/* Core Sidebar Navigation Menu Link Collection */}
          <ul className="space-y-1.5">
            {NAVIGATION_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-blue-950/30 text-blue-400 border border-blue-900/40' 
                      : 'text-slate-400 border border-transparent hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Signed-in account */}
        <div className="border-t border-slate-800/80 pt-4 space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <span className="text-sm font-semibold text-slate-300">{accountName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight">{accountName}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wide text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Application Work Area Viewport Wrapper */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto custom-scrollbar">
        {/* Dynamic Inner Dashboard Page Render Injector */}
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}