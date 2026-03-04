import React, { useState } from 'react';
import { useAppContext } from '../store';
import { format, addDays, startOfWeek, addHours, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Plus } from 'lucide-react';
import clsx from 'clsx';

export const Scheduler = () => {
  const { personnel, shifts, addShift } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [newShift, setNewShift] = useState({ personnelId: '', startTime: '', endTime: '' });
  const [warning, setWarning] = useState<string | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.personnelId || !newShift.startTime || !newShift.endTime) return;

    const person = personnel.find(p => p.id === newShift.personnelId);
    if (person && person.lastHomeArrivalAt) {
      const restHours = differenceInHours(new Date(newShift.startTime), new Date(person.lastHomeArrivalAt));
      if (restHours < 12) {
        setWarning(`אזהרה: ${person.fullName} נח/ה רק ${restHours} שעות (מומלץ מינימום 12 שעות).`);
        return;
      }
    }

    addShift({
      personnelId: newShift.personnelId,
      startTime: new Date(newShift.startTime).toISOString(),
      endTime: new Date(newShift.endTime).toISOString(),
    });
    setShowForm(false);
    setNewShift({ personnelId: '', startTime: '', endTime: '' });
    setWarning(null);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50">
      <div className="p-8 border-b border-zinc-200 bg-white flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">סידור משמרות</h2>
          <p className="text-sm text-zinc-500 mt-1">תכנן משמרות עתידיות ועקוב אחר זמני מנוחה.</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          קבע משמרת
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {showForm && (
          <div className="mb-8 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">משמרת חדשה</h3>
            <form onSubmit={handleAddShift} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">איש צוות</label>
                <select
                  required
                  value={newShift.personnelId}
                  onChange={e => {
                    setNewShift({ ...newShift, personnelId: e.target.value });
                    setWarning(null);
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">בחר...</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">שעת התחלה</label>
                <input
                  type="datetime-local"
                  required
                  value={newShift.startTime}
                  onChange={e => {
                    setNewShift({ ...newShift, startTime: e.target.value });
                    setWarning(null);
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">שעת סיום</label>
                <input
                  type="datetime-local"
                  required
                  value={newShift.endTime}
                  onChange={e => {
                    setNewShift({ ...newShift, endTime: e.target.value });
                    setWarning(null);
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg font-medium transition-colors">
                  שמור
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 p-2.5 rounded-lg font-medium transition-colors">
                  ביטול
                </button>
              </div>
            </form>
            {warning && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{warning}</p>
                  <button 
                    onClick={() => {
                      addShift({
                        personnelId: newShift.personnelId,
                        startTime: new Date(newShift.startTime).toISOString(),
                        endTime: new Date(newShift.endTime).toISOString(),
                      });
                      setShowForm(false);
                      setNewShift({ personnelId: '', startTime: '', endTime: '' });
                      setWarning(null);
                    }}
                    className="mt-2 text-amber-700 underline hover:text-amber-900 font-medium"
                  >
                    התעלם וקבע בכל זאת
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {days.map((day, i) => (
              <div key={i} className="p-4 text-center border-l border-zinc-200 last:border-0">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{format(day, 'EEEE', { locale: he })}</div>
                <div className={clsx(
                  'text-lg font-semibold mt-1',
                  format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-indigo-600' : 'text-zinc-900'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {days.map((day, i) => {
              const dayShifts = shifts.filter(s => format(new Date(s.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
              return (
                <div key={i} className="p-2 border-l border-zinc-200 last:border-0 bg-white">
                  {dayShifts.map(shift => {
                    const person = personnel.find(p => p.id === shift.personnelId);
                    return (
                      <div key={shift.id} className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <div className="text-xs font-bold text-indigo-900 truncate">{person?.fullName}</div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-600 font-medium">
                          <Clock size={10} />
                          {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
