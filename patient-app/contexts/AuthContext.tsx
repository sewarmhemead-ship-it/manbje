import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setOnUnauthorized, getAuthMe } from '../services/api';
import { Patient } from '../services/api';

type User = { id: string; role: string; email?: string; nameAr?: string | null };

interface AuthState {
  user: User | null;
  patient: Patient | null;
  token: string | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPatient: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshPatient = useCallback(async () => {
    try {
      const u = await getAuthMe();
      if (u.role !== 'patient') return;
      const stored = await SecureStore.getItemAsync('patient_user');
      if (stored) setPatient(JSON.parse(stored));
    } catch {
      setPatient(null);
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(async () => {
      setToken(null);
      setUser(null);
      setPatient(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await SecureStore.getItemAsync('jwt_token');
      if (!t) {
        if (!cancelled) setReady(true);
        return;
      }
      setToken(t);
      try {
        const u = await getAuthMe();
        if (!cancelled) setUser(u);
        const stored = await SecureStore.getItemAsync('patient_user');
        if (stored && !cancelled) setPatient(JSON.parse(stored));
      } catch {
        await SecureStore.deleteItemAsync('jwt_token');
        await SecureStore.deleteItemAsync('patient_user');
        if (!cancelled) setToken(null), setUser(null), setPatient(null);
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    // مسح الجلسة القديمة أولاً حتى لا يظهر نفس الحساب السابق
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('patient_user');
    setToken(null);
    setUser(null);
    setPatient(null);

    const { data } = await api.post<{ user: User; accessToken: string }>('/auth/login', { phone, password });
    if (data.user.role !== 'patient') {
      throw new Error('هذا التطبيق للمرضى فقط');
    }
    await SecureStore.setItemAsync('jwt_token', data.accessToken);
    const patientData = await api.get(`/patients/me`).then((r) => r.data);
    await SecureStore.setItemAsync('patient_user', JSON.stringify(patientData));
    setToken(data.accessToken);
    setUser(data.user);
    setPatient(patientData);
    try {
      const { registerForPushNotifications } = await import('../notifications');
      if (patientData?.id) registerForPushNotifications(patientData.id);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('patient_user');
    setToken(null);
    setUser(null);
    setPatient(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, patient, token, ready, login, logout, refreshPatient }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
