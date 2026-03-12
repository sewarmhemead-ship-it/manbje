import { apiGet, type Appointment } from './api';

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const todayEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export async function getTodaysAppointments(doctorId?: string): Promise<Appointment[]> {
  if (doctorId) {
    return apiGet<Appointment[]>(
      `/appointments/doctor/${doctorId}?startDate=${todayStart()}&endDate=${todayEnd()}`
    );
  }
  return [];
}

export async function getAppointmentsForDashboard(): Promise<Appointment[]> {
  const start = todayStart();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  try {
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    const doctorId = user.id;
    if (doctorId) {
      return apiGet<Appointment[]>(
        `/appointments/doctor/${doctorId}?startDate=${start}&endDate=${endStr}`
      );
    }
  } catch {
    // no user
  }
  return [];
}

export async function getTransportRequests(): Promise<unknown[]> {
  try {
    return apiGet<unknown[]>('/transport/requests');
  } catch {
    return [];
  }
}
