import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/lib/toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { Placeholder } from '@/pages/Placeholder';
import { Patient360 } from '@/pages/Patient360';
import { Transport } from '@/pages/Transport';
import { Equipment } from '@/pages/Equipment';
import { AppointmentsCalendar } from '@/pages/AppointmentsCalendar';
import { PatientsList } from '@/pages/PatientsList';
import { Reports } from '@/pages/Reports';
import { Notifications } from '@/pages/Notifications';
import { Settings } from '@/pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, ready } = useAuth();
  if (!ready) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutesInner() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<AppointmentsCalendar />} />
        <Route path="patients" element={<PatientsList />} />
        <Route path="patients/:id" element={<Patient360 />} />
        <Route path="transport" element={<Transport />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        {/* TODO: Full billing page — استبدال Placeholder عند اكتمال واجهة الفوترة */}
        <Route path="billing" element={<Placeholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutesInner />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
