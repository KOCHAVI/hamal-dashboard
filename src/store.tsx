import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Campaign, Team, Personnel, PresenceStatus, Shift } from './types';
import Pusher from 'pusher-js';

interface AppState {
  campaigns: Campaign[];
  teams: Team[];
  personnel: Personnel[];
  shifts: Shift[];
  sirenMode: boolean;
  activeUser: Personnel | null;
  setActiveUser: (user: Personnel | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  addCampaign: (name: string, startDate: string) => Promise<void>;
  updateCampaign: (id: string, name: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  addHoT: (fullName: string, phoneNumber: string) => Promise<void>;
  addTeamWithHoT: (teamName: string, hotFullName: string, hotPhoneNumber: string, campaignId: string) => Promise<void>;
  updateTeam: (id: string, name: string, campaignId: string) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addPersonnel: (data: any) => Promise<void>;
  updatePersonnel: (id: string, data: any) => Promise<void>;
  deletePersonnel: (id: string) => Promise<void>;
  updatePersonnelStatus: (id: string, status: PresenceStatus, note?: string) => Promise<void>;
  addShift: (personnelIds: string[], startTime: string, endTime: string) => Promise<void>;
  addShiftsBulk: (shifts: { personnelIds: string[], startTime: string, endTime: string }[]) => Promise<void>;
  syncShifts: (additions: any[], removals: any[]) => Promise<void>;
  updateShift: (id: string, startTime: string, endTime: string, personnelIds?: string[]) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  toggleSirenMode: () => void;
  refreshData: (force?: boolean) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'board');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (activeUser) localStorage.setItem('activeUser', JSON.stringify(activeUser));
    else localStorage.removeItem('activeUser');
  }, [activeUser]);

  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const refreshData = async (force = false) => {
    const now = Date.now();
    if (!force && (isFetching.current || now - lastFetchTime.current < 500)) return;
    isFetching.current = true;
    lastFetchTime.current = now;
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      setCampaigns(data.campaigns);
      setTeams(data.teams);
      setPersonnel(data.personnel);
      setShifts(data.shifts);
    } catch (err) { console.error('Fetch error:', err); }
    finally { isFetching.current = false; setIsLoading(false); }
  };

  useEffect(() => {
    refreshData(true);

    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;

    if (pusherKey && pusherCluster) {
      const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      const channel = pusher.subscribe('hamal-channel');
      
      // 1. Status Update
      channel.bind('personnel-status-updated', (data: any) => {
        setPersonnel(prev => prev.map(p => p.id === data.id ? { ...p, currentStatus: data.currentStatus, statusNote: data.statusNote, statusUpdatedAt: data.statusUpdatedAt } : p));
      });

      // 2. Personnel Upsert
      channel.bind('personnel-upserted', (data: any) => {
        setPersonnel(prev => {
          const exists = prev.some(p => p.id === data.id);
          if (exists) return prev.map(p => p.id === data.id ? { ...p, ...data } : p);
          return [...prev, data];
        });
      });

      // 3. Personnel Deleted
      channel.bind('personnel-deleted', (data: any) => {
        setPersonnel(prev => prev.filter(p => p.id !== data.id));
      });

      // 4. Team Upsert
      channel.bind('team-upserted', (data: any) => {
        setTeams(prev => {
          const exists = prev.some(t => t.id === data.id);
          if (exists) return prev.map(t => t.id === data.id ? { ...t, ...data } : t);
          return [...prev, data];
        });
      });

      // 5. Campaign Upsert/Delete
      channel.bind('campaign-upserted', (data: any) => {
        setCampaigns(prev => {
          const exists = prev.some(c => c.id === data.id);
          if (exists) return prev.map(c => c.id === data.id ? { ...c, ...data } : c);
          return [...prev, data];
        });
      });
      channel.bind('campaign-deleted', (data: any) => {
        setCampaigns(prev => prev.filter(c => c.id !== data.id));
      });

      // 6. Generic Data Update (Full refresh fallback)
      channel.bind('data-updated', () => refreshData());

      return () => { channel.unbind_all(); channel.unsubscribe(); pusher.disconnect(); };
    } else {
      const interval = setInterval(() => { if (!document.hidden) refreshData(); }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const addCampaign = async (name: string, startDate: string) => {
    await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, name, start_date: startDate }) });
  };

  const updateCampaign = async (id: string, name: string) => {
    await fetch(`/api/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, name }) });
  };

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/campaigns/${id}?actor_id=${activeUser?.id}`, { method: 'DELETE' });
  };

  const addTeamWithHoT = async (teamName: string, hotFullName: string, hotPhoneNumber: string, campaignId: string) => {
    await fetch('/api/teams/with-hot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, teamName, hotFullName, hotPhoneNumber, campaignId }) });
  };

  const addPersonnel = async (data: any) => {
    await fetch('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, actor_id: activeUser?.id }) });
  };

  const updatePersonnel = async (id: string, data: any) => {
    await fetch(`/api/personnel/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, actor_id: activeUser?.id }) });
  };

  const deletePersonnel = async (id: string) => {
    await fetch(`/api/personnel/${id}?actor_id=${activeUser?.id}`, { method: 'DELETE' });
  };

  const updatePersonnelStatus = async (id: string, status: PresenceStatus, note?: string) => {
    const prev = [...personnel];
    const now = new Date().toISOString();
    // Optimistic Update
    setPersonnel(p => p.map(x => x.id === id ? { ...x, currentStatus: status, statusNote: note, statusUpdatedAt: now } : x));
    try {
      const res = await fetch(`/api/personnel/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note }) });
      if (!res.ok) throw new Error();
    } catch (err) {
      setPersonnel(prev);
      showNotification('שגיאה בעדכון הסטטוס', 'error');
    }
  };

  const syncShifts = async (additions: any[], removals: any[]) => {
    await fetch('/api/shifts/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, additions, removals }) });
  };

  const addShift = async (pids: string[], start: string, end: string) => { 
    await fetch('/api/shifts/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, shifts: [{ personnelIds: pids, startTime: start, endTime: end }] }) });
  };

  const toggleSirenMode = () => setSirenMode(prev => !prev);
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <AppContext.Provider value={{
      campaigns, teams, personnel, shifts, sirenMode, activeUser, setActiveUser, activeTab, setActiveTab, isLoading, darkMode, toggleDarkMode, notification, showNotification,
      addCampaign, updateCampaign, deleteCampaign, addHoT: async () => {}, addTeamWithHoT, updateTeam: async () => {}, deleteTeam: async () => {}, addPersonnel, updatePersonnel, deletePersonnel, updatePersonnelStatus, addShift, addShiftsBulk: async () => {}, syncShifts, updateShift: async () => {}, deleteShift: async () => {}, toggleSirenMode, refreshData,
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
