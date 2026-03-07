import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppContext } from '../store';
import { PresenceStatus, Personnel } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Clock, AlertCircle, Plane, Home, Briefcase, Car, Search, PhoneCall, Phone } from 'lucide-react';
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

const PersonnelCard: React.FC<{ person: Personnel; index: number; isMissing: boolean; isDragDisabled: boolean }> = ({ person, index, isMissing, isDragDisabled }) => {
  const isTransit = person.currentStatus === PresenceStatus.WAY_TO_BASE || person.currentStatus === PresenceStatus.WAY_HOME;
  const transitTime = new Date().getTime() - new Date(person.statusUpdatedAt).getTime();
  const isDelayed = isTransit && transitTime > 2 * 60 * 60 * 1000; // 2 hours

  return (
    <Draggable draggableId={person.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'p-2 rounded-lg border transition-all relative overflow-hidden',
            snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500/50 scale-105' : 'hover:border-zinc-300 dark:hover:border-zinc-600',
            // Light colors
            !snapshot.isDragging && !isDelayed && 'bg-white border-zinc-200 text-zinc-900',
            // Dark colors
            !snapshot.isDragging && !isDelayed && 'dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100',
            isDelayed ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50' : '',
            isMissing && 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20',
            isDragDisabled && !snapshot.isDragging ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          )}
        >
          {isMissing && (
            <div className="absolute top-0 left-0 bg-rose-500 text-white p-0.5 rounded-br-md animate-pulse z-10">
              <PhoneCall size={10} />
            </div>
          )}

          <div className="flex justify-between items-start text-right">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs truncate leading-tight">{person.fullName}</h4>
              <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                <Phone size={10} className="shrink-0" />
                <span dir="ltr" className="tabular-nums">{person.phoneNumber}</span>
              </div>
              {isMissing && <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 mt-0.5 animate-pulse uppercase">נפקד!</p>}
            </div>
            {person.isReservist && (
              <span className="px-1 py-0.5 rounded text-[8px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0 mr-1">
                מילואים
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 justify-end font-medium">
            {isDelayed && <AlertCircle size={10} className="text-red-500" />}
            <span className={clsx(isDelayed && 'text-red-600 dark:text-red-400 font-bold')}>
              {formatDistanceToNow(new Date(person.statusUpdatedAt), { locale: he, addSuffix: true })}
            </span>
            <Clock size={10} className="shrink-0" />
          </div>

          {person.statusNote && (
            <div className="mt-1 text-[9px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950/50 p-1 rounded italic text-right truncate">
              {person.statusNote}
            </div>
          )}
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

  const filteredPersonnel = (selectedTeam === 'all' 
    ? personnel 
    : personnel.filter(p => p.teamId === selectedTeam))
    .filter(p => !p.isAdmin)
    .filter(p => {
      if (isAdmin) return true;
      if (activeUser?.isHoT) return p.currentStatus !== PresenceStatus.ABROAD;
      return true;
    })
    .filter(p => p.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  const onDragEnd = (result: DropResult) => {
    if (!isAdmin) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as PresenceStatus;
    let note = undefined;
    if (newStatus === PresenceStatus.ABROAD) {
      note = window.prompt('נא לספק סיבה לשהייה בחו"ל:') || undefined;
      if (!note) return;
    }
    updatePersonnelStatus(draggableId, newStatus, note);
  };

  const renderColumn = (statusId: PresenceStatus, isHalfHeight: boolean = false) => {
    const column = STATUS_COLUMNS[statusId];
    const columnPersonnel = filteredPersonnel.filter(p => p.currentStatus === statusId);
    const Icon = column.icon;
    const now = new Date();
    const isLongList = columnPersonnel.length > 6;

    return (
      <div key={statusId} className={clsx(
        "flex-1 flex flex-col bg-zinc-100/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden min-w-[280px] lg:min-w-0",
        isHalfHeight ? "" : "h-full"
      )}>
        <div className={clsx('p-3 border-b flex items-center justify-between', column.color.split(' ')[0], column.color.split(' ')[2], 'dark:border-zinc-800')}>
          <div className="flex items-center gap-2">
            <Icon size={16} className={column.color.split(' ')[1]} />
            <h3 className={clsx('font-semibold text-sm', column.color.split(' ')[1])}>
              {column.label}
            </h3>
          </div>
          <span className="bg-white/50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full text-xs font-bold text-zinc-700 dark:text-zinc-300">
            {columnPersonnel.length}
          </span>
        </div>
        
        <Droppable droppableId={statusId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={clsx(
                'flex-1 p-3 overflow-y-auto transition-colors',
                snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : '',
                isLongList ? 'grid grid-cols-2 gap-2 content-start' : 'flex flex-col gap-2'
              )}
            >
              {columnPersonnel.map((person, index) => {
                const hasActiveShift = shifts.some(s => 
                  s.personnelIds?.includes(person.id) && 
                  new Date(s.startTime) <= now && 
                  new Date(s.endTime) >= now
                );
                const isMissing = hasActiveShift && person.currentStatus !== PresenceStatus.BASE_SHIFT;

                return <PersonnelCard key={person.id} person={person} index={index} isMissing={isMissing} isDragDisabled={!isAdmin} />;
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50 relative">
      <div className="p-4 lg:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-right transition-colors duration-200" dir="rtl">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">לוח נוכחות בזמן אמת</h2>
          <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">גרור ושחרר אנשי צוות כדי לעדכן סטטוס.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-6 w-full lg:w-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder="חיפוש לפי שם..."
              className="w-full lg:w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none p-2 pr-9 text-right transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 text-zinc-400 dark:text-zinc-500" size={16} />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">סינון:</label>
            <select 
              className="flex-1 lg:flex-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none p-2 min-w-[140px] transition-all"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="all">כל הצוותים</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto lg:overflow-hidden p-4 lg:p-6 relative" dir="rtl">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max lg:min-w-0 lg:w-full">
            {COLUMN_LAYOUT.map((item, idx) => {
              if (item.type === 'single') {
                return renderColumn(item.id);
              } else {
                return (
                  <div key={`group-${idx}`} className="flex-1 flex flex-col gap-4 h-full">
                    {item.ids.map(id => renderColumn(id, true))}
                  </div>
                );
              }
            })}
          </div>
        </DragDropContext>
        
        {!isAdmin && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 dark:bg-zinc-100/10 backdrop-blur-md text-white dark:text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border border-zinc-700 dark:border-zinc-600 z-50 animate-bounce pointer-events-none transition-all">
            מצב צפייה בלבד - רק מנהל רשאי לעדכן סטטוס בגרירה
          </div>
        )}
      </div>
    </div>
  );
};
