import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { PresenceStatus } from '../types';
import { Shield, Users, Search, Filter } from 'lucide-react';
import clsx from 'clsx';

export const SADACH = () => {
  const { personnel, teams, activeUser } = useAppContext();
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = activeUser?.isAdmin;

  const onBasePersonnel = useMemo(() => {
    return personnel.filter(p => 
      p.currentStatus === PresenceStatus.BASE_SHIFT && 
      !p.isAdmin &&
      (selectedTeam === 'all' || p.teamId === selectedTeam) &&
      (p.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [personnel, selectedTeam, searchQuery]);

  const stats = useMemo(() => {
    const total = onBasePersonnel.length;
    const reservists = onBasePersonnel.filter(p => p.isReservist).length;
    const regulars = total - reservists;
    return { total, reservists, regulars };
  }, [onBasePersonnel]);

  // Group by team
  const teamsOnBase = useMemo(() => {
    const groups: Record<string, typeof onBasePersonnel> = {};
    onBasePersonnel.forEach(p => {
      const teamName = teams.find(t => t.id === p.teamId)?.name || 'ללא צוות';
      if (!groups[teamName]) groups[teamName] = [];
      groups[teamName].push(p);
    });
    return groups;
  }, [onBasePersonnel, teams]);

  return (
    <div className="h-full flex flex-col bg-transparent text-right transition-colors duration-200" dir="rtl">
      <div className="p-6 lg:p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 dark:bg-indigo-500 rounded-2xl text-white shadow-lg">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">סד"כ נוכחות בבסיס</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">מי כרגע בבסיס?</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Team Filter */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <Filter size={16} className="text-zinc-400 mr-2" />
            <select 
              className="bg-transparent text-sm font-bold outline-none p-1 min-w-[140px]"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="all">כל הצוותים</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="חיפוש חייל..."
              className="w-full sm:w-64 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-2xl outline-none p-2.5 pr-9 focus:ring-2 focus:ring-indigo-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-3 top-3 text-zinc-400" size={14} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/40 dark:bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">סה"כ בבסיס</div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Users size={24} />
            </div>
          </div>
          <div className="bg-white/40 dark:bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">סדיר</div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.regulars}</div>
          </div>
          <div className="bg-white/40 dark:bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">מילואים</div>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.reservists}</div>
          </div>
        </div>

        {/* Teams List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.entries(teamsOnBase).map(([teamName, soldiers]) => (
            <div key={teamName} className="bg-white/40 dark:bg-zinc-900/20 backdrop-blur-md rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-zinc-900 dark:text-white">{teamName}</h3>
                <span className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full text-[10px] font-black">{soldiers.length}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {soldiers.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30">
                    <span className="text-xs font-bold dark:text-zinc-300">{s.fullName}</span>
                    {s.isReservist && <span className="text-[8px] font-black bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase">מילואים</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(teamsOnBase).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Shield size={48} className="opacity-20 mb-4" />
            <p className="text-lg font-medium">אין חיילים בבסיס העונים על תנאי הסינון</p>
          </div>
        )}
      </div>
    </div>
  );
};
