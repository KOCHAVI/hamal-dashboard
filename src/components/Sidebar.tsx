import React from 'react';
import { LayoutDashboard, AlertTriangle, Users, CalendarDays } from 'lucide-react';
import { useAppContext } from '../store';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { sirenMode, toggleSirenMode } = useAppContext();

  const tabs = [
    { id: 'board', label: 'לוח נוכחות', icon: LayoutDashboard },
    { id: 'reservists', label: 'מילואים', icon: Users },
    { id: 'scheduler', label: 'סידור משמרות', icon: CalendarDays },
  ];

  return (
    <div className="w-64 bg-zinc-900 text-zinc-300 flex flex-col h-full border-l border-zinc-800">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white tracking-tight">פיקוד חמ"ל</h1>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">ניהול כוח אדם</p>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium',
                isActive ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800/50 hover:text-white'
              )}
            >
              <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={toggleSirenMode}
          className={clsx(
            'w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold uppercase tracking-wider transition-all',
            sirenMode 
              ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse' 
              : 'bg-zinc-800 text-red-500 hover:bg-red-950/30 border border-red-900/30'
          )}
        >
          <AlertTriangle size={20} />
          {sirenMode ? 'אזעקה פעילה' : 'מצב אזעקה'}
        </button>
      </div>
    </div>
  );
};
