import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppContext } from '../store';
import { PresenceStatus, Personnel } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Clock, AlertCircle, Plane, Home, Briefcase, Car, Search, PhoneCall, Phone, LogOut } from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLUMNS = {
  [PresenceStatus.HOME]: { label: 'בית', icon: Home, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  [PresenceStatus.WAY_TO_BASE]: { label: 'בדרך לבסיס', icon: Car, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  [PresenceStatus.BASE_SHIFT]: { label: 'בבסיס - במשמרת', icon: Briefcase, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  [PresenceStatus.WAY_HOME]: { label: 'בדרך הביתה', icon: Car, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  [PresenceStatus.ABROAD]: { label: 'חו"ל', icon: Plane, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
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
      {(provided, snapshot) => {
        const usePortal = snapshot.isDragging;
        
        const cardContent = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            className={clsx(
              'p-2 px-3 rounded-xl border transition-all relative flex flex-col gap-1 min-h-[52px] justify-center',
              snapshot.isDragging 
                ? 'shadow-2xl ring-2 ring-indigo-500 scale-105 z-[9999] bg-white dark:bg-zinc-800 border-indigo-500 opacity-100 w-[320px]' 
                : 'hover:border-zinc-300 dark:hover:border-zinc-600',
              
              !snapshot.isDragging && !isDelayed && !isCriticalDelay && !isMissing && !shouldGoHome && 'bg-white/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm',
              
              isDelayed && !isCriticalDelay && 'border-amber-400 bg-amber-50/90 dark:bg-amber-950/60',
              isCriticalDelay && 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-50/90 dark:bg-orange-950/60 animate-pulse',
              isMissing && 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/60 dark:bg-rose-950/60',
              shouldGoHome && 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/60',
              
              isDragDisabled && !snapshot.isDragging ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
            )}
          >
            <div className="absolute top-0 left-0 flex flex-col overflow-hidden rounded-tl-xl">
              {isMissing && <div className="bg-rose-500 text-white p-1 rounded-br-lg animate-pulse"><PhoneCall size={8} /></div>}
              {shouldGoHome && <div className="bg-indigo-500 text-white p-1 rounded-br-lg"><LogOut size={8} /></div>}
              {isCriticalDelay && !isMissing && <div className="bg-orange-500 text-white p-1 rounded-br-lg"><AlertCircle size={8} /></div>}
            </div>

            {/* ROW 1: FULL NAME & RESERVIST BADGE */}
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-[12px] truncate leading-none text-zinc-900 dark:text-white">{person.fullName}</h4>
              {person.isReservist && <span className="px-1 py-0.5 rounded text-[6px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase shrink-0">מילואים</span>}
            </div>

            {/* ROW 2: INFO, ALERTS, TIMER */}
            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/50 pt-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[9px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                  <Phone size={9} />
                  <span dir="ltr" className="tabular-nums">{person.phoneNumber}</span>
                </div>
                
                {alertLabel && (
                  <span className={clsx(
                    "text-[7px] font-black uppercase tracking-tighter px-1 rounded-md whitespace-nowrap",
                    isMissing ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  )}>
                    {alertLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[8px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tighter whitespace-nowrap border-r border-zinc-100 dark:border-zinc-800 pr-2">
                {(isDelayed || isCriticalDelay || isMissing) && <Clock size={8} className={clsx(isCriticalDelay || isMissing ? "text-rose-500" : "text-amber-500")} />}
                <span>{formatDistanceToNow(new Date(person.statusUpdatedAt), { locale: he, addSuffix: false })}</span>
              </div>
            </div>

            {person.statusNote && <div className="text-[8px] text-zinc-400 dark:text-zinc-500 italic truncate pt-0.5">• {person.statusNote}</div>}
          </div>
        );

        if (usePortal) {
          return createPortal(cardContent, document.body);
        }
        return cardContent;
      }}
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
    const isLongList = columnPersonnel.length > 8;

    return (
      <div key={statusId} className={clsx(
        "flex flex-col bg-zinc-100/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-zinc-200/60 dark:border-zinc-800/60 h-full shadow-sm",
        "flex-1 min-w-[350px] lg:min-w-0",
        isHalfHeight ? "max-h-[50%]" : "h-full"
      )}>
        <div className={clsx('p-4 border-b flex items-center justify-between bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md dark:border-zinc-800 shrink-0 rounded-t-[2.5rem]')}>
          <div className="flex items-center gap-3">
            <div className={clsx('p-2 rounded-xl', column.color.split(' ')[0])}><Icon size={18} className={column.color.split(' ')[1]} /></div>
            <h3 className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-tight">{column.label}</h3>
          </div>
          <span className="bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-black text-zinc-600 dark:text-zinc-400 tabular-nums">{columnPersonnel.length}</span>
        </div>
        
        <Droppable droppableId={statusId}>
          {(provided, snapshot) => (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps} 
              className={clsx(
                'flex-1 p-4 overflow-y-auto transition-colors custom-scrollbar', 
                snapshot.isDraggingOver ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : '',
                isLongList ? 'grid grid-cols-2 gap-2 content-start' : 'flex flex-col gap-2'
              )}
            >
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
    <div className="h-full flex flex-col bg-transparent relative transition-colors duration-200 overflow-hidden">
      <div className="p-6 lg:p-8 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 text-right transition-colors shrink-0" dir="rtl">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">לוח נוכחות חמ"ל</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">ניהול סטטוס כוח אדם בזמן אמת</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="relative">
            <input type="text" placeholder="חיפוש חייל..." className="w-full lg:w-72 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none p-3 pr-10 text-right transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute right-3.5 top-3.5 text-zinc-400 dark:text-zinc-500" size={18} />
          </div>
          <div className="flex items-center gap-3 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <select className="bg-transparent text-zinc-900 dark:text-white text-sm font-bold outline-none p-2 min-w-[160px] text-right" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
              <option value="all">כל היחידה</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8 overflow-hidden" dir="rtl">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full w-full overflow-x-auto overflow-y-hidden pb-4">
            {COLUMN_LAYOUT.map((item, idx) => {
              if (item.type === 'single') return renderColumn(item.id);
              return <div key={`group-${idx}`} className="flex flex-col gap-6 h-full flex-1 min-w-[350px]">{item.ids.map(id => renderColumn(id, true))}</div>;
            })}
          </div>
        </DragDropContext>
        {!isAdmin && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 dark:bg-zinc-100/10 backdrop-blur-xl text-white px-8 py-4 rounded-3xl text-sm font-black shadow-2xl border border-white/10 z-[100] animate-in fade-in slide-in-from-bottom-10">מצב צפייה בלבד</div>}
      </div>
    </div>
  );
};
