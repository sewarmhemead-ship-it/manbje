# PhysioCore — نظام إدارة مركز العلاج الفيزيائي

## نظرة عامة
نظام متكامل لإدارة مراكز العلاج الفيزيائي يشمل:
- لوحة تحكم ويب للطاقم الطبي والإداري
- تطبيق موبايل للمرضى (Expo React Native)
- API موحّد (NestJS + PostgreSQL)

## هيكل المشروع
```
physiocore/
├── backend/      # NestJS API
├── dashboard/    # React + Vite + TypeScript
└── patient-app/  # Expo React Native
```

## متطلبات التشغيل
- Node.js 18+
- PostgreSQL 15+
- Docker (اختياري)

## تشغيل سريع
```bash
# 1. قاعدة البيانات
docker run --name physiocore-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=physiocore \
  -p 5432:5432 -d postgres:15

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run start:dev

# 3. Dashboard
cd dashboard
cp .env.example .env
npm install
npm run dev

# 4. بيانات اختبار
cd backend
npm run db:seed-drugs
npm run db:seed-test
```

## حسابات الاختبار
| الدور | الإيميل | كلمة المرور |
|-------|---------|-------------|
| مدير | admin@physiocore.test | Test@1234 |
| دكتور | doctor@physiocore.test | Test@1234 |
| ممرض | nurse@physiocore.test | Test@1234 |
| استقبال | reception@physiocore.test | Test@1234 |
| سائق | driver@physiocore.test | Test@1234 |
| مريض (تطبيق) | +966500000010 | Test@1234 |

## الأدوار والصلاحيات
| الدور | الوصول |
|-------|--------|
| Admin | كل الأقسام + إدارة المستخدمين |
| Doctor | مواعيده + مرضاه + وصفاته + SOAP |
| Nurse | المرضى + النقل + العلامات الحيوية |
| Receptionist | الحجز + التسجيل + النقل |
| Driver | رحلاته فقط |
| Patient | تطبيق الموبايل فقط |

## الـ API Endpoints الرئيسية
```
POST   /auth/login
GET    /auth/me
GET    /appointments/doctor/:id
POST   /appointments
GET    /patients
POST   /patients
GET    /transport/requests
POST   /transport/requests
GET    /reports/stats
GET    /notifications
POST   /prescriptions
GET    /vitals/:patientId
```

## متغيرات البيئة (backend/.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=physiocore
JWT_SECRET=your_secret_here
PORT=3000
CORS_ORIGIN=http://localhost:5173
TWILIO_ACCOUNT_SID=        # اختياري
TWILIO_AUTH_TOKEN=          # اختياري
TWILIO_WHATSAPP_FROM=       # اختياري
```

## متغيرات البيئة (dashboard/.env)
```env
VITE_API_URL=http://localhost:3000
```

## Deploy
- Backend: Railway (railway.app)
- Dashboard: Vercel (vercel.com)
- Database: Railway PostgreSQL plugin
