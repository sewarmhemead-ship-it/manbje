# PT Center — Admin Dashboard

World-class admin dashboard for the physical therapy center. Built with **React (Vite)**, **Tailwind CSS**, **Shadcn-style UI**, and **Lucide Icons**.

## Features

- **Layout:** Modern sidebar (Dashboard, Appointments, Patients, Transport, Equipment, Settings) and top bar with global search and current user role.
- **Command Center (Home):** 4 stats cards (Today's Appointments, Patients in Transit, Active Sessions, Weekly Revenue), Live Status table (center transport vs self-arrival), Quick Actions (New Appointment, Add Patient, Assign Transport).
- **Integration:** Connected to NestJS API; auth via JWT; responsive design; Plus Jakarta Sans font and smooth transitions.

## Setup

```bash
cd dashboard
cp .env.example .env
# Set VITE_API_URL to your backend URL (e.g. http://localhost:3000)
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Log in with a user from the backend (e.g. after `POST /auth/register` or `POST /auth/login`).

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3
- Shadcn-style components (Button, Card, Input, Badge)
- Lucide React
- React Router DOM
