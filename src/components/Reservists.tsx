import React, { useState } from 'react';
import { useAppContext } from '../store';
import { PresenceStatus } from '../types';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { he } from 'date-fns/locale';
import { UserPlus, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export const Reservists = () => {
  const { personnel, callUps, updatePersonnelStatus } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today'>('all');

  const reservists = personnel.filter(p => p.isReservist);

  const enrichedCallUps = callUps.map(callUp => {
    const person = reservists.find(r => r.id === callUp.personnelId);
    return {
      ...callUp,
      person,
      dateObj: new Date(callUp.date),
    };
  }).filter(c => c.person).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const filteredCallUps = enrichedCallUps.filter(c => {
    if (filter === 'today') return isToday(c.dateObj);
    if (filter === 'upcoming') return isFuture(c.dateObj) && !isToday(c.dateObj);
    return true;
  });

  const handleArrive = (personnelId: string) => {
    updatePersonnelStatus(personnelId, PresenceStatus.BASE_RESTING, 'הגיע ממילואים');
  };

  const filterLabels = {
    all: 'הכל',
    today: 'היום',
    upcoming: 'קרובים',
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50">
      <div className="p-8 border-b border-zinc-200 bg-white">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">סגל מילואים</h2>
            <p className="text-zinc-500 mt-2 text-sm max-w-xl leading-relaxed">
              נהל זימונים עתידיים והעבר אנשי מילואים המגיעים ישירות לשירות פעיל.
            </p>
          </div>
          
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            {(['all', 'today', 'upcoming'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all',
                  filter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                )}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="p-4 pr-6">איש צוות</th>
                <th className="p-4">תפקיד</th>
                <th className="p-4">תאריך זימון</th>
                <th className="p-4">סטטוס נוכחי</th>
                <th className="p-4 pl-6 text-left">פעולה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCallUps.map((callUp) => {
                const isTodayCallUp = isToday(callUp.dateObj);
                const isPastCallUp = isPast(callUp.dateObj) && !isTodayCallUp;
                const inBase = callUp.person!.currentStatus === PresenceStatus.BASE_RESTING || callUp.person!.currentStatus === PresenceStatus.BASE_SHIFT;

                return (
                  <tr key={callUp.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="p-4 pr-6">
                      <div className="font-semibold text-zinc-900">{callUp.person!.fullName}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{callUp.person!.phoneNumber}</div>
                    </td>
                    <td className="p-4 text-sm text-zinc-600">{callUp.person!.role}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className={clsx(
                          isTodayCallUp ? 'text-indigo-500' : isPastCallUp ? 'text-zinc-400' : 'text-emerald-500'
                        )} />
                        <span className={clsx(
                          'text-sm font-medium',
                          isTodayCallUp ? 'text-indigo-600' : isPastCallUp ? 'text-zinc-500' : 'text-emerald-600'
                        )}>
                          {format(callUp.dateObj, 'd MMM yyyy', { locale: he })}
                          {isTodayCallUp && ' (היום)'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {callUp.person!.currentStatus}
                      </span>
                    </td>
                    <td className="p-4 pl-6 text-left">
                      {inBase ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <CheckCircle size={16} />
                          בבסיס
                        </span>
                      ) : (
                        <button
                          onClick={() => handleArrive(callUp.person!.id)}
                          disabled={!isTodayCallUp && !isPastCallUp}
                          className={clsx(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            isTodayCallUp || isPastCallUp
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          )}
                        >
                          סמן הגעה
                          <ArrowLeft size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCallUps.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500">
                    <UserPlus size={48} className="mx-auto text-zinc-300 mb-4" />
                    <p className="text-lg font-medium text-zinc-900">לא נמצאו אנשי מילואים</p>
                    <p className="text-sm mt-1">נסה לשנות את הסינון או להוסיף זימונים חדשים.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
