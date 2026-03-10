import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../store';
import { format, addDays, startOfWeek, setHours, setMinutes, parseISO, addHours, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { Sun, Moon, Save, X, AlertTriangle, Clock, ChevronRight, ChevronLeft, Calendar, Filter, Search, ShieldCheck, ShieldAlert, Info, Users } from 'lucide-react';
import { PresenceStatus } from '../types';
import clsx from 'clsx';

const getSlotKey = (date: Date, type: 'day' | 'night') => `${format(date, 'yyyy-MM-dd')}_${type}`;

const normalizeDraft = (rawDraft: Record<string, string[]>) => {
  const normalized: Record<string, string[]> = {};
  Object.keys(rawDraft).sort().forEach(key => {
    const pids = rawDraft[key].filter(Boolean).sort();
    if (pids.length > 0) normalized[key] = pids;
  });
  return normalized;
};

export const Scheduler = () => {
  const { personnel, shifts, syncShifts, activeUser, teams, showNotification } = useAppContext();
  const isAdmin = activeUser?.isAdmin;
  const isGuest = activeUser?.id === 'guest';
  const isStaff = isAdmin || activeUser?.isHoT;
  
  // States
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConsecutiveGuardEnabled, setIsConsecutiveGuardEnabled] = useState(true);
  const [onlyReservists, setOnlyReservists] = useState(false);
  
  // Mobile Day State
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const today = new Date().getDay();
    return today; // 0-6
  });

  const startDate = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return weekOffset >= 0 ? addWeeks(base, weekOffset) : subWeeks(base, Math.abs(weekOffset));
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)), [startDate]);

  const [initialDraft, setInitialDraft] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => JSON.stringify(normalizeDraft(initialDraft)) !== JSON.stringify(normalizeDraft(draft)), [initialDraft, draft]);

  useEffect(() => {
    if (hasChanges) return;
    const newDraft: Record<string, string[]> = {};
    shifts.forEach(shift => {
      const start = parseISO(shift.startTime), startHour = start.getHours();
      let type: 'day' | 'night' | null = (startHour === 9) ? 'day' : (startHour === 21 ? 'night' : null);
      if (type) {
        const key = getSlotKey(start, type);
        const visiblePids = (shift.personnelIds || []).filter(pid => {
          const person = personnel.find(p => p.id === pid);
          if (!person) return false;
          if (isStaff) {
            if (isAdmin) return selectedTeamId === 'all' || person.teamId === selectedTeamId;
            return person.teamId === activeUser?.teamId;
          }
          if (isGuest) {
            if (selectedTeamId !== 'all' && person.teamId !== selectedTeamId) return false;
            if (onlyReservists && !person.isReservist) return false;
            if (searchQuery && !person.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          }
          return true;
        });
        if (visiblePids.length > 0) newDraft[key] = [...(newDraft[key] || []), ...visiblePids];
      }
    });
    setInitialDraft(normalizeDraft(newDraft));
    setDraft(normalizeDraft(newDraft));
  }, [shifts, hasChanges, startDate, selectedTeamId, searchQuery, onlyReservists, personnel, isAdmin, isGuest, isStaff, activeUser]);

  const isSlotPast = (date: Date, type: 'day' | 'night') => {
    const now = new Date(), slotEnd = new Date(date);
    if (type === 'day') slotEnd.setHours(21, 0, 0, 0);
    else { slotEnd.setHours(21, 0, 0, 0); const actualEnd = addHours(slotEnd, 12); return now > actualEnd; }
    return now > slotEnd;
  };

  const toggleSoldierInSlot = (key: string, pid: string, date: Date, type: 'day' | 'night') => {
    if (isGuest || isSlotPast(date, type)) return;
    setDraft(prev => {
      const current = prev[key] || [], next = current.includes(pid) ? current.filter(id => id !== pid) : [...current, pid];
      const newDraft = { ...prev };
      if (next.length === 0) delete newDraft[key]; else newDraft[key] = next.sort();
      return newDraft;
    });
  };

  const handleSave = async () => {
    if (isGuest || isSaving || !hasChanges) return;
    setIsSaving(true);
    try {
      const additions: any[] = [], removals: any[] = [];
      const normInitial = normalizeDraft(initialDraft), normDraft = normalizeDraft(draft), allKeys = new Set([...Object.keys(normInitial), ...Object.keys(normDraft)]);
      allKeys.forEach(key => {
        const initial = normInitial[key] || [], current = normDraft[key] || [];
        if (JSON.stringify(initial) === JSON.stringify(current)) return;
        const [dateStr, type] = key.split('_'), baseDate = new Date(dateStr);
        if (isSlotPast(baseDate, type as any)) return;
        let startTime, endTime;
        if (type === 'day') { startTime = setMinutes(setHours(new Date(dateStr), 9), 0).toISOString(); endTime = setMinutes(setHours(new Date(dateStr), 21), 0).toISOString(); }
        else { startTime = setMinutes(setHours(new Date(dateStr), 21), 0).toISOString(); endTime = addHours(setMinutes(setHours(new Date(dateStr), 21), 0), 12).toISOString(); }
        current.filter(pid => !initial.includes(pid)).forEach(pid => additions.push({ personnel_id: pid, start_time: startTime, end_time: endTime }));
        initial.filter(pid => !current.includes(pid)).forEach(pid => removals.push({ personnel_id: pid, start_time: startTime, end_time: endTime }));
      });
      if (additions.length === 0 && removals.length === 0) { setIsSaving(false); return; }
      await syncShifts(additions, removals);
      setInitialDraft(normDraft);
      showNotification(`הסידור סונכרן!`, 'success');
    } catch (err) { showNotification('שגיאה בסנכרון', 'error'); }
    finally { setIsSaving(false); }
  };

  const getPrevSlotKey = (date: Date, type: 'day' | 'night') => {
    if (type === 'night') return getSlotKey(date, 'day');
    return getSlotKey(addDays(date, -1), 'night');
  };

  const renderSlotPersonnel = (selectedPids: string[], type: 'day' | 'night', day: Date, dayKey: string) => {
    let candidateList = [];
    if (isStaff) {
      candidateList = personnel.filter(p => {
        if (p.isAdmin) return false;
        if (isAdmin) {
          if (selectedTeamId !== 'all' && p.teamId !== selectedTeamId) return false;
        } else {
          if (p.teamId !== activeUser?.teamId) return false;
          if (p.currentStatus === PresenceStatus.ABROAD) return false;
        }
        if (onlyReservists && !p.isReservist) return false;
        if (searchQuery && !p.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (isConsecutiveGuardEnabled && !selectedPids.includes(p.id)) {
          const prevKey = type === 'day' ? getPrevSlotKey(day, 'day') : getSlotKey(day, 'day');
          if ((draft[prevKey] || []).includes(p.id)) return false;
        }
        return true;
      });
    }
    const assignedList = personnel.filter(p => selectedPids.includes(p.id) && (!isStaff || isAdmin || p.teamId === activeUser?.teamId));
    const allVisible = isStaff ? Array.from(new Set([...candidateList, ...assignedList])) : assignedList;

    return allVisible.sort((a,b) => {
      const aS = selectedPids.includes(a.id), bS = selectedPids.includes(b.id);
      if(aS && !bS) return -1; if(!aS && bS) return 1; return a.fullName.localeCompare(b.fullName, 'he');
    }).map(p => (
      <button key={p.id} disabled={isGuest || (type === 'day' ? isSlotPast(day, 'day') : isSlotPast(day, 'night')) || isSaving} onClick={() => toggleSoldierInSlot(type === 'day' ? dayKey : getSlotKey(day, 'night'), p.id, day, type)} className={clsx("w-full text-right p-1.5 rounded-lg border transition-all text-[11px] font-bold flex justify-between items-center group", selectedPids.includes(p.id) ? (type === 'day' ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-700" : "bg-slate-800 dark:bg-slate-700 border-zinc-900") + " text-white shadow-sm" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-500", isGuest && "cursor-default pointer-events-none")}>
        <span className="truncate">{p.fullName}</span>
        {selectedPids.includes(p.id) && !isGuest && !(type === 'day' ? isSlotPast(day, 'day') : isSlotPast(day, 'night')) && <X size={10} className="opacity-50" />}
      </button>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-right transition-colors duration-200" dir="rtl">
      {/* Top Header */}
      <div className="p-4 lg:p-8 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-colors shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{isGuest ? 'סידור משמרות' : 'סידור עבודה'}</h2>
            <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">
              צפייה בסידור: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedTeamId === 'all' ? 'כל היחידה' : (teams.find(t => t.id === selectedTeamId)?.name)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setOnlyReservists(!onlyReservists)} className={clsx("flex items-center gap-2 px-4 py-2 rounded-2xl border font-bold text-[11px] transition-all shadow-sm", onlyReservists ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-emerald-900/50 dark:text-amber-400" : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400")}>
              <Users size={14}/> {onlyReservists ? 'מציג מילואים' : 'כל החיילים'}
            </button>

            <div className="flex items-center gap-2 bg-white/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <Filter size={16} className="text-zinc-400 mr-2" />
              <select className="bg-transparent text-sm font-bold outline-none p-1 min-w-[120px]" value={selectedTeamId} onChange={(e) => { if (!hasChanges || window.confirm('שינויים שלא נשמרו יאבדו?')) setSelectedTeamId(e.target.value); }}>
                <option value="all">כל הצוותים</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {isStaff && (
              <div className="flex items-center gap-1 group relative">
                <button onClick={() => setIsConsecutiveGuardEnabled(!isConsecutiveGuardEnabled)} className={clsx("flex items-center gap-2 px-4 py-2 rounded-2xl border font-bold text-[11px] transition-all shadow-sm", isConsecutiveGuardEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400" : "bg-zinc-50 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400")}>
                  {isConsecutiveGuardEnabled ? <ShieldCheck size={14}/> : <ShieldAlert size={14}/>} מנע כפילויות
                </button>
                <div className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors cursor-help"><Info size={14} /></div>
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-zinc-900 text-white text-[10px] rounded-xl shadow-2xl opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-[200] border border-zinc-800 pointer-events-none font-medium">כאשר המצב פעיל, חייל ששובץ למשמרת יוסתר אוטומטית מהמשמרת העוקבת.</div>
              </div>
            )}
            
            <div className="relative">
              <input type="text" placeholder="חיפוש..." className="bg-white/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-900 dark:text-white text-sm rounded-2xl outline-none p-2.5 pr-9 w-32 focus:ring-2 focus:ring-indigo-500/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Search className="absolute right-3 top-3 text-zinc-400" size={14} />
            </div>

            <div className="flex items-center gap-2 bg-white/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <button onClick={() => { if(!hasChanges || window.confirm('שינויים שלא נשמרו יאבדו?')) setWeekOffset(prev => prev - 1); }} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-300" title="שבוע קודם"><ChevronRight size={20} /></button>
              <div className="px-4 flex items-center gap-2 border-x border-zinc-200 dark:border-zinc-700 mx-1">
                <Calendar size={16} className="text-indigo-500" /><span className="text-sm font-black text-zinc-900 dark:text-white whitespace-nowrap">{format(startDate, 'dd/MM')} - {format(weekDays[6], 'dd/MM')}</span>
              </div>
              <button onClick={() => { if(!hasChanges || window.confirm('שינויים שלא נשמרו יאבדו?')) setWeekOffset(prev => prev + 1); }} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-300" title="שבוע הבא"><ChevronLeft size={20} /></button>
              {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="mr-2 px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-600 transition-colors uppercase">היום</button>}
            </div>
          </div>
        </div>

        {isStaff && (
          <button onClick={handleSave} disabled={isSaving || !hasChanges} className={clsx("w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95", (isSaving || !hasChanges) ? "bg-zinc-400 dark:bg-zinc-800 cursor-not-allowed opacity-50 text-zinc-100" : "bg-indigo-600 hover:bg-indigo-700 text-white")}>
            {isSaving ? <Clock className="animate-spin" size={20} /> : <Save size={20} />} שמור שינויים
          </button>
        )}
      </div>

      {/* Mobile Day Selector (ONLY VISIBLE ON MOBILE) */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        <button onClick={() => setMobileDayIndex(prev => (prev + 1) % 7)} className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700"><ChevronRight size={20}/></button>
        <div className="text-center">
          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{format(weekDays[mobileDayIndex], 'EEEE', { locale: he })}</div>
          <div className="text-xl font-black text-zinc-900 dark:text-white">{format(weekDays[mobileDayIndex], 'dd/MM')}</div>
        </div>
        <button onClick={() => setMobileDayIndex(prev => (prev - 1 + 7) % 7)} className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700"><ChevronLeft size={20}/></button>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="min-w-0 lg:min-w-0 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col transition-colors">
          {/* Header Row (HIDDEN ON MOBILE) */}
          <div className="hidden lg:grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            {weekDays.map((day, i) => (
              <div key={i} className="p-4 text-center border-l border-zinc-200 dark:border-zinc-800 last:border-0">
                <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{format(day, 'EEEE', { locale: he })}</div>
                <div className="text-xl font-black text-zinc-900 dark:text-white">{format(day, 'dd/MM')}</div>
              </div>
            ))}
          </div>

          {/* Grid Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 divide-x divide-x-reverse divide-zinc-100 dark:divide-zinc-800 h-full">
            {weekDays.map((day, dayIdx) => {
              // ON MOBILE: Only show the selected day
              const isVisibleOnMobile = dayIdx === mobileDayIndex;
              const dayKey = getSlotKey(day, 'day'), nightKey = getSlotKey(day, 'night');
              const sDP = draft[dayKey] || [], sNP = draft[nightKey] || [];
              const dP = isSlotPast(day, 'day'), nP = isSlotPast(day, 'night');

              return (
                <div key={dayIdx} className={clsx(
                  "flex-col min-h-[500px] bg-zinc-50/30 dark:bg-zinc-900/10",
                  isVisibleOnMobile ? "flex" : "hidden lg:flex"
                )}>
                  {/* Day Slot */}
                  <div className={clsx("p-3 flex-1 flex flex-col transition-all", dP && "opacity-40 grayscale bg-zinc-200/50 dark:bg-zinc-800/50")}>
                    <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500 font-bold text-[9px] bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30 uppercase"><Sun size={10} /> יום</div>
                    <div className="flex-1 space-y-1">{renderSlotPersonnel(sDP, 'day', day, dayKey)}</div>
                  </div>
                  {/* Night Slot */}
                  <div className={clsx("p-3 flex-1 flex flex-col border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 transition-all", nP && "opacity-40 grayscale bg-zinc-300/50 dark:bg-zinc-800/50")}>
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] bg-indigo-50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/30 uppercase"><Moon size={10} /> לילה</div>
                    <div className="flex-1 space-y-1">{renderSlotPersonnel(sNP, 'night', day, dayKey)}</div>
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
