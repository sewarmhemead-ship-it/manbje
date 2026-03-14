/**
 * Seed script for comprehensive test data — all roles.
 * Run: npm run db:seed-test
 * All test account passwords: Test@1234
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Room } from '../rooms/entities/room.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import {
  Appointment,
  AppointmentStatus,
  ArrivalType,
} from '../appointments/entities/appointment.entity';
import { ClinicalSession } from '../clinical-sessions/entities/clinical-session.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { PatientExercise } from '../exercises/entities/patient-exercise.entity';
import { ExerciseCompletion } from '../exercises/entities/exercise-completion.entity';
import { TransportVehicle } from '../transport/entities/transport-vehicle.entity';
import { TransportDriver } from '../transport/entities/transport-driver.entity';
import {
  TransportRequest,
  TransportRequestStatus,
} from '../transport/entities/transport-request.entity';
import { Drug, DrugForm, DrugCategory } from '../prescriptions/entities/drug.entity';
import {
  Prescription,
  PrescriptionStatus,
} from '../prescriptions/entities/prescription.entity';
import { PrescriptionItem } from '../prescriptions/entities/prescription-item.entity';
import { OutboundNotification } from '../notifications/entities/outbound-notification.entity';
import { Vital } from '../vitals/entities/vital.entity';

config({ path: resolve(__dirname, '../../.env') });

const TEST_PASSWORD = 'Test@1234';
const ADMIN_EMAIL = 'admin@physiocore.test';

const dataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'pt_center',
        ssl: false,
      }),
  entities: [
    User,
    Patient,
    Room,
    Equipment,
    Appointment,
    ClinicalSession,
    Exercise,
    PatientExercise,
    ExerciseCompletion,
    TransportVehicle,
    TransportDriver,
    TransportRequest,
    Drug,
    Prescription,
    PrescriptionItem,
    OutboundNotification,
    Vital,
  ],
  synchronize: false,
  logging: false,
});

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function setTime(d: Date, hour: number, minute: number): Date {
  const out = new Date(d);
  out.setHours(hour, minute, 0, 0);
  return out;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

dataSource
  .initialize()
  .then(async () => {
    const userRepo = dataSource.getRepository(User);
    const existingAdmin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
    if (existingAdmin) {
      console.log('✓ بيانات الاختبار موجودة مسبقاً');
      await dataSource.destroy();
      process.exit(0);
      return;
    }

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const today = startOfDay(new Date());
    const yesterday = addDays(today, -1);
    const lastWeek = addDays(today, -7);
    const tomorrow = addDays(today, 1);

    // ── المستخدمون (Staff) ──
    const admin = userRepo.create({
      email: 'admin@physiocore.test',
      passwordHash,
      role: UserRole.ADMIN,
      nameAr: 'أحمد المدير',
      phone: '+966500000001',
      isActive: true,
    });
    await userRepo.save(admin);

    const doctor = userRepo.create({
      email: 'doctor@physiocore.test',
      passwordHash,
      role: UserRole.DOCTOR,
      nameAr: 'د. كريم نجار',
      phone: '+966500000002',
      specialty: 'علاج عظام',
      isActive: true,
    });
    await userRepo.save(doctor);

    const nurse = userRepo.create({
      email: 'nurse@physiocore.test',
      passwordHash,
      role: UserRole.NURSE,
      nameAr: 'سارة الممرضة',
      phone: '+966500000003',
      isActive: true,
    });
    await userRepo.save(nurse);

    const receptionist = userRepo.create({
      email: 'reception@physiocore.test',
      passwordHash,
      role: UserRole.RECEPTIONIST,
      nameAr: 'فاطمة الاستقبال',
      phone: '+966500000004',
      isActive: true,
    });
    await userRepo.save(receptionist);

    const driverUser = userRepo.create({
      email: 'driver@physiocore.test',
      passwordHash,
      role: UserRole.DRIVER,
      nameAr: 'خالد السائق',
      phone: '+966500000005',
      isActive: true,
    });
    await userRepo.save(driverUser);

    // ── المرضى (5) ──
    const patientRepo = dataSource.getRepository(Patient);
    const patientsData = [
      {
        nameAr: 'أحمد خالد العمري',
        phone: '+966500000010',
        diagnosis: 'ألم ركبة يمنى — إصابة رياضية',
        recoveryScore: 72,
        mobilityAid: 'wheelchair',
        address: 'حي النزهة، الرياض',
      },
      {
        nameAr: 'فاطمة عمر السالم',
        phone: '+966500000011',
        diagnosis: 'ألم أسفل الظهر المزمن',
        recoveryScore: 45,
        mobilityAid: 'cane',
        address: 'حي الملز، الرياض',
      },
      {
        nameAr: 'خالد عبدالله النمر',
        phone: '+966500000012',
        diagnosis: 'إصابة كتف أيسر',
        recoveryScore: 30,
        mobilityAid: 'none',
        address: 'حي العليا، الرياض',
      },
      {
        nameAr: 'نورة إبراهيم العتيبي',
        phone: '+966500000013',
        diagnosis: 'تعافي ما بعد جراحة ركبة',
        recoveryScore: 88,
        mobilityAid: 'none',
        address: 'حي الروضة، الرياض',
      },
      {
        nameAr: 'سارة محمد الشمري',
        phone: '+966500000014',
        diagnosis: 'شلل نصفي — تأهيل',
        recoveryScore: 15,
        mobilityAid: 'stretcher',
        address: 'حي الورود، الرياض',
      },
    ];

    const patients: Patient[] = [];
    for (let i = 0; i < patientsData.length; i++) {
      const p = patientsData[i];
      const email = `patient${i + 1}@physiocore.test`;
      const u = userRepo.create({
        email,
        passwordHash,
        role: UserRole.PATIENT,
        nameAr: p.nameAr,
        phone: p.phone,
        isActive: true,
      });
      await userRepo.save(u);
      const rec = patientRepo.create({
        userId: u.id,
        nameAr: p.nameAr,
        phone: p.phone,
        diagnosis: p.diagnosis,
        mobilityAid: p.mobilityAid === 'none' ? null : p.mobilityAid,
        address: p.address,
      });
      await patientRepo.save(rec);
      patients.push(rec);
    }

    // ── الغرف ──
    const roomRepo = dataSource.getRepository(Room);
    const rooms = await Promise.all(
      ['غرفة 1', 'غرفة 2', 'غرفة 3'].map((num, i) => {
        const r = roomRepo.create({
          roomNumber: num,
          type: null,
          isActive: i < 2,
        });
        return roomRepo.save(r);
      })
    );

    // ── الأجهزة ──
    const equipmentRepo = dataSource.getRepository(Equipment);
    const equipmentData = [
      { name: 'جهاز الموجات فوق الصوتية', isAvailable: true },
      { name: 'جهاز الليزر العلاجي', isAvailable: true },
      { name: 'جهاز الكهربائي TENS', isAvailable: false },
      { name: 'دراجة التأهيل', isAvailable: true },
    ];
    const equipment = await Promise.all(
      equipmentData.map((e) => equipmentRepo.save(equipmentRepo.create(e)))
    );

    // ── التمارين (إن لم تكن موجودة) ──
    const exerciseRepo = dataSource.getRepository(Exercise);
    const exerciseNames = [
      'ثني الركبة',
      'تمطيط الرباط',
      'تقوية الفخذ',
      'المشي الإيزومتري',
      'تمارين التوازن',
    ];
    let exercises = await exerciseRepo.find({ where: [] });
    if (exercises.length < 5) {
      for (const name of exerciseNames) {
        const existing = await exerciseRepo.findOne({ where: { name } });
        if (!existing) {
          await exerciseRepo.save(exerciseRepo.create({ name }));
        }
      }
      exercises = await exerciseRepo.find({ where: [] });
    }
    const firstFiveExercises = exercises.slice(0, 5);
    while (firstFiveExercises.length < 5) {
      const name = exerciseNames[firstFiveExercises.length];
      const e = await exerciseRepo.save(exerciseRepo.create({ name }));
      firstFiveExercises.push(e);
    }

    // ── المواعيد (10) ──
    const aptRepo = dataSource.getRepository(Appointment);
    const room1 = rooms[0];
    const slots: { start: Date; status: AppointmentStatus; arrivalType: ArrivalType }[] = [
      { start: setTime(new Date(today), 9, 0), status: AppointmentStatus.COMPLETED, arrivalType: ArrivalType.CENTER_TRANSPORT },
      { start: setTime(new Date(today), 10, 30), status: AppointmentStatus.COMPLETED, arrivalType: ArrivalType.SELF_ARRIVAL },
      { start: setTime(new Date(today), 11, 0), status: AppointmentStatus.IN_PROGRESS, arrivalType: ArrivalType.CENTER_TRANSPORT },
      { start: setTime(new Date(today), 14, 0), status: AppointmentStatus.SCHEDULED, arrivalType: ArrivalType.SELF_ARRIVAL },
      { start: setTime(new Date(tomorrow), 9, 0), status: AppointmentStatus.SCHEDULED, arrivalType: ArrivalType.SELF_ARRIVAL },
      { start: setTime(new Date(tomorrow), 10, 0), status: AppointmentStatus.SCHEDULED, arrivalType: ArrivalType.CENTER_TRANSPORT },
      { start: setTime(new Date(tomorrow), 11, 30), status: AppointmentStatus.SCHEDULED, arrivalType: ArrivalType.SELF_ARRIVAL },
      { start: setTime(new Date(lastWeek), 9, 0), status: AppointmentStatus.COMPLETED, arrivalType: ArrivalType.SELF_ARRIVAL },
      { start: setTime(new Date(lastWeek), 10, 30), status: AppointmentStatus.COMPLETED, arrivalType: ArrivalType.CENTER_TRANSPORT },
      { start: setTime(new Date(lastWeek), 14, 0), status: AppointmentStatus.COMPLETED, arrivalType: ArrivalType.SELF_ARRIVAL },
    ];

    const appointments: Appointment[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const end = new Date(slot.start.getTime() + 45 * 60 * 1000);
      const patient = patients[i % patients.length];
      const apt = aptRepo.create({
        doctorId: doctor.id,
        patientId: patient.id,
        roomId: room1.id,
        startTime: slot.start,
        endTime: end,
        status: slot.status,
        arrivalType: slot.arrivalType,
      });
      await aptRepo.save(apt);
      appointments.push(apt);
    }

    // ── الجلسات السريرية (للمواعيد المكتملة) ──
    const sessionRepo = dataSource.getRepository(ClinicalSession);
    const completedApts = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED);
    for (const apt of completedApts) {
      const idx = patients.findIndex((p) => p.id === apt.patientId);
      const recoveryScore = idx >= 0 ? patientsData[idx].recoveryScore : 50;
      await sessionRepo.save(
        sessionRepo.create({
          appointmentId: apt.id,
          subjective: 'يشكو المريض من ألم متوسط الشدة...',
          objective: 'ROM: 0-110 درجة. قوة العضلة: 4/5',
          assessment: 'تحسن ملحوظ مقارنة بالجلسة السابقة',
          plan: 'الاستمرار بالبروتوكول الحالي مع زيادة تدريجية',
          recoveryScore,
        })
      );
    }

    // ── تمارين المرضى + Completions (patient 1: 5 exercises, first 3 completed today) ──
    const peRepo = dataSource.getRepository(PatientExercise);
    const ecRepo = dataSource.getRepository(ExerciseCompletion);
    const patient1 = patients[0];
    const frequencies = ['3 sets × 15 reps', '30 seconds × 4', '3 sets × 12 reps', '10 minutes', '2 sets × 20 seconds'];
    const patientExercises: PatientExercise[] = [];
    for (let i = 0; i < firstFiveExercises.length; i++) {
      const ex = firstFiveExercises[i];
      const pe = peRepo.create({
        patientId: patient1.id,
        exerciseId: ex.id,
        frequency: frequencies[i] ?? null,
        assignedAt: new Date(),
      });
      await peRepo.save(pe);
      patientExercises.push(pe);
    }
    for (let i = 0; i < 3; i++) {
      await ecRepo.save(
        ecRepo.create({
          patientExerciseId: patientExercises[i].id,
          completedAt: new Date(today.getTime() + (i + 1) * 3600000),
          confirmedByPatient: true,
        })
      );
    }

    // Assign same 5 exercises to other patients (no completions)
    for (let pi = 1; pi < patients.length; pi++) {
      for (let i = 0; i < firstFiveExercises.length; i++) {
        const pe = peRepo.create({
          patientId: patients[pi].id,
          exerciseId: firstFiveExercises[i].id,
          frequency: frequencies[i] ?? null,
          assignedAt: new Date(),
        });
        await peRepo.save(pe);
      }
    }

    // ── النقل ──
    const vehicleRepo = dataSource.getRepository(TransportVehicle);
    const vehicle = await vehicleRepo.save(
      vehicleRepo.create({
        plateNumber: 'PT-001',
        vehicleType: 'تويوتا هايس',
        capacity: 6,
        status: 'available',
      })
    );

    const driverRepo = dataSource.getRepository(TransportDriver);
    const driver = await driverRepo.save(
      driverRepo.create({
        userId: driverUser.id,
        vehicleId: vehicle.id,
        isAvailable: true,
      })
    );

    const trRepo = dataSource.getRepository(TransportRequest);
    const aptWithTransport = appointments.find(
      (a) => a.patientId === patient1.id && new Date(a.startTime).toDateString() === today.toDateString()
    );
    const tr1 = await trRepo.save(
      trRepo.create({
        patientId: patient1.id,
        appointmentId: aptWithTransport?.id ?? null,
        pickupAddress: 'حي النزهة، شارع الأمير محمد',
        pickupTime: setTime(new Date(today), 9, 30),
        status: TransportRequestStatus.EN_ROUTE,
        driverId: driver.id,
        vehicleId: vehicle.id,
      })
    );
    if (aptWithTransport) {
      await aptRepo.update(aptWithTransport.id, { transportRequestId: tr1.id });
    }
    await trRepo.save(
      trRepo.create({
        patientId: patients[1].id,
        appointmentId: null,
        pickupAddress: 'حي الملز',
        pickupTime: setTime(new Date(today), 10, 30),
        status: TransportRequestStatus.REQUESTED,
      })
    );
    await trRepo.save(
      trRepo.create({
        patientId: patients[2].id,
        appointmentId: null,
        pickupAddress: 'حي العليا',
        pickupTime: setTime(new Date(yesterday), 9, 0),
        status: TransportRequestStatus.COMPLETED,
        driverId: driver.id,
        vehicleId: vehicle.id,
      })
    );

    // ── الوصفات (تحتاج أدوية) ──
    const drugRepo = dataSource.getRepository(Drug);
    let drugIbu = await drugRepo.findOne({ where: { nameAr: 'إيبوبروفين' } });
    let drugMeth = await drugRepo.findOne({ where: { nameAr: 'ميثوكربامول' } });
    let drugPara = await drugRepo.findOne({ where: { nameAr: 'باراسيتامول' } });
    if (!drugIbu || !drugMeth || !drugPara) {
      if (!drugIbu) drugIbu = await drugRepo.save(drugRepo.create({ nameAr: 'إيبوبروفين', nameEn: 'Ibuprofen', defaultDose: 400, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY }));
      if (!drugMeth) drugMeth = await drugRepo.save(drugRepo.create({ nameAr: 'ميثوكربامول', nameEn: 'Methocarbamol', defaultDose: 750, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT }));
      if (!drugPara) drugPara = await drugRepo.save(drugRepo.create({ nameAr: 'باراسيتامول', nameEn: 'Paracetamol', defaultDose: 500, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC }));
    }

    const prescriptionRepo = dataSource.getRepository(Prescription);
    const itemRepo = dataSource.getRepository(PrescriptionItem);

    const rx1 = await prescriptionRepo.save(
      prescriptionRepo.create({
        rxNumber: 'RX-2026-0001',
        patientId: patient1.id,
        doctorId: doctor.id,
        status: PrescriptionStatus.ACTIVE,
        expiresAt: addDays(today, 30),
      })
    );
    await itemRepo.save(
      itemRepo.create({
        prescriptionId: rx1.id,
        drugId: drugIbu.id,
        dose: 400,
        doseUnit: 'mg',
        frequency: 'مرتين يومياً',
        durationDays: 7,
      })
    );
    await itemRepo.save(
      itemRepo.create({
        prescriptionId: rx1.id,
        drugId: drugMeth.id,
        dose: 750,
        doseUnit: 'mg',
        frequency: 'مرة يومياً',
        durationDays: 5,
      })
    );

    const rx2 = await prescriptionRepo.save(
      prescriptionRepo.create({
        rxNumber: 'RX-2026-0002',
        patientId: patient1.id,
        doctorId: doctor.id,
        status: PrescriptionStatus.EXPIRED,
        expiresAt: addDays(today, -5),
      })
    );
    await itemRepo.save(
      itemRepo.create({
        prescriptionId: rx2.id,
        drugId: drugPara.id,
        dose: 500,
        doseUnit: 'mg',
        frequency: 'حسب الحاجة',
        durationDays: 5,
      })
    );

    // ── الإشعارات (5 لـ patient 1) ──
    const notifRepo = dataSource.getRepository(OutboundNotification);
    const notifData = [
      { type: 'appointment_reminder_24h', status: 'sent' as const, channel: 'whatsapp' as const },
      { type: 'appointment_confirmed', status: 'sent' as const, channel: 'whatsapp' as const },
      { type: 'transport_assigned', status: 'sent' as const, channel: 'whatsapp' as const },
      { type: 'exercise_reminder', status: 'failed' as const, channel: 'app' as const },
      { type: 'appointment_reminder_2h', status: 'pending' as const, channel: 'sms' as const },
    ];
    for (const n of notifData) {
      await notifRepo.save(
        notifRepo.create({
          patientId: patient1.id,
          type: n.type,
          channel: n.channel,
          messageAr: `إشعار: ${n.type}`,
          status: n.status,
          sentAt: n.status === 'sent' ? new Date() : null,
        })
      );
    }

    // ── العلامات الحيوية (3 لـ patient 1) ──
    const vitalRepo = dataSource.getRepository(Vital);
    const vitalsData = [
      { daysAgo: 2, heartRate: 78, bloodPressure: '125/82', oxygenSaturation: 97, temperature: 36.8, painLevel: 7 },
      { daysAgo: 1, heartRate: 74, bloodPressure: '120/80', oxygenSaturation: 98, temperature: 36.6, painLevel: 5 },
      { daysAgo: 0, heartRate: 72, bloodPressure: '118/78', oxygenSaturation: 98, temperature: 36.5, painLevel: 4 },
    ];
    for (const v of vitalsData) {
      const recordedAt = addDays(today, -v.daysAgo);
      recordedAt.setHours(10, 0, 0, 0);
      await vitalRepo.save(
        vitalRepo.create({
          patientId: patient1.id,
          recordedById: nurse.id,
          recordedAt,
          heartRate: v.heartRate,
          bloodPressure: v.bloodPressure,
          oxygenSaturation: v.oxygenSaturation,
          temperature: v.temperature,
          painLevel: v.painLevel,
        })
      );
    }

    console.log(`✓ تم إنشاء بيانات الاختبار:
 - 5 مستخدمين + 5 مرضى
 - 10 مواعيد (4 اليوم)
 - 3 طلبات نقل
 - 2 وصفات طبية
 - 3 قياسات حيوية
 - 5 إشعارات`);

    await dataSource.destroy();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
