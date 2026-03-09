import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store';
import { format, addDays, startOfWeek, setHours, setMinutes, parseISO, addHours, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { Sun, Moon, Save, X, AlertTriangle, Clock, ChevronRight, ChevronLeft, Calendar, Filter } from 'lucide-react';
import { PresenceStatus } from '../types';
import clsx from 'clsx';

const getSlotKey = (date: Date, type: 'day' | 'night') => `${format(date, 'yyyy-MM-dd')}_${type}`;

const normalizeDraft = (rawDraft: Record<string, string[]>) => {
  const normalized: Record<string, string[]> = {};
  Object.keys(rawDraft).sort().forEach(key => {
    const pids = rawDraft[key].filter(Boolean).sort();
    if (pids.length > 0) {
      normalized[key] = pids;
    }
  });
  return normalized;
};

export const Scheduler = () => {
  const { personnel, shifts, syncShifts, activeUser, teams, showNotification } = useAppContext();
  const isAdmin = activeUser?.isAdmin;
  
  // States
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');

  const startDate = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return weekOffset >= 0 ? addWeeks(base, weekOffset) : subWeeks(base, Math.abs(weekOffset));
  }, [weekOffset]);

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)),
  [startDate]);

  const myPersonnel = useMemo(() => personnel.filter(p => {
    if (isAdmin) {
      if (p.isAdmin) return false;
      if (selectedTeamId !== 'all' && p.teamId !== selectedTeamId) return false;
      return true;
    }
    if (activeUser?.isHoT) {
      return p.teamId === activeUser.teamId && !p.isAdmin && p.currentStatus !== PresenceStatus.ABROAD;
    }
    return false;
  }), [personnel, isAdmin, activeUser, selectedTeamId]);

  const [initialDraft, setInitialDraft] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return JSON.stringify(normalizeDraft(initialDraft)) !== JSON.stringify(normalizeDraft(draft));
  }, [initialDraft, draft]);

  useEffect(() => {
    if (hasChanges) return;

    const newDraft: Record<string, string[]> = {};
    const visiblePids = new Set(myPersonnel.map(p => p.id));

    shifts.forEach(shift => {
      const start = parseISO(shift.startTime);
      const startHour = start.getHours();
      let type: 'day' | 'night' | null = null;
      if (startHour === 9) type = 'day';
      else if (startHour === 21) type = 'night';
      
      if (type) {
        const key = getSlotKey(start, type);
        const validPids = (shift.personnelIds || []).filter(pid => visiblePids.has(pid));
        if (validPids.length > 0) {
          newDraft[key] = [...(newDraft[key] || []), ...validPids];
        }
      }
    });
    setInitialDraft(normalizeDraft(newDraft));
    setDraft(normalizeDraft(newDraft));
  }, [shifts, myPersonnel, hasChanges, startDate]);

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
      let next;
      if (current.includes(pid)) {
        next = current.filter(id => id !== pid);
      } else {
        next = [...current, pid];
      }
      const newDraft = { ...prev };
      if (next.length === 0) delete newDraft[key];
      else newDraft[key] = next.sort();
      return newDraft;
    });
  };

  const handleSave = async () => {
    if (isSaving || !hasChanges) return;
    setIsSaving(true);
    try {
      const additions: any[] = [];
      const removals: any[] = [];
      const normInitial = normalizeDraft(initialDraft);
      const normDraft = normalizeDraft(draft);
      const allKeys = new Set([...Object.keys(normInitial), ...Object.keys(normDraft)]);

      allKeys.forEach(key => {
        const initial = normInitial[key] || [];
        const current = normDraft[key] || [];
        if (JSON.stringify(initial) === JSON.stringify(current)) return;

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

        current.filter(pid => !initial.includes(pid)).forEach(pid => additions.push({ personnel_id: pid, start_time: startTime, end_time: endTime }));
        initial.filter(pid => !current.includes(pid)).forEach(pid => removals.push({ personnel_id: pid, start_time: startTime, end_time: endTime }));
      });

      if (additions.length === 0 && removals.length === 0) {
        showNotification('לא בוצעו שינויים בסידור', 'info');
        setIsSaving(false);
        return;
      }

      await syncShifts(additions, removals);
      setInitialDraft(normDraft);
      showNotification(`הסידור סונכרן! נוספו: ${additions.length}, הוסרו: ${removals.length}`, 'success');
    } catch (err) { showNotification('שגיאה בסנכרון הסידור', 'error'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-right transition-colors duration-200" dir="rtl">
      <div className="p-4 lg:p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">סידור עבודה</h2>
            <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              צפייה בסידור: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{isAdmin && selectedTeamId === 'all' ? 'כל היחידה' : (teams.find(t => t.id === selectedTeamId)?.name || activeUser?.fullName)}</span>
            </p>
          </div>

          {/* Team Filter (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 mr-0 sm:mr-4">
              <Filter size={16} className="text-zinc-400 mr-2" />
              <select 
                className="bg-transparent text-sm font-bold outline-none p-1 min-w-[140px]"
                value={selectedTeamId}
                onChange={(e) => {
                  if (!hasChanges || window.confirm('שינויים שלא נשמרו יאבדו. להמשיך?')) {
                    setSelectedTeamId(e.target.value);
                  }
                }}
              >
                <option value="all">כל הצוותים</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {/* Week Navigator */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 mr-0 sm:mr-2">
            <button onClick={() => { if(!hasChanges || window.confirm('שינויים שלא נשמרו יאבדו. להמשיך?')) setWeekOffset(prev => prev - 1); }} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-300" title="שבוע קודם"><ChevronRight size={20} /></button>
            <div className="px-4 flex items-center gap-2 border-x border-zinc-200 dark:border-zinc-700 mx-1">
              <Calendar size={16} className="text-indigo-500" /><span className="text-sm font-black text-zinc-900 dark:text-white whitespace-nowrap">{format(startDate, 'dd/MM')} - {format(weekDays[6], 'dd/MM')}</span>
            </div>
            <button onClick={() => { if(!hasChanges || window.confirm('שינויים שלא נשמרו יאבדו. להמשיך?')) setWeekOffset(prev => prev + 1); }} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-300" title="שבוע הבא"><ChevronLeft size={20} /></button>
            {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="mr-2 px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-600 transition-colors">היום</button>}
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving || !hasChanges} className={clsx("w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95", (isSaving || !hasChanges) ? "bg-zinc-400 dark:bg-zinc-800 cursor-not-allowed opacity-50 text-zinc-100" : "bg-indigo-600 hover:bg-indigo-700 text-white")}>{isSaving ? <Clock className="animate-spin" size={20} /> : <Save size={20} />}שמור שינויים</button>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="min-w-[1000px] lg:min-w-0 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-colors">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            {weekDays.map((day, i) => (
              <div key={i} className="p-4 text-center border-l border-zinc-200 dark:border-zinc-800 last:border-0">
                <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{format(day, 'EEEE', { locale: he })}</div>
                <div className="text-xl font-black text-zinc-900 dark:text-white">{format(day, 'dd/MM')}</div>
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
                <div key={dayIdx} className="flex flex-col min-h-[500px] bg-zinc-50/30 dark:bg-zinc-900/10">
                  <div className={clsx("p-3 flex-1 flex flex-col transition-all", dayPast && "opacity-40 grayscale bg-zinc-200/50 dark:bg-zinc-800/50")}>
                    <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500 font-bold text-[9px] bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30 uppercase"><Sun size={10} /> יום {dayPast && ' - עבר'}</div>
                    <div className="flex-1 space-y-1">
                      {myPersonnel.slice().sort((a, b) => {
                        const aS = selectedDayPids.includes(a.id);
                        const bS = selectedDayPids.includes(b.id);
                        if (aS && !bS) return -1;
                        if (!aS && bS) return 1;
                        return a.fullName.localeCompare(b.fullName, 'he');
                      }).map(p => (
                        <button key={p.id} disabled={dayPast || isSaving} onClick={() => toggleSoldierInSlot(dayKey, p.id, day, 'day')} className={clsx("w-full text-right p-1.5 rounded-lg border transition-all text-[11px] font-bold flex justify-between items-center group", selectedDayPids.includes(p.id) ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-700 dark:border-indigo-400 text-white shadow-sm" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-500", (dayPast || isSaving) && "cursor-not-allowed border-transparent shadow-none")}><span className="truncate">{p.fullName}</span>{selectedDayPids.includes(p.id) && !dayPast && <X size={10} className="opacity-50" />}</button>
                      ))}
                    </div>
                  </div>
                  <div className={clsx("p-3 flex-1 flex flex-col border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 transition-all", nightPast && "opacity-40 grayscale bg-zinc-300/50 dark:bg-zinc-800/50")}>
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] bg-indigo-50 dark:bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 uppercase"><Moon size={10} /> לילה {nightPast && ' - עבר'}</div>
                    <div className="flex-1 space-y-1">
                      {myPersonnel.slice().sort((a, b) => {
                        const aS = selectedNightPids.includes(a.id);
                        const bS = selectedNightPids.includes(b.id);
                        if (aS && !bS) return -1;
                        if (!aS && bS) return 1;
                        return a.fullName.localeCompare(b.fullName, 'he');
                      }).map(p => (
                        <button key={p.id} disabled={nightPast || isSaving} onClick={() => toggleSoldierInSlot(nightKey, p.id, day, 'night')} className={clsx("w-full text-right p-1.5 rounded-lg border transition-all text-[11px] font-bold flex justify-between items-center group", selectedNightPids.includes(p.id) ? "bg-slate-800 dark:bg-slate-700 border-zinc-900 dark:border-zinc-600 text-white shadow-sm" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-slate-500", (nightPast || isSaving) && "cursor-not-allowed border-transparent shadow-none")}><span className="truncate">{p.fullName}</span>{selectedNightPids.includes(p.id) && !nightPast && <X size={10} className="opacity-50" />}</button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
