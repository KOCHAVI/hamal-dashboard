import React, { useMemo, useState } from 'react';
import { LayoutDashboard, AlertTriangle, Users, CalendarDays, Settings, RefreshCw, UserCircle, Plane, LogOut, Sun, Moon, Shield, Menu, X as CloseIcon, BarChart3 } from 'lucide-react';
import { useAppContext } from '../store';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { sirenMode, toggleSirenMode, activeUser, setActiveUser, refreshData, personnel, darkMode, toggleDarkMode } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const isGuest = activeUser?.id === 'guest';
  const isAdmin = activeUser?.isAdmin;
  const isHoT = activeUser?.isHoT;

  const hasMyReservists = useMemo(() => {
    if (isAdmin) return true;
    if (!isHoT) return false;
    return personnel.some(p => p.teamId === activeUser.teamId && p.isReservist);
  }, [personnel, isAdmin, isHoT, activeUser]);

  const hasAnyoneAbroad = useMemo(() => {
    return personnel.some(p => p.currentStatus === 'בחו"ל');
  }, [personnel]);

  const tabs = [
    { id: 'board', label: 'לוח נוכחות', icon: LayoutDashboard, show: true },
    { id: 'sadach', label: 'סד"כ בסיס', icon: Shield, show: isAdmin },
    { id: 'reservists', label: 'מילואים', icon: Users, show: isAdmin || hasMyReservists },
    { id: 'abroad', label: 'חו"ל', icon: Plane, show: isAdmin && hasAnyoneAbroad },
    { id: 'scheduler', label: 'סידור משמרות', icon: CalendarDays, show: true },
    { id: 'analytics', label: 'אנליטיקה', icon: BarChart3, show: isAdmin || isHoT },
    { id: 'management', label: 'ניהול כוח אדם', icon: Settings, show: isAdmin || isHoT },
  ].filter(t => t.show);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-[60]" dir="rtl">
        <button onClick={() => setIsOpen(true)} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-white tracking-tight">פיקוד חמ"ל</h1>
        <div className="flex gap-2">
          <button onClick={toggleDarkMode} className="p-2 text-zinc-400">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={clsx(
        "fixed lg:static inset-y-0 right-0 w-64 bg-zinc-900 text-zinc-300 flex flex-col h-full border-l border-zinc-800 transition-transform duration-300 z-[80] lg:translate-x-0 shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">פיקוד חמ"ל</h1>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">ניהול כוח אדם</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-zinc-500 hover:text-white">
              <CloseIcon size={20} />
            </button>
            <button onClick={toggleDarkMode} className="hidden lg:block p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => refreshData()} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 py-4 flex flex-col gap-1 px-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsOpen(false);
                }}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium',
                  isActive ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800/50 hover:text-white'
                )}
              >
                <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-4">
          {activeUser && (
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
              <div className="flex items-center gap-2">
                <UserCircle className="text-indigo-400" size={18} />
                <div className="text-right">
                  <div className="text-xs font-bold text-white leading-none">{activeUser.fullName}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {isAdmin ? 'מנהל מערכת' : isGuest ? 'אורח' : 'ראש צוות'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setActiveUser(null); setIsOpen(false); }}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => { toggleSirenMode(); setIsOpen(false); }}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-wider transition-all text-xs',
                sirenMode 
                  ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse' 
                  : 'bg-zinc-800 text-red-500 hover:bg-red-950/30 border border-red-900/30'
              )}
            >
              <AlertTriangle size={16} />
              {sirenMode ? 'אזעקה פעילה' : 'מצב אזעקה'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
