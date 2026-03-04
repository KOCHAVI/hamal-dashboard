import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppContext } from '../store';
import { PresenceStatus, Personnel } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Clock, AlertCircle, Plane, Home, Building2, Briefcase, Car } from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLUMNS = [
  { id: PresenceStatus.HOME, label: 'בית', icon: Home, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: PresenceStatus.WAY_TO_BASE, label: 'בדרך לבסיס', icon: Car, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: PresenceStatus.BASE_RESTING, label: 'בסיס - מנוחה', icon: Building2, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: PresenceStatus.BASE_SHIFT, label: 'בסיס - משמרת', icon: Briefcase, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { id: PresenceStatus.WAY_HOME, label: 'בדרך הביתה', icon: Car, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: PresenceStatus.ABROAD, label: 'חו"ל', icon: Plane, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: PresenceStatus.EXCEPTION, label: 'חריג', icon: AlertCircle, color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
];

const PersonnelCard: React.FC<{ person: Personnel; index: number }> = ({ person, index }) => {
  const isTransit = person.currentStatus === PresenceStatus.WAY_TO_BASE || person.currentStatus === PresenceStatus.WAY_HOME;
  const transitTime = new Date().getTime() - new Date(person.statusUpdatedAt).getTime();
  const isDelayed = isTransit && transitTime > 2 * 60 * 60 * 1000; // 2 hours

  return (
    <Draggable draggableId={person.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'p-3 mb-3 rounded-xl border bg-white shadow-sm transition-all',
            snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500/50 scale-105' : 'hover:border-zinc-300',
            isDelayed ? 'border-red-400 bg-red-50/50' : 'border-zinc-200'
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-zinc-900 text-sm">{person.fullName}</h4>
              <p className="text-xs text-zinc-500">{person.role}</p>
            </div>
            {person.isReservist && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                מילואים
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
            <Clock size={12} className={isDelayed ? 'text-red-500' : ''} />
            <span className={isDelayed ? 'text-red-600 font-medium' : ''}>
              {formatDistanceToNow(new Date(person.statusUpdatedAt), { locale: he, addSuffix: true })}
            </span>
            {isDelayed && <AlertCircle size={12} className="text-red-500 mr-auto" />}
          </div>

          {person.statusNote && (
            <div className="mt-2 text-[10px] text-zinc-500 bg-zinc-50 p-1.5 rounded border border-zinc-100 italic">
              {person.statusNote}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export const LiveBoard = () => {
  const { personnel, updatePersonnelStatus, teams } = useAppContext();
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const filteredPersonnel = selectedTeam === 'all' 
    ? personnel 
    : personnel.filter(p => p.teamId === selectedTeam);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as PresenceStatus;
    
    // If moving to abroad or exception, we might want to prompt for a note.
    // For simplicity in this demo, we'll just update the status.
    let note = undefined;
    if (newStatus === PresenceStatus.ABROAD) {
      note = window.prompt('נא לספק סיבה לשהייה בחו"ל:');
      if (!note) return; // Cancel drag if no note provided
    }

    updatePersonnelStatus(draggableId, newStatus, note);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50">
      <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">לוח נוכחות בזמן אמת</h2>
          <p className="text-sm text-zinc-500 mt-1">גרור ושחרר אנשי צוות כדי לעדכן סטטוס בזמן אמת.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-700">סינון לפי צוות:</label>
          <select 
            className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
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

      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {STATUS_COLUMNS.map(column => {
              const columnPersonnel = filteredPersonnel.filter(p => p.currentStatus === column.id);
              const Icon = column.icon;

              return (
                <div key={column.id} className="w-72 flex flex-col bg-zinc-100/50 rounded-2xl border border-zinc-200/60 overflow-hidden">
                  <div className={clsx('p-3 border-b flex items-center justify-between', column.color.split(' ')[0], column.color.split(' ')[2])}>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={column.color.split(' ')[1]} />
                      <h3 className={clsx('font-semibold text-sm', column.color.split(' ')[1])}>
                        {column.label}
                      </h3>
                    </div>
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold text-zinc-700">
                      {columnPersonnel.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={clsx(
                          'flex-1 p-3 overflow-y-auto transition-colors',
                          snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''
                        )}
                      >
                        {columnPersonnel.map((person, index) => (
                          <PersonnelCard key={person.id} person={person} index={index} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};
