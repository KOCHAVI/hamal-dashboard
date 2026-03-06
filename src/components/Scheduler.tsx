import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store';
import { format, addDays, startOfWeek, setHours, setMinutes, parseISO, addHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { Sun, Moon, Save, X, AlertTriangle, Clock } from 'lucide-react';
import { PresenceStatus } from '../types';
import clsx from 'clsx';

const getSlotKey = (date: Date, type: 'day' | 'night') => `${format(date, 'yyyy-MM-dd')}_${type}`;

export const Scheduler = () => {
  const { personnel, shifts, syncShifts, activeUser } = useAppContext();
  const isAdmin = activeUser?.isAdmin;
  
  const [startDate] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 });
  });

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)),
  [startDate]);

  const myPersonnel = useMemo(() => personnel.filter(p => {
    if (isAdmin) return !p.isAdmin;
    if (activeUser?.isHoT) {
      return p.teamId === activeUser.teamId && !p.isAdmin && p.currentStatus !== PresenceStatus.ABROAD;
    }
    return false;
  }), [personnel, isAdmin, activeUser]);

  const [initialDraft, setInitialDraft] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return JSON.stringify(initialDraft) !== JSON.stringify(draft);
  }, [initialDraft, draft]);

  useEffect(() => {
    const newDraft: Record<string, string[]> = {};
    const myPids = new Set(myPersonnel.map(p => p.id));

    shifts.forEach(shift => {
      const start = parseISO(shift.startTime);
      const startHour = start.getHours();
      let type: 'day' | 'night' | null = null;
      if (startHour === 9) type = 'day';
      else if (startHour === 21) type = 'night';
      
      if (type) {
        const key = getSlotKey(start, type);
        const validPids = (shift.personnelIds || []).filter(pid => myPids.has(pid));
        if (validPids.length > 0) {
          newDraft[key] = [...(newDraft[key] || []), ...validPids];
        }
      }
    });
    setInitialDraft(newDraft);
    setDraft(newDraft);
  }, [shifts, myPersonnel]);

  const isSlotPast = (date: Date, type: 'day' | 'night') => {
    const now = new Date();
    const slotEnd = new Date(date);
    if (type === 'day') {
      slotEnd.setHours(21, 0, 0, 0);
    } else {
      slotEnd.setHours(21, 0, 0, 0);
      const actualEnd = addHours(slotEnd, 12);
      return now > actualEnd;
    }
    return now > slotEnd;
  };

  const toggleSoldierInSlot = (key: string, pid: string, date: Date, type: 'day' | 'night') => {
    if (isSlotPast(date, type)) return;
    
    setDraft(prev => {
      const current = prev[key] || [];
      if (current.includes(pid)) {
        return { ...prev, [key]: current.filter(id => id !== pid) };
      } else {
        return { ...prev, [key]: [...current, pid] };
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const additions: any[] = [];
      const removals: any[] = [];
      const allKeys = new Set([...Object.keys(initialDraft), ...Object.keys(draft)]);

      allKeys.forEach(key => {
        const initial = initialDraft[key] || [];
        const current = draft[key] || [];
        if (JSON.stringify([...initial].sort()) === JSON.stringify([...current].sort())) return;

        const [dateStr, type] = key.split('_');
        const baseDate = new Date(dateStr);
        if (isSlotPast(baseDate, type as any)) return;

        let startTime, endTime;
        if (type === 'day') {
          startTime = setMinutes(setHours(new Date(dateStr), 9), 0).toISOString();
          endTime = setMinutes(setHours(new Date(dateStr), 21), 0).toISOString();
        } else {
          startTime = setMinutes(setHours(new Date(dateStr), 21), 0).toISOString();
          endTime = addHours(setMinutes(setHours(new Date(dateStr), 21), 0), 12).toISOString();
        }

        current.filter(pid => !initial.includes(pid)).forEach(pid => {
          additions.push({ personnel_id: pid, start_time: startTime, end_time: endTime });
        });
        initial.filter(pid => !current.includes(pid)).forEach(pid => {
          removals.push({ personnel_id: pid, start_time: startTime, end_time: endTime });
        });
      });

      if (additions.length === 0 && removals.length === 0) {
        alert('לא בוצעו שינויים בסידור');
        setIsSaving(false);
        return;
      }

      await syncShifts(additions, removals);
      alert(`הסידור סונכרן! נוספו: ${additions.length}, הוסרו: ${removals.length}`);
    } catch (err) {
      alert('שגיאה בסנכרון הסידור');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-right transition-colors duration-200" dir="rtl">
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center transition-colors">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">סידור עבודה שבועי</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            ניהול משמרות לצוות: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{isAdmin ? 'כלל היחידה' : activeUser?.fullName}</span>
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={clsx(
            "flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
            (isSaving || !hasChanges) ? "bg-zinc-400 dark:bg-zinc-800 cursor-not-allowed opacity-50" : "bg-indigo-600 hover:bg-indigo-700 text-white"
          )}
        >
          {isSaving ? <Clock className="animate-spin" size={20} /> : <Save size={20} />}
          שמור שינויים (סנכרון)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="min-w-[1200px] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-colors">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            {weekDays.map((day, i) => (
              <div key={i} className="p-4 text-center border-l border-zinc-200 dark:border-zinc-800 last:border-0">
                <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{format(day, 'EEEE', { locale: he })}</div>
                <div className="text-2xl font-black text-zinc-900 dark:text-white">{format(day, 'dd/MM')}</div>
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 divide-x divide-x-reverse divide-zinc-100 dark:divide-zinc-800">
            {weekDays.map((day, dayIdx) => {
              const dayKey = getSlotKey(day, 'day');
              const nightKey = getSlotKey(day, 'night');
              const selectedDayPids = draft[dayKey] || [];
              const selectedNightPids = draft[nightKey] || [];
              const dayPast = isSlotPast(day, 'day');
              const nightPast = isSlotPast(day, 'night');

              return (
                <div key={dayIdx} className="flex flex-col min-h-[600px] bg-zinc-50/30 dark:bg-zinc-900/10">
                  <div className={clsx("p-4 flex-1 flex flex-col transition-all", dayPast && "opacity-40 grayscale bg-zinc-200/50 dark:bg-zinc-800/50")}>
                    <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500 font-bold text-[10px] bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30 uppercase">
                      <Sun size={12} /> משמרת יום (09-21) {dayPast && ' - עבר'}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {myPersonnel
                        .slice()
                        .sort((a, b) => {
                          if (!isAdmin) return 0;
                          const aSelected = selectedDayPids.includes(a.id);
                          const bSelected = selectedDayPids.includes(b.id);
                          if (aSelected && !bSelected) return -1;
                          if (!aSelected && bSelected) return 1;
                          return 0;
                        })
                        .map(p => (
                        <button
                          key={p.id}
                          disabled={dayPast}
                          onClick={() => toggleSoldierInSlot(dayKey, p.id, day, 'day')}
                          className={clsx(
                            "w-full text-right p-2 rounded-xl border transition-all text-xs font-bold flex justify-between items-center group",
                            selectedDayPids.includes(p.id) 
                              ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-700 dark:border-indigo-400 text-white shadow-sm" 
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-500",
                            dayPast && "cursor-not-allowed border-transparent shadow-none"
                          )}
                        >
                          <span>{p.fullName}</span>
                          {selectedDayPids.includes(p.id) && !dayPast && <X size={12} className="opacity-50" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={clsx("p-4 flex-1 flex flex-col border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 transition-all", nightPast && "opacity-40 grayscale bg-zinc-300/50 dark:bg-zinc-800/50")}>
                    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/30 uppercase">
                      <Moon size={12} /> משמרת לילה (21-09) {nightPast && ' - עבר'}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {myPersonnel
                        .slice()
                        .sort((a, b) => {
                          if (!isAdmin) return 0;
                          const aSelected = selectedNightPids.includes(a.id);
                          const bSelected = selectedNightPids.includes(b.id);
                          if (aSelected && !bSelected) return -1;
                          if (!aSelected && bSelected) return 1;
                          return 0;
                        })
                        .map(p => (
                        <button
                          key={p.id}
                          disabled={nightPast}
                          onClick={() => toggleSoldierInSlot(nightKey, p.id, day, 'night')}
                          className={clsx(
                            "w-full text-right p-2 rounded-xl border transition-all text-xs font-bold flex justify-between items-center group",
                            selectedNightPids.includes(p.id) 
                              ? "bg-slate-800 dark:bg-slate-700 border-zinc-900 dark:border-zinc-600 text-white shadow-sm" 
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-slate-500",
                            nightPast && "cursor-not-allowed border-transparent shadow-none"
                          )}
                        >
                          <span>{p.fullName}</span>
                          {selectedNightPids.includes(p.id) && !nightPast && <X size={12} className="opacity-50" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-6 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm transition-colors">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full"></div><span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">נבחר ליום</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-800 dark:bg-slate-700 rounded-full"></div><span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">נבחר ללילה</span></div>
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 mr-auto text-xs font-medium">
            <AlertTriangle size={14} />
            <span>מצב סנכרון: נשלחים רק שינויים (תוספות והסרות) לשרת.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
