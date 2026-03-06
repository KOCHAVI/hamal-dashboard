import React, { useState } from 'react';
import { useAppContext } from '../store';
import { PresenceStatus } from '../types';
import { ShieldAlert, CheckCircle2, XCircle, Phone } from 'lucide-react';
import clsx from 'clsx';

export const SirenMode = () => {
  const { personnel, teams, toggleSirenMode } = useAppContext();
  const [checkedPersonnel, setCheckedPersonnel] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) => {
    setCheckedPersonnel(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const inBasePersonnel = personnel.filter(
    p => p.currentStatus === PresenceStatus.BASE_SHIFT
  );

  const groupedByTeam = teams.map(team => {
    return {
      ...team,
      members: inBasePersonnel.filter(p => p.teamId === team.id),
    };
  });

  return (
    <div className="h-screen w-full flex flex-col bg-red-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      
      <div className="p-8 border-b border-red-900/50 flex justify-between items-center bg-red-900/20 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.8)] animate-pulse">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-red-50">מסדר נוכחות חירום</h1>
            <p className="text-red-300 font-medium tracking-widest uppercase text-sm mt-1">מצב אזעקה פעיל - ודא נוכחות</p>
          </div>
        </div>
        
        <button 
          onClick={toggleSirenMode}
          className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl border border-red-900/50 transition-colors uppercase tracking-wider text-sm"
        >
          כיבוי אזעקה
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedByTeam.map(team => {
            const teamCheckedCount = team.members.filter(m => checkedPersonnel.has(m.id)).length;
            const allChecked = team.members.length === 0 || teamCheckedCount === team.members.length;
            
            return (
            <div key={team.id} className={clsx(
              "border rounded-3xl overflow-hidden backdrop-blur-md transition-colors",
              allChecked ? "bg-emerald-900/20 border-emerald-800/50" : "bg-red-900/20 border-red-800/50"
            )}>
              <div className={clsx(
                "p-4 border-b flex justify-between items-center transition-colors",
                allChecked ? "bg-emerald-900/40 border-emerald-800/50" : "bg-red-900/40 border-red-800/50"
              )}>
                <h2 className={clsx("text-xl font-bold uppercase tracking-wider transition-colors", allChecked ? "text-emerald-50" : "text-red-50")}>{team.name}</h2>
                <span className={clsx(
                  "px-3 py-1 text-xs font-bold rounded-full border transition-colors",
                  allChecked ? "bg-emerald-950 text-emerald-400 border-emerald-900/50" : "bg-red-950 text-red-400 border-red-900/50"
                )}>
                  {teamCheckedCount} / {team.members.length}
                </span>
              </div>
              
              <div className="p-4 flex flex-col gap-3">
                {team.members.length === 0 ? (
                  <div className={clsx("text-center py-8 font-medium uppercase tracking-widest text-sm", allChecked ? "text-emerald-400/50" : "text-red-400/50")}>
                    אין אנשי צוות בבסיס
                  </div>
                ) : (
                  team.members.map(member => {
                    const isChecked = checkedPersonnel.has(member.id);
                    return (
                    <div 
                      key={member.id} 
                      onClick={() => toggleCheck(member.id)}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer transform active:scale-[0.98]",
                        isChecked ? "bg-emerald-950/50 border-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-red-950/50 border-red-900/30 hover:border-red-700/50"
                      )}
                    >
                      <div>
                        <div className={clsx("font-bold transition-colors", isChecked ? "text-emerald-50" : "text-red-50")}>{member.fullName}</div>
                        <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold mt-0.5" dir="ltr">
                          <Phone size={10} />
                          <span>{member.phoneNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-indigo-900/50 text-indigo-300">
                          במשמרת
                        </span>
                        <div 
                          className={clsx(
                            "p-2 rounded-lg border transition-colors",
                            isChecked 
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                              : "bg-zinc-900/50 text-zinc-500 border-zinc-800"
                          )} 
                        >
                          <CheckCircle2 size={20} />
                        </div>
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};
