# دليل النشر (Deployment)

## الطريقة الأسرع — Railway + Vercel

### 1. Backend على Railway
1. أنشئ حساباً على railway.app
2. "New Project" → "Deploy from GitHub"
3. اختر مجلد `backend/`
4. أضف PostgreSQL plugin
5. أضف متغيرات البيئة:
   - `DATABASE_URL` (من الـ plugin تلقائياً)
   - `JWT_SECRET=your_strong_secret`
   - `CORS_ORIGIN=https://your-app.vercel.app`
6. انتظر الـ Deploy → احفظ الـ URL

### 2. Dashboard على Vercel
1. أنشئ حساباً على vercel.com
2. "New Project" → اختر المستودع
3. Root Directory: `dashboard`
4. أضف متغير البيئة:
   - `VITE_API_URL=https://your-backend.railway.app`
5. Deploy

### 3. بعد النشر
- شغّل seed: `railway run npm run db:seed-drugs`
- شغّل seed: `railway run npm run db:seed-test`

## ربط الدومين
في Cloudflare DNS:
- `app.yourdomain.com` → CNAME → `your-app.vercel.app`
- `api.yourdomain.com` → CNAME → `your-backend.railway.app`
