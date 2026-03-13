import { Role } from './enums/role.enum';

export const PERMISSIONS: Record<string, Role[]> = {
  patients_view: [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST],
  patients_create: [Role.ADMIN, Role.RECEPTIONIST],
  patients_edit: [Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST],
  patients_delete: [Role.ADMIN],
  patients_view_medical: [Role.ADMIN, Role.DOCTOR, Role.NURSE],

  appointments_view: [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST],
  appointments_create: [Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR],
  appointments_edit: [Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR],
  appointments_cancel: [Role.ADMIN, Role.RECEPTIONIST],

  sessions_view: [Role.ADMIN, Role.DOCTOR, Role.NURSE],
  sessions_create: [Role.ADMIN, Role.DOCTOR],
  sessions_edit: [Role.ADMIN, Role.DOCTOR],

  prescriptions_view: [Role.ADMIN, Role.DOCTOR],
  prescriptions_create: [Role.ADMIN, Role.DOCTOR],

  transport_view: [Role.ADMIN, Role.NURSE, Role.RECEPTIONIST, Role.DRIVER],
  transport_manage: [Role.ADMIN, Role.RECEPTIONIST],
  transport_driver: [Role.DRIVER],

  billing_view: [Role.ADMIN],
  billing_manage: [Role.ADMIN],

  reports_view: [Role.ADMIN, Role.DOCTOR],
  reports_full: [Role.ADMIN],

  notifications_view: [Role.ADMIN, Role.RECEPTIONIST],
  notifications_send: [Role.ADMIN],

  settings_view: [Role.ADMIN],
  settings_edit: [Role.ADMIN],

  users_view: [Role.ADMIN],
  users_create: [Role.ADMIN],
  users_edit: [Role.ADMIN],
  users_delete: [Role.ADMIN],
  users_change_role: [Role.ADMIN],

  receptionist_portal: [Role.RECEPTIONIST],
};
