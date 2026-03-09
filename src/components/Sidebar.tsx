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

  const hasAnyoneAbroad = useMemo(() => {
    return personnel.some(p => p.currentStatus === 'בחו"ל');
  }, [personnel]);

  const tabs = [
    { id: 'board', label: 'לוח נוכחות', icon: LayoutDashboard, show: true },
    { id: 'sadach', label: 'סד"כ בסיס', icon: Shield, show: isAdmin },
    { id: 'abroad', label: 'חו"ל', icon: Plane, show: isAdmin && hasAnyoneAbroad },
    { id: 'scheduler', label: 'סידור משמרות', icon: CalendarDays, show: true },
    { id: 'analytics', label: 'אנליטיקה', icon: BarChart3, show: isAdmin || isHoT },
    { id: 'management', label: 'ניהול כוח אדם', icon: Settings, show: isAdmin || isHoT },
  ].filter(t => t.show);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden h-16 bg-zinc-900/80 dark:bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-[60]" dir="rtl">
        <button onClick={() => setIsOpen(true)} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-white tracking-tight text-center flex-1 ml-8">פיקוד חמ"ל</h1>
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
        "fixed lg:static inset-y-0 right-0 w-64 bg-zinc-100/80 dark:bg-black/20 backdrop-blur-xl text-zinc-600 dark:text-zinc-300 flex flex-col h-full border-l border-zinc-200 dark:border-white/5 transition-transform duration-300 z-[80] lg:translate-x-0 shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-zinc-200 dark:border-white/5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">פיקוד חמ"ל</h1>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">מערכת ניהול</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
              <CloseIcon size={20} />
            </button>
            <button onClick={toggleDarkMode} className="hidden lg:block p-1.5 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => refreshData()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 py-6 flex flex-col gap-1 px-3">
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
                  'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold',
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-white/5 space-y-4">
          {activeUser && (
            <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <UserCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-zinc-900 dark:text-white leading-none mb-1">{activeUser.fullName}</div>
                  <div className="text-[9px] text-zinc-500 dark:text-zinc-500 uppercase tracking-tighter">
                    {isAdmin ? 'מנהל מערכת' : isGuest ? 'אורח' : 'ראש צוות'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setActiveUser(null); setIsOpen(false); }}
                className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-400/10 rounded-xl transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => { toggleSirenMode(); setIsOpen(false); }}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-4 py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-[10px] shadow-lg',
                sirenMode 
                  ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse' 
                  : 'bg-zinc-200 dark:bg-zinc-800/50 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/30'
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
