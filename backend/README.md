# Phase 1 — Core Engine (Backend)

NestJS + PostgreSQL + JWT مع صلاحيات الأدوار (Admin, Doctor, Patient, Driver) وجداول المستخدمين والمرضى.

## المتطلبات

- Node.js 18+
- PostgreSQL 14+

## الإعداد

```bash
cd backend
cp .env.example .env
# عدّل .env بقيم قاعدة البيانات و JWT_SECRET
npm install
```

## تشغيل قاعدة البيانات

تأكد من تشغيل PostgreSQL وإنشاء قاعدة بيانات:

```sql
CREATE DATABASE pt_center;
```

أو استخدم قيم `.env` الخاصة بك.

## التشغيل

```bash
# تطوير (مع إعادة تحميل تلقائي)
npm run start:dev

# إنتاج
npm run build
npm run start:prod
```

الـ API يعمل على `http://localhost:3000` (أو القيمة في `PORT`).

## نقاط النهاية (Auth)

| Method | Path | الوصف |
|--------|------|--------|
| POST | `/auth/register` | تسجيل مستخدم جديد (body: email, password, role, nameAr?, nameEn?, phone?) |
| POST | `/auth/login` | تسجيل الدخول (body: email, password) → يرجع user + accessToken |
| GET | `/auth/me` | المستخدم الحالي (يتطلب Authorization: Bearer &lt;token&gt;) |

## الأدوار (Roles)

- `admin` — إدارة كاملة، عرض قائمة المستخدمين.
- `doctor` — إنشاء/تعديل/عرض المرضى.
- `patient` — عرض ملفه فقط (`GET /patients/me`).
- `driver` — (سيُستخدم لاحقاً لطلبات النقل.)

## نقاط النهاية (Patients)

| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/patients` | Admin, Doctor |
| GET | `/patients` | Admin, Doctor |
| GET | `/patients/me` | Patient (ملف المريض المرتبط بحسابه) |
| GET | `/patients/:id` | Admin, Doctor |
| PATCH | `/patients/:id` | Admin, Doctor |

## Phase 2 — المواعيد والموارد (Appointments & Resources)

### الغرف (Rooms)
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/rooms` | Admin |
| GET | `/rooms` | Admin, Doctor (استعلام ?activeOnly=true) |
| GET | `/rooms/:id` | Admin, Doctor |
| PATCH | `/rooms/:id` | Admin |

### الأجهزة (Equipment)
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/equipment` | Admin |
| GET | `/equipment` | Admin, Doctor (?availableOnly=true) |
| GET | `/equipment/:id` | Admin, Doctor |
| PATCH | `/equipment/:id` | Admin |

### جداول الأطباء (Schedules)
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/schedules` | Admin, Doctor (الطبيب لنفسه فقط) |
| GET | `/schedules/doctor/:doctorId` | Admin, Doctor (لنفسه فقط) |
| DELETE | `/schedules/:id` | Admin, Doctor |

