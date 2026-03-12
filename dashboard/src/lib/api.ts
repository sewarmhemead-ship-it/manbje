const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const message = err.message ?? res.statusText ?? 'Request failed';
    if (res.status === 409) throw new Error(message);
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiGet = <T>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = (path: string) => api<undefined>(path, { method: 'DELETE' });

export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Upload failed');
  }
  return res.json();
}

export type UserRole = 'admin' | 'doctor' | 'patient' | 'driver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  nameAr: string | null;
  nameEn: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  startTime: string;
  endTime: string;
  status: string;
  arrivalType: 'self_arrival' | 'center_transport';
  arrivalDisplayText?: string;
  transportRequest?: {
    status?: string;
    vehicle?: { plateNumber?: string };
    driver?: { user?: { nameAr?: string } };
    pickupTime?: string;
  };
  patient?: { id?: string; nameAr: string; nameEn?: string | null; diagnosis?: string; phone?: string };
  doctor?: { id: string; nameAr: string | null; nameEn: string | null };
  room?: { id: string; name?: string };
  equipment?: { id: string; name?: string } | null;
  roomId?: string;
  equipmentId?: string | null;
  notes?: string | null;
}

export interface TransportRequest {
  id: string;
  appointmentId: string;
  status: string;
  patient?: { nameAr: string };
}
