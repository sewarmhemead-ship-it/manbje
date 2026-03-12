/**
 * Mock data for Demo mode (VITE_DEMO_MODE=true).
 * Used when no backend is available so the UI looks full and structured.
 */

export const MOCK_PATIENTS = [
  {
    id: 'mock-patient-1',
    nameAr: 'أحمد محمد العلي',
    nameEn: 'Ahmed Mohammed',
    birthDate: '1985-03-15',
    gender: 'ذكر',
    phone: '0501234567',
    email: 'ahmed@example.com',
    address: 'الرياض، حي النخيل',
    diagnosis: 'ألم أسفل الظهر',
    assignedDoctorId: 'mock-doctor-1',
    assignedDoctor: { id: 'mock-doctor-1', nameAr: 'د. سارة الغامدي', nameEn: 'Dr. Sara' },
    arrivalPreference: 'self',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
  {
    id: 'mock-patient-2',
    nameAr: 'فاطمة حسن',
    nameEn: 'Fatima Hassan',
    birthDate: '1990-07-22',
    gender: 'أنثى',
    phone: '0559876543',
    email: null,
    address: 'جدة',
    diagnosis: 'إعادة تأهيل بعد جراحة الركبة',
    assignedDoctorId: 'mock-doctor-1',
    assignedDoctor: { id: 'mock-doctor-1', nameAr: 'د. سارة الغامدي', nameEn: 'Dr. Sara' },
    arrivalPreference: 'center_transport',
    createdAt: '2024-02-01T09:00:00.000Z',
  },
  {
    id: 'mock-patient-3',
    nameAr: 'خالد عبدالله',
    nameEn: 'Khalid Abdullah',
    birthDate: '1978-11-05',
    gender: 'ذكر',
    phone: '0541112233',
    email: 'khalid@example.com',
    address: 'الدمام',
    diagnosis: 'التهاب الوتر',
    assignedDoctorId: 'mock-doctor-2',
    assignedDoctor: { id: 'mock-doctor-2', nameAr: 'د. عمر الشمري', nameEn: 'Dr. Omar' },
    arrivalPreference: 'self',
    createdAt: '2024-02-15T10:00:00.000Z',
  },
  {
    id: 'mock-patient-4',
    nameAr: 'نورة إبراهيم',
    nameEn: 'Nora Ibrahim',
    birthDate: '1995-01-30',
    gender: 'أنثى',
    phone: '0534445566',
    email: null,
    address: 'الرياض',
    diagnosis: 'ألم الرقبة المزمن',
    assignedDoctorId: 'mock-doctor-2',
    assignedDoctor: { id: 'mock-doctor-2', nameAr: 'د. عمر الشمري', nameEn: 'Dr. Omar' },
    arrivalPreference: 'center_transport',
    createdAt: '2024-03-01T11:00:00.000Z',
  },
  {
    id: 'mock-patient-5',
    nameAr: 'يوسف علي المطيري',
    nameEn: 'Youssef Ali',
    birthDate: '1982-06-18',
    gender: 'ذكر',
    phone: '0567778899',
    email: 'youssef@example.com',
    address: 'مكة المكرمة',
    diagnosis: 'إعادة تأهيل الكتف',
    assignedDoctorId: 'mock-doctor-1',
    assignedDoctor: { id: 'mock-doctor-1', nameAr: 'د. سارة الغامدي', nameEn: 'Dr. Sara' },
    arrivalPreference: 'self',
    createdAt: '2024-03-10T12:00:00.000Z',
  },
];

const now = new Date();
const today = now.toISOString().slice(0, 10);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

export const MOCK_APPOINTMENTS = [
  {
    id: 'mock-apt-1',
    doctorId: 'mock-doctor-1',
    patientId: 'mock-patient-1',
    startTime: `${today}T09:00:00.000Z`,
    endTime: `${today}T09:45:00.000Z`,
    status: 'in_progress',
    arrivalType: 'self_arrival' as const,
    patient: { id: 'mock-patient-1', nameAr: 'أحمد محمد العلي', nameEn: 'Ahmed Mohammed', diagnosis: 'ألم أسفل الظهر', phone: '0501234567' },
    doctor: { id: 'mock-doctor-1', nameAr: 'د. سارة الغامدي', nameEn: 'Dr. Sara' },
    room: { id: 'r1', name: 'غرفة ١' },
    equipment: { id: 'e1', name: 'جهاز العلاج' },
  },
  {
    id: 'mock-apt-2',
    doctorId: 'mock-doctor-1',
    patientId: 'mock-patient-2',
    startTime: `${today}T10:00:00.000Z`,
    endTime: `${today}T10:45:00.000Z`,
    status: 'scheduled',
    arrivalType: 'center_transport' as const,
    transportRequest: { status: 'en_route', vehicle: { plateNumber: 'أ ب ج ١٢٣٤' }, driver: { user: { nameAr: 'محمد السائق' } } },
    patient: { id: 'mock-patient-2', nameAr: 'فاطمة حسن', nameEn: 'Fatima Hassan', diagnosis: 'إعادة تأهيل الركبة', phone: '0559876543' },
    doctor: { id: 'mock-doctor-1', nameAr: 'د. سارة الغامدي', nameEn: 'Dr. Sara' },
    room: { id: 'r2', name: 'غرفة ٢' },
    equipment: null,
  },
  {
    id: 'mock-apt-3',
    doctorId: 'mock-doctor-2',
    patientId: 'mock-patient-3',
    startTime: `${today}T11:30:00.000Z`,
    endTime: `${today}T12:15:00.000Z`,
    status: 'scheduled',
    arrivalType: 'self_arrival' as const,
    patient: { id: 'mock-patient-3', nameAr: 'خالد عبدالله', nameEn: 'Khalid Abdullah', diagnosis: 'التهاب الوتر', phone: '0541112233' },
    doctor: { id: 'mock-doctor-2', nameAr: 'د. عمر الشمري', nameEn: 'Dr. Omar' },
    room: { id: 'r1', name: 'غرفة ١' },
    equipment: { id: 'e2', name: 'جهاز الموجات' },
  },
  {
    id: 'mock-apt-4',
    doctorId: 'mock-doctor-2',
    patientId: 'mock-patient-4',
    startTime: `${tomorrowStr}T09:00:00.000Z`,
    endTime: `${tomorrowStr}T09:45:00.000Z`,
    status: 'scheduled',
    arrivalType: 'center_transport' as const,
    patient: { id: 'mock-patient-4', nameAr: 'نورة إبراهيم', nameEn: 'Nora Ibrahim', diagnosis: 'ألم الرقبة', phone: '0534445566' },
    doctor: { id: 'mock-doctor-2', nameAr: 'د. عمر الشمري', nameEn: 'Dr. Omar' },
    room: { id: 'r2', name: 'غرفة ٢' },
    equipment: null,
  },
];

export const MOCK_PATIENT_STATS = {
  total: MOCK_PATIENTS.length,
  activeThisMonth: 4,
  newThisWeek: 2,
};

export const MOCK_DASHBOARD_STATS = {
  todayAppointments: 3,
  inTransit: 1,
  activeSessions: 1,
  weeklyRevenue: 4250,
};

export const MOCK_TRANSPORT_REQUESTS = [
  { id: 'mock-tr-1', status: 'en_route', appointmentId: 'mock-apt-2', patient: { nameAr: 'فاطمة حسن' }, vehicle: { plateNumber: 'أ ب ج ١٢٣٤' }, driver: { user: { nameAr: 'محمد السائق' } }, createdAt: `${today}T08:00:00.000Z` },
  { id: 'mock-tr-2', status: 'requested', appointmentId: 'mock-apt-4', patient: { nameAr: 'نورة إبراهيم' }, createdAt: `${today}T07:30:00.000Z` },
  { id: 'mock-tr-3', status: 'completed', appointmentId: 'mock-apt-1', patient: { nameAr: 'أحمد محمد' }, createdAt: `${today}T06:00:00.000Z` },
];

export const MOCK_USERS_DOCTORS = [
  { id: 'mock-doctor-1', nameAr: 'د. سارة الغامدي', nameEn: 'Dr. Sara', role: 'doctor' },
  { id: 'mock-doctor-2', nameAr: 'د. عمر الشمري', nameEn: 'Dr. Omar', role: 'doctor' },
];

export const MOCK_VEHICLES = [
  { id: 'mock-v-1', plateNumber: 'أ ب ج ١٢٣٤', status: 'in_use' },
  { id: 'mock-v-2', plateNumber: 'د ه و ٥٦٧٨', status: 'available' },
];
export const MOCK_DRIVERS = [
  { id: 'mock-dr-1', user: { nameAr: 'محمد السائق' }, isAvailable: false },
  { id: 'mock-dr-2', user: { nameAr: 'علي النقل' }, isAvailable: true },
];

export const MOCK_REPORTS = {
  dashboardStats: { totalSessions: 48, avgRecovery: 72, attendanceRate: 94, cancellations: 3, newPatients: 12, revenue: 12500 },
  sessionsByDay: [
    { date: today, count: 6 }, { date: new Date(now.getTime() - 864e5).toISOString().slice(0, 10), count: 8 },
    { date: new Date(now.getTime() - 2 * 864e5).toISOString().slice(0, 10), count: 5 }, { date: new Date(now.getTime() - 3 * 864e5).toISOString().slice(0, 10), count: 7 },
    { date: new Date(now.getTime() - 4 * 864e5).toISOString().slice(0, 10), count: 4 }, { date: new Date(now.getTime() - 5 * 864e5).toISOString().slice(0, 10), count: 9 },
  ],
  heatmap: [1, 2, 3, 4, 5, 6, 0].flatMap((d) => [9, 10, 11, 12, 14, 15, 16].map((h) => ({ dayOfWeek: d, hour: h, count: Math.floor(Math.random() * 4) + 1 }))),
  doctorPerf: [
    { doctorId: 'mock-doctor-1', doctorName: 'د. سارة الغامدي', sessionsCount: 28, avgRecovery: 75, attendanceRate: 96 },
    { doctorId: 'mock-doctor-2', doctorName: 'د. عمر الشمري', sessionsCount: 20, avgRecovery: 68, attendanceRate: 92 },
  ],
  patientGrowth: [
    { month: '2024-01', newPatients: 5 }, { month: '2024-02', newPatients: 8 }, { month: '2024-03', newPatients: 12 },
  ],
  transportStats: { totalTrips: 24, todayTrips: 3, byMobilityNeed: [{ type: 'wheelchair', count: 8 }, { type: 'stretcher', count: 2 }], byVehicle: [{ vehicleId: 'mock-v-1', plate: 'أ ب ج ١٢٣٤', tripCount: 14 }, { vehicleId: 'mock-v-2', plate: 'د ه و ٥٦٧٨', tripCount: 10 }] },
};

export const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';
