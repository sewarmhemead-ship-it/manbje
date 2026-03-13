import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    if (err.response?.status === 401 && onUnauthorized) {
      await SecureStore.deleteItemAsync('jwt_token');
      await SecureStore.deleteItemAsync('patient_user');
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export interface Patient {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  phone: string;
  recoveryScore?: number | null;
}

export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  arrivalType: string;
  doctor?: { nameAr?: string | null };
  room?: { roomNumber?: string };
  transportRequest?: {
    status?: string;
    driver?: { user?: { nameAr?: string }; vehicle?: { plateNumber?: string } };
    vehicle?: { plateNumber?: string };
    pickupTime?: string;
  };
}

export interface PatientExercise {
  id: string;
  exerciseId: string;
  exercise: { id: string; name: string; description?: string; targetMuscles?: string };
  completions?: { completedAt: string }[];
  frequency?: string | null;
}

export interface ProgressPoint {
  date: string;
  recoveryScore: number;
}

export interface OutboundNotification {
  id: string;
  type: string;
  messageAr: string;
  channel: string;
  status: string;
  createdAt: string;
  sentAt?: string | null;
}

export interface ClinicalSession {
  id: string;
  subjective?: string | null;
  recoveryScore?: number | null;
  appointment?: {
    startTime: string;
    doctor?: { nameAr?: string | null };
  };
}

export interface PrescriptionItem {
  id: string;
  drugId: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  durationDays: number;
  timing?: string | null;
  drug?: { nameAr: string };
}

export interface Prescription {
  id: string;
  rxNumber: string;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
  items?: PrescriptionItem[];
}

export async function getMyPrescriptions(patientId: string): Promise<Prescription[]> {
  const { data } = await api.get<Prescription[]>(`/prescriptions/patient/${patientId}`);
  return Array.isArray(data) ? data : [];
}

export async function getMyAppointments(patientId: string, status?: string, limit?: number): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit) params.set('limit', String(limit));
  const { data } = await api.get<Appointment[]>(`/appointments/patient/${patientId}?${params}`);
  return Array.isArray(data) ? data : [];
}

export async function getMyExercises(patientId: string): Promise<PatientExercise[]> {
  const { data } = await api.get<PatientExercise[]>(`/patients/${patientId}/exercises`);
  return Array.isArray(data) ? data : [];
}

export async function completeExercise(patientExerciseId: string): Promise<unknown> {
  return api.post(`/patient-exercises/${patientExerciseId}/completions`);
}

export async function getMyProgress(patientId: string): Promise<ProgressPoint[]> {
  const { data } = await api.get<ProgressPoint[]>(`/patients/${patientId}/progress`);
  return Array.isArray(data) ? data : [];
}

export async function getMyNotifications(patientId: string, limit = 1): Promise<OutboundNotification[]> {
  const { data } = await api.get<OutboundNotification[]>(`/notifications/me?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function getPatientProfile(patientId: string): Promise<Patient | null> {
  try {
    const { data } = await api.get<Patient>(`/patients/me`);
    return data;
  } catch {
    return null;
  }
}

export async function getAuthMe(): Promise<{ id: string; role: string; email?: string; nameAr?: string | null }> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getClinicalSessions(patientId: string, limit = 1): Promise<ClinicalSession[]> {
  const { data } = await api.get<ClinicalSession[]>(`/clinical-sessions?patientId=${patientId}&limit=${limit}`);
  return Array.isArray(data) ? data : [];
}
