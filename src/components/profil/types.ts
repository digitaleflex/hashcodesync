export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  firstname: string;
  lastname: string;
  role: string;
  timezone: string;
  createdAt: string;
  emailVerified: boolean;
};

export type ProfileGroup = {
  id: string;
  name: string;
  role: string;
};

export type PlanningPreferencesData = {
  preferredDays: number;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  preferredDurationHours: number | null;
  wantsWorkshops: boolean;
  wantsMentoring: boolean;
  frequency: string;
  maxHoursPerWeek: number | null;
  maxWorkshopsPerWeek: number | null;
  maxMentorshipPerWeek: number | null;
};

export type UnavailabilityData = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

export type AvailabilitySummary = {
  slots: number;
  hours: number;
  hasData: boolean;
};

export type ReliabilityData = {
  present: number;
  absent: number;
  observations: number;
  probability: number | null;
};

export type ProfilProps = {
  user: ProfileUser;
  groups: ProfileGroup[];
  planningPreferences: PlanningPreferencesData | null;
  unavailabilities: UnavailabilityData[];
  availability: AvailabilitySummary;
  reliability: ReliabilityData;
};