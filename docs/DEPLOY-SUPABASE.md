# رفع المشروع باستخدام Supabase

استخدام **Supabase** كقاعدة بيانات (PostgreSQL) مع نشر الباكند والواجهة على خدمات تدعمها.

---

## ما الذي نستخدم Supabase فيه؟

- **قاعدة البيانات (PostgreSQL)** — من لوحة تحكم Supabase.
- الباكند (NestJS) والواجهة (React) يُنشران على **Render** أو **Vercel** أو **Railway** (الباكند يحتاج خدمة Node).

---

## الخطوة 1: إنشاء مشروع Supabase وقاعدة البيانات

1. ادخل إلى [supabase.com](https://supabase.com) وسجّل الدخول.
2. **New Project** → اختر المؤسسة (Organization) ثم:
   - **Name**: مثلاً `manbje`
   - **Database Password**: احفظها في مكان آمن (تُستخدم في رابط الاتصال).
   - **Region**: اختر الأقرب لك.
3. اضغط **Create new project** وانتظر حتى يصبح المشروع جاهزاً.

---

## الخطوة 2: الحصول على رابط الاتصال (Connection String)

1. من المشروع: **Project Settings** (أيقونة الترس) → **Database**.
2. في **Connection string** اختر **URI**.
3. انسخ الرابط. يبدو تقريباً كالتالي:
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
4. استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات التي أنشأتها في الخطوة 1.
5. احفظ الرابط النهائي كقيمة للمتغير **`DATABASE_URL`** (ستستخدمها في الباكند).

ملاحظة: يمكنك استخدام **Session mode** (منفذ 5432) أو **Transaction mode** (منفذ 6543). المشروع يدعم الاثنين مع SSL.

---

## الخطوة 3: نشر الباكند (API) على Render

### استخدام Blueprint مع Supabase

1. ادخل إلى [dashboard.render.com](https://dashboard.render.com).
2. **New +** → **Blueprint**.
3. وصّل المستودع، ثم في **Blueprint** اختر الملف **`render-supabase.yaml`** (وليس `render.yaml`).
4. بعد **Apply**، ادخل إلى خدمة **manbje-api** → **Environment** وألصق **DATABASE_URL** من Supabase (الخطوة 2).
5. احفظ وانتظر إعادة النشر.

### إعداد يدوي (بدون Blueprint)

1. ادخل إلى [dashboard.render.com](https://dashboard.render.com).
2. **New +** → **Web Service**.
3. وصّل المستودع من GitHub (مثلاً `sewarmhemead-ship-it/manbje`).
4. الإعدادات:
   - **Name**: `manbje-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
5. **Environment Variables** أضف:

   | المفتاح           | القيمة |
   |-------------------|--------|
   | `DATABASE_URL`    | الرابط من Supabase (الخطوة 2) |
   | `NODE_ENV`        | `production` |
   | `JWT_SECRET`     | سلسلة عشوائية طويلة (أو Generate) |
   | `CORS_ORIGIN`    | رابط الواجهة لاحقاً (مثلاً `https://manbje-web.onrender.com`) |
   | `DATABASE_SYNC`  | `true` (أول نشر فقط لإنشاء الجداول، ثم يمكن حذفها) |

6. **Create Web Service** وانتظر انتهاء النشر.
7. احفظ رابط الـ API (مثلاً `https://manbje-api.onrender.com`).

---

## الخطوة 4: نشر الواجهة (Frontend)

### خيار أ: Render (Static Site)

1. في Render: **New +** → **Static Site**.
2. نفس المستودع.
3. الإعدادات:
   - **Root Directory**: `dashboard`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Environment**:
   - `VITE_API_URL` = رابط الباكند (مثلاً `https://manbje-api.onrender.com`)
5. عد إلى خدمة الباكند وحدّث `CORS_ORIGIN` ليكون رابط الواجهة من Render.

### خيار ب: Vercel

1. ادخل إلى [vercel.com](https://vercel.com) وربط المستودع.
2. **Import** المشروع واختر المجلد `dashboard` كـ **Root Directory**.
3. **Environment Variables**:
   - `VITE_API_URL` = رابط الباكند (مثلاً `https://manbje-api.onrender.com`)
4. **Deploy**. ثم حدّث `CORS_ORIGIN` في الباكند ليشمل رابط Vercel (مثلاً `https://xxx.vercel.app`).

---

## ملخص المتغيرات حسب الخدمة

| الخدمة      | متغيرات مهمة |
|------------|----------------|
| **Supabase** | لا تحتاج متغيرات في الواجهة؛ تستخدم فقط لقاعدة البيانات. |
| **الباكند (Render)** | `DATABASE_URL` من Supabase، `JWT_SECRET`، `CORS_ORIGIN`، `DATABASE_SYNC` (اختياري أول نشر). |
| **الواجهة (Render/Vercel)** | `VITE_API_URL` = رابط الباكند. |

---

## التحقق بعد النشر

1. افتح رابط الواجهة.
2. إن وُجد تسجيل: أنشئ مستخدماً (مثلاً مدير).
3. أو استدعِ الـ API مباشرة:
   ```bash
   POST https://manbje-api.onrender.com/auth/register
   Body: { "email": "admin@example.com", "password": "كلمة_سر", "role": "admin", "nameAr": "مدير" }
   ```
4. ثم سجّل الدخول من الواجهة.

---

## الربط المحلي مع Supabase (اختياري)

لتشغيل المشروع محلياً مع قاعدة البيانات على Supabase:

1. في جذر المشروع انسخ `backend/.env.example` إلى `backend/.env`.
2. ضع في `.env`:
   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   JWT_SECRET=سري-محلي
   CORS_ORIGIN=http://localhost:5173
   ```
3. شغّل الباكند: `cd backend && npm run start:dev`.
4. شغّل الواجهة: `cd dashboard && npm run dev`.

---

## روابط مفيدة

- [Supabase Database](https://supabase.com/docs/guides/database)
- [Connection strings - Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-uri)
- [Render Web Services](https://render.com/docs/web-services)
- [Vercel Deploy](https://vercel.com/docs/deployments/overview)
