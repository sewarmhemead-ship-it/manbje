import type { UserRole } from './api';

export const FRONTEND_PERMISSIONS: Record<string, UserRole[]> = {
  patients_view: ['admin', 'doctor', 'nurse', 'receptionist'],
  patients_create: ['admin', 'receptionist'],
  patients_edit: ['admin', 'doctor', 'receptionist'],
  patients_delete: ['admin'],
  patients_view_medical: ['admin', 'doctor', 'nurse'],

  appointments_view: ['admin', 'doctor', 'nurse', 'receptionist'],
  appointments_create: ['admin', 'receptionist', 'doctor'],
  appointments_edit: ['admin', 'receptionist', 'doctor'],
  appointments_append_note: ['admin', 'nurse', 'receptionist', 'doctor'],
  appointments_cancel: ['admin', 'receptionist'],

  sessions_view: ['admin', 'doctor', 'nurse'],
  sessions_create: ['admin', 'doctor'],
  sessions_edit: ['admin', 'doctor'],

  prescriptions_view: ['admin', 'doctor'],
  prescriptions_create: ['admin', 'doctor'],

  transport_view: ['admin', 'nurse', 'receptionist', 'driver'],
  transport_manage: ['admin', 'receptionist'],
  transport_driver: ['driver'],
  transport_status_update: ['admin', 'nurse', 'driver'],

  vitals_view: ['admin', 'doctor', 'nurse'],
  vitals_create: ['admin', 'doctor', 'nurse'],

  billing_view: ['admin'],
  billing_manage: ['admin'],

  reports_view: ['admin', 'doctor'],
  reports_full: ['admin'],

  notifications_view: ['admin', 'receptionist'],
  notifications_send: ['admin'],

  settings_view: ['admin'],
  settings_edit: ['admin'],

  users_view: ['admin'],
  users_create: ['admin'],
  users_edit: ['admin'],
  users_delete: ['admin'],
  users_change_role: ['admin'],

  receptionist_portal: ['receptionist'],
  doctor_portal: ['admin', 'doctor'],
  nurse_portal: ['admin', 'nurse'],
};

/** Use from components: const { hasPermission } = useAuth(); hasPermission('patients_view') */

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير',
  doctor: 'دكتور',
  nurse: 'ممرض',
  receptionist: 'استقبال',
  driver: 'سائق',
  patient: 'مريض',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#a78bfa',
  doctor: '#22d3ee',
  nurse: '#34d399',
  receptionist: '#fbbf24',
  driver: '#f87171',
  patient: '#60a5fa',
};
