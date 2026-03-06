import React from 'react';
import { useAppContext } from '../store';
import { PresenceStatus } from '../types';
import { Users, Phone, ShieldCheck, UserCircle } from 'lucide-react';
import clsx from 'clsx';

export const SADACH = () => {
  const { personnel, teams } = useAppContext();

  const inBasePersonnel = personnel.filter(
    p => p.currentStatus === PresenceStatus.BASE_SHIFT && !p.isAdmin
  );

  const groupedByTeam = teams.map(team => ({
    ...team,
    members: inBasePersonnel.filter(p => p.teamId === team.id),
  })).filter(t => t.members.length > 0);

  // Unassigned or unknown team members
  const unassignedMembers = inBasePersonnel.filter(p => !p.teamId || !teams.find(t => t.id === p.teamId));

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-right transition-colors duration-200" dir="rtl">
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
              <Users className="text-indigo-600 dark:text-indigo-400" size={32} />
              סד"כ נוכחות בבסיס
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium leading-relaxed">
              סקירה מלאה של כלל החיילים הנמצאים כעת במשמרת בבסיס, מחולקים לפי צוותים.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm text-center">
              <div className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-1">סה"כ בבסיס</div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{inBasePersonnel.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groupedByTeam.map(team => (
            <div key={team.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-indigo-500" size={20} />
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{team.name}</h3>
                </div>
                <span className="bg-white dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                  {team.members.length} חיילים
                </span>
              </div>
              
              <div className="p-4 space-y-3">
                {team.members.map(member => (
                  <div key={member.id} className="group flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 text-zinc-400 group-hover:text-indigo-500 transition-colors">
                        <UserCircle size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-zinc-900 dark:text-white">{member.fullName}</div>
                        <div className="text-[10px] text-zinc-400 font-medium">במשמרת</div>
                      </div>
                    </div>
                    <a 
                      href={`tel:${member.phoneNumber}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-zinc-100 dark:border-zinc-700 hover:border-indigo-200 transition-all"
                    >
                      <Phone size={14} />
                      <span className="text-xs font-bold" dir="ltr">{member.phoneNumber}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {unassignedMembers.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Users className="text-zinc-400" size={20} />
                <h3 className="text-lg font-bold text-zinc-500 dark:text-zinc-400 italic">ללא צוות משויך</h3>
              </div>
              <div className="space-y-3">
                {unassignedMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-bold text-sm dark:text-zinc-300">{member.fullName}</span>
                    <span className="text-xs font-mono dark:text-zinc-500" dir="ltr">{member.phoneNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inBasePersonnel.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white dark:bg-zinc-900 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors">
              <Users size={64} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-6" />
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white">אין חיילים בבסיס</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">כאשר חיילים יעדכנו סטטוס ל"בבסיס - במשמרת", הם יופיעו כאן.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
