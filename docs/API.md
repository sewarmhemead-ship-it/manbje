# API Documentation

## Authentication
All endpoints require: `Authorization: Bearer {token}`  
Except: `POST /auth/login`, `POST /auth/register`

## Base URL
- Development: `http://localhost:3000`
- Production: `https://api.physiocore.com` (example)

## Endpoints

### Auth
- **POST** `/auth/login`  
  Body: `{ email?, phone?, password }`  
  Returns: `{ token, user }`

- **GET** `/auth/me`  
  Returns: `{ id, nameAr, role, email, phone }`

### Patients
- **GET** `/patients?search=&limit=`
- **POST** `/patients`
- **GET** `/patients/:id`
- **GET** `/patients/:id/progress` → `[{ date, recoveryScore }]`
- **GET** `/patients/:id/exercises`

### Appointments
- **GET** `/appointments?startDate=&endDate=&status=`
- **POST** `/appointments`
- **GET** `/appointments/doctor/:doctorId`
- **GET** `/appointments/patient/:patientId`
- **PATCH** `/appointments/:id/status`
- **PATCH** `/appointments/:id/rating`

### Transport
- **GET** `/transport/requests`
- **POST** `/transport/requests`
- **PATCH** `/transport/requests/:id/status`
- **PATCH** `/transport/requests/:id/assign`

### Clinical Sessions
- **GET** `/clinical-sessions?patientId=`
- **POST** `/clinical-sessions`

### Prescriptions
- **GET** `/prescriptions?patientId=&doctorId=`
- **POST** `/prescriptions`
- **GET** `/prescriptions/patient/:patientId`
- **POST** `/prescriptions/check-interactions`

### Notifications
- **GET** `/notifications?patientId=&status=`
- **POST** `/notifications/send`
- **GET** `/notifications/me`
- **GET** `/notifications/stats`

### Reports
- **GET** `/reports/stats?startDate=&endDate=`
- **GET** `/reports/recovery-trends?patientIds=`

### Vitals
- **POST** `/vitals`
- **GET** `/vitals/:patientId`
- **GET** `/vitals/:patientId/latest`

### Billing
- **GET** `/billing/invoices`
- **POST** `/billing/invoices`
- **POST** `/billing/invoices/:id/payments`
- **GET** `/billing/invoices/stats`
