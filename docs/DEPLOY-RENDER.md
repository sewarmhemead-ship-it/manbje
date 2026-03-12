# رفع المشروع على Render

## المتطلبات

- حساب على [Render](https://render.com)
- المستودع مرفوع على GitHub (مثل `sewarmhemead-ship-it/manbje`)

---

## الطريقة 1: استخدام Blueprint (موصى بها)

1. ادخل إلى [dashboard.render.com](https://dashboard.render.com) وسجّل الدخول.
2. اضغط **New +** ثم اختر **Blueprint**.
3. اختر **Connect a repository** وربط مستودع GitHub `manbje`.
4. Render يكتشف ملف `render.yaml` تلقائياً ويقترح:
   - **PostgreSQL**: قاعدة بيانات `manbje-db`
   - **Web Service**: الباكند `manbje-api`
   - **Static Site**: الواجهة `manbje-web`
5. اضغط **Apply** وانتظر انتهاء النشر (قد يستغرق عدة دقائق).
6. بعد النشر:
   - رابط الواجهة: `https://manbje-web.onrender.com`
   - رابط الـ API: `https://manbje-api.onrender.com`

### ملاحظات

- **JWT_SECRET**: يُنشأ تلقائياً. احفظه من Dashboard إن احتجت نسخاً احتياطياً.
- **DATABASE_SYNC**: مضبوط على `true` في الملف لإنشاء الجداول في أول نشر. بعد التأكد من عمل الموقع يمكنك إزالته من Environment في خدمة `manbje-api` (أو تركه، حسب رغبتك).
- الخدمات المجانية قد «تنام» بعد فترة عدم استخدام؛ الطلب الأول قد يأخذ 30–60 ثانية.

---

## الطريقة 2: إعداد يدوي (بدون render.yaml)

### 1) قاعدة البيانات PostgreSQL

1. **New +** → **PostgreSQL**.
2. اسم: `manbje-db`.
3. اختر الخطة (مثلاً Free).
4. بعد الإنشاء، من **Info** انسخ **Internal Database URL** (للاستخدام في الباكند).

### 2) الباكند (API)

1. **New +** → **Web Service**.
2. اختر المستودع والفرع.
3. الإعدادات:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
4. **Environment** أضف:
   - `DATABASE_URL` = Internal Database URL من الخطوة 1
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = قيمة سرية طويلة (أو استخدم Generate)
   - `CORS_ORIGIN` = رابط الواجهة لاحقاً (مثلاً `https://manbje-web.onrender.com`)
5. احفظ وانشر.

### 3) الواجهة (Static Site)

1. **New +** → **Static Site**.
2. اختر نفس المستودع.
3. الإعدادات:
   - **Root Directory**: `dashboard`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Environment** أضف:
   - `VITE_API_URL` = رابط الباكند (مثلاً `https://manbje-api.onrender.com`)
5. احفظ وانشر.
6. عد إلى خدمة الباكند وحدّث `CORS_ORIGIN` ليكون رابط الواجهة النهائي.

---

## تسجيل الدخول بعد النشر

1. افتح رابط الواجهة (مثلاً `https://manbje-web.onrender.com`).
2. أنشئ مستخدماً من الـ API (مثلاً عبر Postman أو مسار التسجيل إن وُجد):
   - `POST https://manbje-api.onrender.com/auth/register`
   - Body: `{ "email", "password", "role": "admin", "nameAr": "مدير" }`
3. أو استخدم **Login** من الواجهة إذا كان التسجيل مفتوحاً.

---

## روابط مفيدة

- [وثائق Render](https://render.com/docs)
- [Blueprint Spec](https://docs.render.com/blueprint-spec)
