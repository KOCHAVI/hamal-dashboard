import React, { useState } from 'react';
import { useAppContext } from '../store';
import { PresenceStatus } from '../types';
import { Plane, Clock, UserCheck, RefreshCw, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import clsx from 'clsx';

export const AbroadBoard = () => {
  const { personnel, updatePersonnelStatus, teams } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const abroadPersonnel = personnel.filter(p => p.currentStatus === PresenceStatus.ABROAD);
  
  const filteredPersonnel = abroadPersonnel.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateNote = async (id: string) => {
    if (!newNote.trim()) return;
    await updatePersonnelStatus(id, PresenceStatus.ABROAD, newNote);
    setUpdatingId(null);
    setNewNote('');
  };

  const handleReturn = async (id: string) => {
    if (window.confirm('האם לאשר את חזרת החייל לארץ? (סטטוס ישתנה ל"בית")')) {
      await updatePersonnelStatus(id, PresenceStatus.HOME, '');
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-right transition-colors duration-200" dir="rtl">
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
              <Plane className="text-purple-600 dark:text-purple-400" size={32} />
              ניהול צוות בחו"ל
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm max-w-xl leading-relaxed">
              מעקב אחר אנשי צוות השוהים בחו"ל, עדכון סטטוסים וזמני חזרה משוערים.
            </p>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="חיפוש חייל..."
              className="w-72 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none p-3 pr-10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Plane className="absolute right-3 top-3 text-zinc-400 dark:text-zinc-500 rotate-90" size={18} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonnel.map((person) => {
            const teamName = teams.find(t => t.id === person.teamId)?.name || 'ללא צוות';
            const lastUpdated = new Date(person.statusUpdatedAt);

            return (
              <div key={person.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md dark:hover:border-zinc-700 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col text-right">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{person.fullName}</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">{teamName}</p>
                  </div>
                  <button 
                    onClick={() => handleReturn(person.id)}
                    className="p-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-zinc-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border border-zinc-100 dark:border-zinc-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
                    title="סמן כחזר לארץ"
                  >
                    <UserCheck size={20} />
                  </button>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-100 dark:border-zinc-800 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    <MessageSquare size={12} /> סטטוס אחרון
                  </div>
                  {updatingId === person.id ? (
                    <div className="space-y-2">
                      <input 
                        className="w-full p-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20"
                        autoFocus
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateNote(person.id)}
                        placeholder="למשל: בדרך לשדה התעופה..."
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateNote(person.id)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 rounded-md transition-colors"
                        >עדכן</button>
                        <button 
                          onClick={() => setUpdatingId(null)}
                          className="flex-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold py-1.5 rounded-md transition-colors"
                        >ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center group/note">
                      <p className="text-zinc-700 dark:text-zinc-300 font-bold italic">
                        {person.statusNote || 'אין עדכון סטטוס'}
                      </p>
                      <button 
                        onClick={() => {
                          setUpdatingId(person.id);
                          setNewNote(person.statusNote || '');
                        }}
                        className="text-purple-600 dark:text-purple-400 opacity-0 group-hover/note:opacity-100 p-1 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-all"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  <Clock size={12} />
                  <span>עודכן לאחרונה: </span>
                  <span className="font-bold text-zinc-600 dark:text-zinc-300">
                    {formatDistanceToNow(lastUpdated, { locale: he, addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
          
          {filteredPersonnel.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors">
              <Plane size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">אין אנשי צוות בחו"ל</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">כאשר חייל יועבר לסטטוס "חו"ל", הוא יופיע כאן לניהול מפורט.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
