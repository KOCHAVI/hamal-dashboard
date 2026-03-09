import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'board');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
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
    } catch (err) { console.error('Failed to fetch data:', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    refreshData();

    // PUSHER REAL-TIME SUBSCRIPTION
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;

    if (pusherKey && pusherCluster) {
      const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      const channel = pusher.subscribe('hamal-channel');
      
      channel.bind('data-updated', () => {
        // Only refresh if the window is visible to save resources
        if (!document.hidden) {
          refreshData();
        }
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
      };
    } else {
      // Fallback to polling if Pusher is not configured
      const interval = setInterval(() => { if (!document.hidden) refreshData(); }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const addCampaign = async (name: string, startDate: string) => {
    const res = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, name, start_date: startDate }) });
    if (res.ok) showNotification('המבצע נוסף', 'success');
  };

  const updateCampaign = async (id: string, name: string) => {
    const res = await fetch(`/api/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, name }) });
    if (res.ok) showNotification('המבצע עודכן', 'success');
  };

  const deleteCampaign = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}?actor_id=${activeUser?.id}`, { method: 'DELETE' });
    if (res.ok) showNotification('המבצע נמחק', 'success');
  };

  const addHoT = async (fullName: string, phoneNumber: string) => {
    const res = await fetch('/api/hots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, full_name: fullName, phoneNumber }) });
    if (res.ok) showNotification(`ראש צוות ${fullName} נוצר`, 'success');
  };

  const addTeamWithHoT = async (teamName: string, hotFullName: string, hotPhoneNumber: string, campaignId: string) => {
    const res = await fetch('/api/teams/with-hot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, teamName, hotFullName, hotPhoneNumber, campaignId }) });
    if (res.ok) showNotification('הצוות הוקם', 'success');
  };

  const updateTeam = async (id: string, name: string, campaignId: string) => {
    const res = await fetch(`/api/teams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, name, campaignId }) });
    if (res.ok) showNotification('הצוות עודכן', 'success');
  };

  const deleteTeam = async (id: string) => {
    const res = await fetch(`/api/teams/${id}?actor_id=${activeUser?.id}`, { method: 'DELETE' });
    if (res.ok) showNotification('הצוות נמחק', 'success');
  };

  const addPersonnel = async (data: any) => {
    const res = await fetch('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, actor_id: activeUser?.id }) });
    if (res.ok) showNotification('החייל נוסף', 'success');
  };

  const updatePersonnel = async (id: string, data: any) => {
    const res = await fetch(`/api/personnel/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, actor_id: activeUser?.id }) });
    if (res.ok) showNotification('פרטי החייל עודכנו', 'success');
  };

  const deletePersonnel = async (id: string) => {
    const res = await fetch(`/api/personnel/${id}?actor_id=${activeUser?.id}`, { method: 'DELETE' });
    if (res.ok) showNotification('החייל נמחק', 'success');
  };

  const updatePersonnelStatus = async (id: string, status: PresenceStatus, note?: string) => {
    const prev = [...personnel];
    const now = new Date().toISOString();
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
    const res = await fetch('/api/shifts/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, additions, removals }) });
    if (res.ok) showNotification('הסידור סונכרן', 'success');
  };

  const addShiftsBulk = async (shiftsData: any[]) => {
    await fetch('/api/shifts/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, shifts: shiftsData }) });
  };

  const addShift = async (pids: string[], start: string, end: string) => { await addShiftsBulk([{ personnelIds: pids, startTime: start, endTime: end }]); };
  const updateShift = async (id: string, start: string, end: string, pids?: string[]) => { await fetch(`/api/shifts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor_id: activeUser?.id, start_time: start, end_time: end, personnel_ids: pids }) }); };
  const deleteShift = async (id: string) => { await fetch(`/api/shifts/${id}?actor_id=${activeUser?.id}`, { method: 'DELETE' }); };
  const toggleSirenMode = () => setSirenMode(p => !prev);
  const toggleDarkMode = () => setDarkMode(p => !p);

  return (
    <AppContext.Provider value={{
      campaigns, teams, personnel, shifts, sirenMode, activeUser, setActiveUser, activeTab, setActiveTab, isLoading, darkMode, toggleDarkMode, notification, showNotification,
      addCampaign, updateCampaign, deleteCampaign, addHoT, addTeamWithHoT, updateTeam, deleteTeam, addPersonnel, updatePersonnel, deletePersonnel, updatePersonnelStatus, addShift, addShiftsBulk, syncShifts, updateShift, deleteShift, toggleSirenMode, refreshData,
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
