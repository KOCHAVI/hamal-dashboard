import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Campaign, Team, Personnel, PresenceStatus, Shift, ReservistCallUp } from './types';
import { subHours, subDays, addDays, addHours } from 'date-fns';

const MOCK_CAMPAIGN: Campaign = {
  id: 'c1',
  name: 'חרבות ברזל',
  startDate: subDays(new Date(), 30).toISOString(),
  endDate: null,
};

const MOCK_TEAMS: Team[] = [
  { id: 't1', name: 'צוות אלפא', leaderId: 'p1' },
  { id: 't2', name: 'צוות בראבו', leaderId: 'p6' },
];

const MOCK_PERSONNEL: Personnel[] = [
  {
    id: 'p1', fullName: 'דוד כהן', teamId: 't1', role: 'ראש צוות', isReservist: false,
    phoneNumber: '050-1234567', emergencyPhoneNumber: '050-7654321', city: 'תל אביב', homeAddress: 'דיזנגוף 123',
    currentStatus: PresenceStatus.BASE_SHIFT, statusUpdatedAt: subHours(new Date(), 4).toISOString(), totalBaseHours: 120,
  },
  {
    id: 'p2', fullName: 'שרה לוי', teamId: 't1', role: 'מפעילה', isReservist: true,
    phoneNumber: '052-1234567', emergencyPhoneNumber: '052-7654321', city: 'חיפה', homeAddress: 'הכרמל 45',
    currentStatus: PresenceStatus.BASE_RESTING, statusUpdatedAt: subHours(new Date(), 2).toISOString(), totalBaseHours: 85,
  },
  {
    id: 'p3', fullName: 'יוסי מזרחי', teamId: 't1', role: 'אנליסט', isReservist: false,
    phoneNumber: '054-1234567', emergencyPhoneNumber: '054-7654321', city: 'ירושלים', homeAddress: 'יפו 12',
    currentStatus: PresenceStatus.HOME, statusUpdatedAt: subHours(new Date(), 12).toISOString(), totalBaseHours: 200, lastHomeArrivalAt: subHours(new Date(), 12).toISOString(),
  },
  {
    id: 'p4', fullName: 'רונית גולן', teamId: 't1', role: 'קשרית', isReservist: true,
    phoneNumber: '053-1234567', emergencyPhoneNumber: '053-7654321', city: 'ראשון לציון', homeAddress: 'הרצל 8',
    currentStatus: PresenceStatus.WAY_TO_BASE, statusUpdatedAt: subHours(new Date(), 1).toISOString(), totalBaseHours: 40,
  },
  {
    id: 'p5', fullName: 'אלי אוחנה', teamId: 't1', role: 'חובש', isReservist: false,
    phoneNumber: '058-1234567', emergencyPhoneNumber: '058-7654321', city: 'נתניה', homeAddress: 'השרון 5',
    currentStatus: PresenceStatus.ABROAD, statusUpdatedAt: subDays(new Date(), 2).toISOString(), statusNote: 'חופשה מאושרת לפני המלחמה', totalBaseHours: 0,
  },
  {
    id: 'p6', fullName: 'מיכל בן-דוד', teamId: 't2', role: 'ראש צוות', isReservist: false,
    phoneNumber: '050-9876543', emergencyPhoneNumber: '050-3456789', city: 'באר שבע', homeAddress: 'שדרות רגר 10',
    currentStatus: PresenceStatus.BASE_SHIFT, statusUpdatedAt: subHours(new Date(), 6).toISOString(), totalBaseHours: 150,
  },
  {
    id: 'p7', fullName: 'עומר פרץ', teamId: 't2', role: 'מפעיל', isReservist: true,
    phoneNumber: '052-9876543', emergencyPhoneNumber: '052-3456789', city: 'אשדוד', homeAddress: 'הבנים 22',
    currentStatus: PresenceStatus.HOME, statusUpdatedAt: subDays(new Date(), 1).toISOString(), totalBaseHours: 60, lastHomeArrivalAt: subDays(new Date(), 1).toISOString(),
  },
  {
    id: 'p8', fullName: 'תמר כץ', teamId: 't2', role: 'אנליסטית', isReservist: false,
    phoneNumber: '054-9876543', emergencyPhoneNumber: '054-3456789', city: 'פתח תקווה', homeAddress: 'שטמפפר 30',
    currentStatus: PresenceStatus.WAY_HOME, statusUpdatedAt: subHours(new Date(), 2).toISOString(), totalBaseHours: 110,
  },
];

const MOCK_SHIFTS: Shift[] = [
  { id: 's1', personnelId: 'p3', startTime: addHours(new Date(), 12).toISOString(), endTime: addHours(new Date(), 20).toISOString() },
  { id: 's2', personnelId: 'p7', startTime: addDays(new Date(), 1).toISOString(), endTime: addHours(addDays(new Date(), 1), 8).toISOString() },
];

const MOCK_CALLUPS: ReservistCallUp[] = [
  { id: 'c1', personnelId: 'p2', date: subDays(new Date(), 2).toISOString() },
  { id: 'c2', personnelId: 'p4', date: subDays(new Date(), 1).toISOString() },
  { id: 'c3', personnelId: 'p7', date: addDays(new Date(), 2).toISOString() },
];

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
  const [personnel, setPersonnel] = useState<Personnel[]>(MOCK_PERSONNEL);
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
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
      campaign: MOCK_CAMPAIGN,
      teams: MOCK_TEAMS,
      personnel,
      shifts,
      callUps: MOCK_CALLUPS,
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
