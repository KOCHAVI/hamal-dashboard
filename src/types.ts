export enum PresenceStatus {
  HOME = 'בית',
  WAY_TO_BASE = 'בדרך לבסיס',
  BASE_RESTING = 'בבסיס - מנוחה',
  BASE_SHIFT = 'בבסיס - במשמרת',
  WAY_HOME = 'בדרך הביתה',
  ABROAD = 'בחו"ל',
  EXCEPTION = 'חריג',
}

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
}

export interface Personnel {
  id: string;
  fullName: string;
  teamId: string;
  role: string;
  isReservist: boolean;
  phoneNumber: string;
  emergencyPhoneNumber: string;
  city: string;
  homeAddress: string;

  // Live Status
  currentStatus: PresenceStatus;
  statusUpdatedAt: string; // ISO string
  statusNote?: string;

  // Analytics (mocked for demo)
  totalBaseHours: number; // accumulated hours
  lastHomeArrivalAt?: string; // ISO string, for freshness
}

export interface Shift {
  id: string;
  personnelId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface ReservistCallUp {
  id: string;
  personnelId: string;
  date: string; // ISO string
}
