import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Campaign, Team, Personnel, PresenceStatus, Shift, ReservistCallUp } from './types';

interface AppState {
  campaign: Campaign;
  teams: Team[];
  personnel: Personnel[];
  shifts: Shift[];
  callUps: ReservistCallUp[];
  sirenMode: boolean;
  updatePersonnelStatus: (id: string, status: PresenceStatus, note?: string) => void;
  toggleSirenMode: () => void;
  addShift: (shift: Omit<Shift, 'id'>) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sirenMode, setSirenMode] = useState(false);

  const updatePersonnelStatus = (id: string, status: PresenceStatus, note?: string) => {
    setPersonnel(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          currentStatus: status,
          statusUpdatedAt: new Date().toISOString(),
          statusNote: note || p.statusNote,
          lastHomeArrivalAt: status === PresenceStatus.HOME ? new Date().toISOString() : p.lastHomeArrivalAt,
        };
      }
      return p;
    }));
  };

  const toggleSirenMode = () => setSirenMode(prev => !prev);

  const addShift = (shift: Omit<Shift, 'id'>) => {
    setShifts(prev => [...prev, { ...shift, id: `s${Date.now()}` }]);
  };

  return (
    <AppContext.Provider value={{
      campaign: [],
      teams: [],
      personnel,
      shifts,
      callUps: [],
      sirenMode,
      updatePersonnelStatus,
      toggleSirenMode,
      addShift,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
