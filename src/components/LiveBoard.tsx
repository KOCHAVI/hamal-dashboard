import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppContext } from '../store';
import { PresenceStatus, Personnel } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Clock, AlertCircle, Plane, Home, Briefcase, Car, Search, PhoneCall, Phone, LogOut } from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLUMNS = {
  [PresenceStatus.HOME]: { label: 'בית', icon: Home, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5' },
  [PresenceStatus.WAY_TO_BASE]: { label: 'בדרך לבסיס', icon: Car, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/5' },
  [PresenceStatus.BASE_SHIFT]: { label: 'בבסיס - במשמרת', icon: Briefcase, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-500/5' },
  [PresenceStatus.WAY_HOME]: { label: 'בדרך הביתה', icon: Car, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-500/5' },
  [PresenceStatus.ABROAD]: { label: 'חו"ל', icon: Plane, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/5' },
};

const COLUMN_LAYOUT = [
  { type: 'single', id: PresenceStatus.HOME },
  { type: 'stacked', ids: [PresenceStatus.WAY_TO_BASE, PresenceStatus.WAY_HOME], label: 'בתנועה' },
  { type: 'single', id: PresenceStatus.BASE_SHIFT },
];

const PersonnelCard: React.FC<{ person: Personnel; index: number; hasActiveShift: boolean; isDragDisabled: boolean }> = ({ person, index, hasActiveShift, isDragDisabled }) => {
  const isWayToBase = person.currentStatus === PresenceStatus.WAY_TO_BASE;
  const isWayHome = person.currentStatus === PresenceStatus.WAY_HOME;
  const transitTime = new Date().getTime() - new Date(person.statusUpdatedAt).getTime();
  
  const isCriticalDelay = isWayToBase && transitTime > 4 * 60 * 60 * 1000;
  const isDelayed = (isWayToBase || isWayHome) && transitTime > 2 * 60 * 60 * 1000;

  const isMissing = hasActiveShift && person.currentStatus !== PresenceStatus.BASE_SHIFT;
  const shouldGoHome = !hasActiveShift && person.currentStatus === PresenceStatus.BASE_SHIFT;

  let alertLabel = null;
  if (hasActiveShift) {
    if (person.currentStatus === PresenceStatus.HOME) alertLabel = "צריך להגיע";
    else if (person.currentStatus === PresenceStatus.WAY_TO_BASE) alertLabel = "מאחר";
    else if (person.currentStatus !== PresenceStatus.BASE_SHIFT) alertLabel = "נפקד!";
  } else if (shouldGoHome) {
    alertLabel = "צריך ללכת הביתה";
  }

  return (
    <Draggable draggableId={person.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'p-3 rounded-xl border transition-all relative overflow-hidden min-h-[85px] flex flex-col justify-between',
            snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500 scale-105 z-[100] bg-white dark:bg-zinc-800' : 'hover:border-zinc-300 dark:hover:border-zinc-600',
            !snapshot.isDragging && !isDelayed && !isCriticalDelay && !isMissing && !shouldGoHome && 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm',
            isDelayed && !isCriticalDelay && 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50',
            isCriticalDelay && 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-50 dark:bg-orange-950/30 animate-pulse',
            isMissing && 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20',
            shouldGoHome && 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20',
            isDragDisabled && !snapshot.isDragging ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          )}
        >
          {isMissing && <div className="absolute top-0 left-0 bg-rose-500 text-white p-1 rounded-br-lg animate-pulse z-10"><PhoneCall size={12} /></div>}
          {shouldGoHome && <div className="absolute top-0 left-0 bg-indigo-500 text-white p-1 rounded-br-lg z-10"><LogOut size={12} /></div>}
          {isCriticalDelay && !isMissing && <div className="absolute top-0 left-0 bg-orange-500 text-white p-1 rounded-br-lg z-10"><AlertCircle size={12} /></div>}

          <div className="flex justify-between items-start text-right">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm truncate leading-tight mb-1">{person.fullName}</h4>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                <Phone size={12} className="shrink-0" />
                <span dir="ltr" className="tabular-nums tracking-wide">{person.phoneNumber}</span>
              </div>
              {alertLabel && <p className={clsx("text-[10px] font-black mt-1 uppercase tracking-tight", isMissing ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-indigo-600 dark:text-indigo-400")}>{alertLabel}</p>}
            </div>
            {person.isReservist && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0 mr-2">מילואים</span>}
          </div>
          
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 justify-end font-bold uppercase tracking-tighter">
            {(isDelayed || isCriticalDelay || isMissing) && <Clock size={12} className={clsx(isCriticalDelay || isMissing ? "text-rose-500" : "text-amber-500")} />}
            <span className={clsx((isCriticalDelay || isMissing) ? "text-rose-600 dark:text-rose-400" : isDelayed ? "text-amber-600 dark:text-amber-400" : "")}>{formatDistanceToNow(new Date(person.statusUpdatedAt), { locale: he, addSuffix: true })}</span>
            {!isDelayed && !isCriticalDelay && !isMissing && <Clock size={12} className="shrink-0 opacity-50" />}
          </div>
          {person.statusNote && <div className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50 italic text-right truncate">{person.statusNote}</div>}
        </div>
      )}
    </Draggable>
  );
};

export const LiveBoard = () => {
  const { personnel, updatePersonnelStatus, teams, shifts, activeUser } = useAppContext();
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = activeUser?.isAdmin;

  const filteredPersonnel = (selectedTeam === 'all' ? personnel : personnel.filter(p => p.teamId === selectedTeam))
    .filter(p => !p.isAdmin)
    .filter(p => isAdmin ? true : (activeUser?.isHoT ? p.currentStatus !== PresenceStatus.ABROAD : true))
    .filter(p => p.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  const onDragEnd = (result: DropResult) => {
    if (!isAdmin) return;
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    const newStatus = destination.droppableId as PresenceStatus;
    let note = newStatus === PresenceStatus.ABROAD ? (window.prompt('נא לספק סיבה לשהייה בחו"ל:') || undefined) : undefined;
    if (newStatus === PresenceStatus.ABROAD && !note) return;
    updatePersonnelStatus(draggableId, newStatus, note);
  };

  const renderColumn = (statusId: PresenceStatus, isHalfHeight: boolean = false) => {
    const column = STATUS_COLUMNS[statusId];
    const columnPersonnel = filteredPersonnel.filter(p => p.currentStatus === statusId);
    const Icon = column.icon;
    const now = new Date();

    return (
      <div key={statusId} className={clsx(
        "flex flex-col bg-zinc-100/50 dark:bg-zinc-900/30 rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden",
        "flex-1 min-w-[300px] lg:min-w-0", // FLEXIBLE WIDTH
        isHalfHeight ? "h-auto" : "h-full"
      )}>
        <div className={clsx('p-4 border-b flex items-center justify-between bg-white dark:bg-zinc-900/50 dark:border-zinc-800')}>
          <div className="flex items-center gap-3">
            <div className={clsx('p-2 rounded-xl', column.color.split(' ')[0])}><Icon size={18} className={column.color.split(' ')[1]} /></div>
            <h3 className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-tight">{column.label}</h3>
          </div>
          <span className="bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-black text-zinc-600 dark:text-zinc-400 tabular-nums">{columnPersonnel.length}</span>
        </div>
        <Droppable droppableId={statusId}>
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className={clsx('flex-1 p-4 overflow-y-auto transition-colors flex flex-col gap-3', snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : '')}>
              {columnPersonnel.slice().sort((a, b) => {
                if (statusId !== PresenceStatus.HOME) return 0;
                const aMissing = shifts.some(s => s.personnelIds?.includes(a.id) && new Date(s.startTime) <= now && new Date(s.endTime) >= now);
                const bMissing = shifts.some(s => s.personnelIds?.includes(b.id) && new Date(s.startTime) <= now && new Date(s.endTime) >= now);
                return (aMissing && !bMissing) ? -1 : (!aMissing && bMissing ? 1 : 0);
              }).map((person, index) => {
                const hasActiveShift = shifts.some(s => s.personnelIds?.includes(person.id) && new Date(s.startTime) <= now && new Date(s.endTime) >= now);
                return <PersonnelCard key={person.id} person={person} index={index} hasActiveShift={hasActiveShift} isDragDisabled={!isAdmin} />;
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 relative transition-colors duration-200">
      <div className="p-6 lg:p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 text-right transition-colors" dir="rtl">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">לוח נוכחות חמ"ל</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">ניהול סטטוס כוח אדם בזמן אמת</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="relative">
            <input type="text" placeholder="חיפוש חייל..." className="w-full lg:w-72 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none p-3 pr-10 text-right transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute right-3.5 top-3.5 text-zinc-400 dark:text-zinc-500" size={18} />
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <select className="bg-transparent text-zinc-900 dark:text-white text-sm font-bold outline-none p-2 min-w-[160px] text-right" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
              <option value="all">כל היחידה</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8" dir="rtl">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full w-full">
            {COLUMN_LAYOUT.map((item, idx) => {
              if (item.type === 'single') return renderColumn(item.id);
              return <div key={`group-${idx}`} className="flex-1 flex flex-col gap-6 h-full">{item.ids.map(id => renderColumn(id, true))}</div>;
            })}
          </div>
        </DragDropContext>
        {!isAdmin && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 dark:bg-zinc-100/10 backdrop-blur-xl text-white px-8 py-4 rounded-3xl text-sm font-black shadow-2xl border border-white/10 z-[100] animate-in fade-in slide-in-from-bottom-10">מצב צפייה בלבד</div>}
      </div>
    </div>
  );
};
