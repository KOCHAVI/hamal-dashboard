import React, { useMemo } from 'react';
import { LayoutDashboard, AlertTriangle, Users, CalendarDays, Settings, RefreshCw, UserCircle, Plane, LogOut, Sun, Moon, Shield } from 'lucide-react';
import { useAppContext } from '../store';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { sirenMode, toggleSirenMode, activeUser, setActiveUser, refreshData, personnel, darkMode, toggleDarkMode } = useAppContext();

  const isGuest = activeUser?.id === 'guest';
  const isAdmin = activeUser?.isAdmin;
  const isHoT = activeUser?.isHoT;

  const hasMyReservists = useMemo(() => {
    if (isAdmin) return true;
    if (!isHoT) return false;
    return personnel.some(p => p.teamId === activeUser.teamId && p.isReservist);
  }, [personnel, isAdmin, isHoT, activeUser]);

  const tabs = [
    { id: 'board', label: 'לוח נוכחות', icon: LayoutDashboard, show: true },
    { id: 'sadach', label: 'סד"כ בסיס', icon: Shield, show: isAdmin },
    { id: 'reservists', label: 'מילואים', icon: Users, show: isAdmin || hasMyReservists },
    { id: 'abroad', label: 'חו"ל', icon: Plane, show: isAdmin },
    { id: 'scheduler', label: 'סידור משמרות', icon: CalendarDays, show: true },
    { id: 'management', label: 'ניהול כוח אדם', icon: Settings, show: isAdmin || isHoT },
  ].filter(t => t.show);

  return (
    <div className="w-64 bg-zinc-900 text-zinc-300 flex flex-col h-full border-l border-zinc-800">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">פיקוד חמ"ל</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">ניהול כוח אדם</p>
        </div>
        <div className="flex gap-1">
          <button onClick={toggleDarkMode} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors" title="החלף מצב תצוגה">
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => refreshData()} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors" title="רענן נתונים">
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
              onClick={() => setActiveTab(tab.id)}
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
              <div>
                <div className="text-xs font-bold text-white">{activeUser.fullName}</div>
                <div className="text-[10px] text-zinc-500">
                  {isAdmin ? 'מנהל מערכת' : isGuest ? 'אורח' : 'ראש צוות'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setActiveUser(null)}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="התנתק"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {isAdmin && (
          <button
            onClick={toggleSirenMode}
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
  );
};
