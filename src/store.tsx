import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Campaign, Team, Personnel, PresenceStatus, Shift, ReservistCallUp } from './types';

interface AppState {
  campaigns: Campaign[];
  teams: Team[];
  personnel: Personnel[];
  shifts: Shift[];
  sirenMode: boolean;
  activeUser: Personnel | null; // Simulated "logged in" user
  setActiveUser: (user: Personnel | null) => void;
  isLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  
  // Actions
  addCampaign: (name: string, startDate: string) => Promise<void>;
  addHoT: (fullName: string, phoneNumber: string) => Promise<void>;
  addTeamWithHoT: (teamName: string, hotFullName: string, hotPhoneNumber: string, campaignId: string) => Promise<void>;
  addPersonnel: (data: any) => Promise<void>;
  updatePersonnelStatus: (id: string, status: PresenceStatus, note?: string) => Promise<void>;
  addShift: (personnelIds: string[], startTime: string, endTime: string) => Promise<void>;
  addShiftsBulk: (shifts: { personnelIds: string[], startTime: string, endTime: string }[]) => Promise<void>;
  syncShifts: (additions: any[], removals: any[]) => Promise<void>;
  updateShift: (id: string, startTime: string, endTime: string, personnelIds?: string[]) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  toggleSirenMode: () => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sirenMode, setSirenMode] = useState(false);
  
  const [activeUser, setActiveUser] = useState<Personnel | null>(() => {
    const saved = localStorage.getItem('activeUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Auto-save user to storage
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('activeUser', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('activeUser');
    }
  }, [activeUser]);

  // Dark Mode side effect
  useEffect(() => {
    console.log('Dark mode changed:', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      setCampaigns(data.campaigns);
      setTeams(data.teams);
      setPersonnel(data.personnel);
      setShifts(data.shifts);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addCampaign = async (name: string, startDate: string) => {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, start_date: startDate }),
    });
    await refreshData();
  };

  const addHoT = async (fullName: string, phoneNumber: string) => {
    if (!activeUser) return;
    const res = await fetch('/api/hots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_id: activeUser.id, full_name: fullName, phoneNumber }),
    });
    if (res.ok) {
      alert(`ראש צוות ${fullName} נוצר בהצלחה!`);
      await refreshData();
    } else {
      const error = await res.json();
      alert(error.error || 'שגיאה ביצירת ראש צוות');
    }
  };

  const addTeamWithHoT = async (teamName: string, hotFullName: string, hotPhoneNumber: string, campaignId: string) => {
    const res = await fetch('/api/teams/with-hot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, hotFullName, hotPhoneNumber, campaignId }),
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to create team');
      return;
    }
    await refreshData();
  };

  const addPersonnel = async (data: any) => {
    if (!activeUser) return;
    const res = await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, actor_id: activeUser.id }),
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to add personnel');
      return;
    }
    await refreshData();
  };

  const updatePersonnelStatus = async (id: string, status: PresenceStatus, note?: string) => {
    await fetch(`/api/personnel/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    await refreshData();
  };

  const addShiftsBulk = async (shiftsData: { personnelIds: string[], startTime: string, endTime: string }[]) => {
    if (!activeUser) return;
    const res = await fetch('/api/shifts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        actor_id: activeUser.id, 
        shifts: shiftsData.map(s => ({
          personnel_ids: s.personnelIds,
          start_time: s.startTime,
          end_time: s.endTime
        }))
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to add shifts');
      return;
    }
    await refreshData();
  };

  const syncShifts = async (additions: any[], removals: any[]) => {
    if (!activeUser) return;
    const res = await fetch('/api/shifts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        actor_id: activeUser.id, 
        additions,
        removals
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to sync shifts');
      return;
    }
    await refreshData();
  };

  const addShift = async (personnelIds: string[], startTime: string, endTime: string) => {
    await addShiftsBulk([{ personnelIds, startTime, endTime }]);
  };

  const updateShift = async (id: string, startTime: string, endTime: string, personnelIds?: string[]) => {
    if (!activeUser) return;
    const res = await fetch(`/api/shifts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        actor_id: activeUser.id,
        start_time: startTime, 
        end_time: endTime,
        personnel_ids: personnelIds
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to update shift');
      return;
    }
    await refreshData();
  };

  const deleteShift = async (id: string) => {
    if (!activeUser) return;
    const res = await fetch(`/api/shifts/${id}?actor_id=${activeUser.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to delete shift');
      return;
    }
    await refreshData();
  };

  const toggleSirenMode = () => setSirenMode(prev => !prev);
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <AppContext.Provider value={{
      campaigns,
      teams,
      personnel,
      shifts,
      sirenMode,
      activeUser,
      setActiveUser,
      isLoading,
      darkMode,
      toggleDarkMode,
      addCampaign,
      addHoT,
      addTeamWithHoT,
      addPersonnel,
      updatePersonnelStatus,
      addShift,
      addShiftsBulk,
      syncShifts,
      updateShift,
      deleteShift,
      toggleSirenMode,
      refreshData,
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
