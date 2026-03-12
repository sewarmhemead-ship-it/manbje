# نماذج البيانات — تطبيق مركز العلاج الفيزيائي

## الجداول والعلاقات (ملخص تقني)

### المستخدمون والصلاحيات
- **users**: id, email, password_hash, role (enum), name_ar, name_en, phone, avatar_url, is_active, created_at, updated_at
- **roles**: id, name, permissions (JSON أو جدول roles_permissions)
- **staff**: id, user_id, branch_id, specialty (للأطباء), job_title, hire_date

### المرضى
- **patients**: id, user_id (nullable للزوار), name_ar, name_en, birth_date, gender, phone, email, address, emergency_contact_name, emergency_contact_phone, insurance_company, insurance_policy_number, notes, created_at, updated_at

### الفروع والخدمات
- **branches**: id, name_ar, name_en, address, phone, working_hours (JSON), is_active
- **services**: id, name_ar, name_en, duration_minutes, default_price, category (جلسة أولى، متابعة، إلخ)
- **rooms**: id, branch_id, name, capacity (اختياري)

### المواعيد والجلسات
- **appointments**: id, patient_id, staff_id (الطبيب), branch_id, room_id (اختياري), service_id, appointment_date, start_time, end_time, status (pending|confirmed|cancelled|completed|no_show), notes, transport_request_id (nullable), created_by, created_at, updated_at
- **sessions**: id, appointment_id, patient_id, staff_id, session_date, **status** (scheduled|in_progress|completed|cancelled|no_show), procedures_done (نص أو JSON), notes, outcome_notes, next_plan, **recovery_score** (عدد 0–100 أو 1–10، مقياس التحسن لهذه الجلسة؛ يُستخدم لرسم منحنى التحسن تلقائياً للمريض), created_at, updated_at

### السجل الطبي
- **medical_records**: id, patient_id, record_type (diagnosis|medication|allergy|surgery|injury), content (نص أو JSON), recorded_by, recorded_at
- **treatment_plans**: id, patient_id, staff_id, plan_name, total_sessions, completed_sessions, goals (JSON), start_date, end_date, status (active|completed|cancelled)

### المرفقات والأشعة
- **attachments**: id, patient_id, session_id (nullable), appointment_id (nullable), file_type (image|pdf|dicom), file_path (مشفر/في تخزين آمن), file_name_original, mime_type, category (xray|mri|report|clinical_photo), uploaded_by, uploaded_at

### النقل
- **transport_vehicles**: id, plate_number, vehicle_type, **accommodation_type** (wheelchair|stretcher|walking|all) — يحدد نوع التنسيق/الإعاقة الذي تدعمه السيارة لاختيار السيارة المناسبة آلياً, capacity, status (available|in_use|maintenance), branch_id
- **transport_drivers**: id, user_id, vehicle_id (أو many-to-many), license_number, is_available
- **transport_requests**: id, appointment_id, patient_id, pickup_address, pickup_time, destination_branch_id, **mobility_need** (wheelchair|stretcher|walking) — نوع الإعاقة/الحاجة لاختيار السيارة المناسبة آلياً, status (requested|assigned|en_route|arrived|completed|cancelled), driver_id, vehicle_id, notes, created_at, completed_at

### التمارين المنزلية الذكية
- **exercise_library**: id, title_ar, title_en, video_url, thumbnail_url, duration_seconds, category (قوة|مرونة|توازن|إلخ), difficulty_level, created_at
- **patient_exercise_assignments**: id, patient_id, session_id (nullable، الجلسة التي بُني عليها الواجب), assigned_by (staff_id), video_id (من exercise_library), frequency (daily|weekly), due_date (أو recurring), notes, created_at
- **exercise_completions**: id, assignment_id, patient_id, completed_at, **confirmed_by_patient** (boolean — تأكيد الإنجاز), notes (اختياري), created_at

### التواصل والسجلات
- **notifications**: id, user_id, patient_id (اختياري), type (sms|email|push|in_app), title, body, sent_at, read_at, metadata (JSON)
- **messages**: id, sender_id, recipient_id (أو conversation_id), body, is_from_patient, read_at, created_at
- **audit_logs**: id, user_id, action, entity_type, entity_id, old_values (JSON), new_values (JSON), ip_address, created_at

---

## ملاحظات تنفيذية
- كل الجداول تحتوي على **created_at** و **updated_at** حيث يلزم.
- استخدام **Soft Delete** (deleted_at) للبيانات الحساسة بدل الحذف الفعلي.
- **file_path** في attachments يجب أن يكون خارج الـ Web root أو محمي بصلاحيات.
- **passwords** دائماً مشفرة (bcrypt/argon2).
- الفهارس (Indexes) على: patient_id, appointment_date, staff_id, status في appointments؛ و transport_request على appointment_id و driver_id.
- **recovery_score**: يُخزَّن لكل جلسة مكتملة؛ تجميع القيم حسب patient_id و session_date يسمح برسم **منحنى التحسن (Recovery Curve)** تلقائياً في لوحة الطبيب/الإدارة.
- **mobility_need** في الطلب مع **accommodation_type** في المركبة: عند تعيين طلب نقل، النظام يطابق تلقائياً المركبات التي accommodation_type يغطي mobility_need (أو all).