### المواعيد (Appointments)
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/appointments` | Admin, Doctor (مع منع التعارض: طبيب، غرفة، جهاز) |
| GET | `/appointments/doctor/:doctorId?startDate=&endDate=` | Admin, Doctor (لنفسه) |
| GET | `/appointments/patient/:patientId` | Admin, Doctor, Patient (لنفسه فقط) |
| GET | `/appointments/:id` | Admin, Doctor, Patient (صلاحية حسب المورد) |
| PATCH | `/appointments/:id/status` | Admin, Doctor (body: { status }) |

حالات الموعد: `scheduled` | `in_progress` | `completed` | `cancelled` | `no_show`.  
نوع الوصول: `arrivalType`: `self_arrival` (افتراضي) | `center_transport`. عند الحجز مع `center_transport` يُمرَّر `pickupAddress`, `pickupTime`, واختياريّاً `completionStatus`, `mobilityNeed` ويُنشأ طلب نقل تلقائياً.  
استجابة GET للمواعيد تتضمّن `arrivalDisplayText` (مثلاً "المريض قادم بالسيارة الخاصة بالمركز" أو "قادم بمفرده") و`transportRequest` عند وجود طلب نقل.

## Phase 4 — نظام النقل (Transport Module)

جميع نقاط النقل تحت البادئة `/transport/`.

### المركبات
| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `/transport/vehicles` | Admin |
| POST | `/transport/vehicles` | Admin (body: plateNumber, vehicleType?, accommodationType?, capacity?) |
| PATCH | `/transport/vehicles/:id` | Admin |

### السائقون
| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `/transport/drivers` | Admin, Driver |
| POST | `/transport/drivers` | Admin (body: userId, vehicleId?, licenseNumber?) |
| PATCH | `/transport/drivers/:id/availability` | Admin, Driver (body: { isAvailable }) |

### طلبات النقل
| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `/transport/requests` | Admin |
| POST | `/transport/requests` | Admin, Doctor (أو يُنشأ تلقائياً عند POST /appointments مع arrivalType: center_transport) |
| GET | `/transport/requests/:id` | Admin, Doctor, Driver |
| PATCH | `/transport/requests/:id/status` | Admin, Driver (body: { status }) — عند `arrived_at_center` تُضاف ملاحظة تلقائية للموعد |
| PATCH | `/transport/requests/:id/assign` | Admin (body: driverId, vehicleId) |

حالات الطلب: `requested` | `assigned` | `en_route` | `arrived_at_center` | `completed` | `cancelled`.  
`completion_status`: `to_center_only` | `from_center_only` | `round_trip`.

## Phase 3 — السجل الطبي والتمارين (Clinical & HEP)

### الجلسات السريرية (Clinical Sessions)
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/clinical-sessions` | Admin, Doctor (لمواعيد الطبيب فقط؛ يُحدّث الموعد تلقائياً إلى completed) |
| GET | `/clinical-sessions?appointmentId=` | Admin, Doctor |

الحقول: appointmentId, subjective, objective, assessment, plan, recoveryScore (0–100), therapistNotes.

### التقدّم (Recovery Curve)
| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `/patients/:id/progress` | Admin, Doctor, Patient (لنفسه فقط) |

يرجع مصفوفة `{ date, recoveryScore }[]` لتمثيل منحنى التحسن.

### المرفقات والأشعة (Attachments)
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/attachments/upload` | Admin, Doctor (multipart: file, patientId, fileType, description?, sessionId?) |
| GET | `/attachments/patient/:patientId` | Admin, Doctor, Patient (لنفسه فقط) |

fileType: `xray` | `mri` | `report`. الملفات تُحفظ محلياً في `uploads/attachments/`.

### مكتبة التمارين والبرامج المنزلية
| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `/exercises` | Admin, Doctor (إنشاء تمرين: name, description?, videoUrl?, targetMuscles?) |
| GET | `/exercises` | Admin, Doctor, Patient |
| GET | `/exercises/:id` | Admin, Doctor, Patient |
| POST | `/exercises/assign` | Admin, Doctor (body: patientId, exerciseId, frequency?, durationDays?) |
| GET | `/patients/:id/exercises` | Admin, Doctor, Patient (لنفسه فقط) — البرامج الحالية مع التكرارات |
| POST | `/patient-exercises/:id/complete` | Patient (تأكيد إنجاز التمرين) |
| POST | `/patient-exercises/:id/completions` | Patient (تسجيل تنفيذ يومي) |

## هيكل المشروع

```
src/
  main.ts
  app.module.ts
  auth/           # JWT, Login, Register, Guards, Strategy
  users/          # User entity, Service, Controller
  patients/       # Patient entity, DTOs, Service, Controller
  rooms/          # الغرف (room_number, type, is_active)
  equipment/     # الأجهزة (name, description, is_available)
  schedules/      # أوقات عمل الأطباء (day_of_week, start_time, end_time)
  appointments/   # المواعيد + منطق منع التعارض
  clinical-sessions/  # الجلسات السريرية + recovery_score
  attachments/    # رفع أشعة/تقارير (FileInterceptor، تخزين محلي)
  exercises/      # مكتبة التمارين + patient_exercises + exercise_completions
  transport/      # المركبات، السائقون، طلبات النقل (ربط مع الموعد وملاحظة الوصول)
  common/         # Decorators (Roles, CurrentUser)
```
