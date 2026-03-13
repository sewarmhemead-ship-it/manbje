import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/lib/toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
import { Prescriptions } from '@/pages/Prescriptions';
import { Settings } from '@/pages/Settings';
import { Users } from '@/pages/Users';
import { DriverPortal } from '@/pages/DriverPortal';
import { ReceptionistPortal } from '@/pages/ReceptionistPortal';

function AuthGate({ children, allowDriver }: { children: React.ReactNode; allowDriver?: boolean }) {
  const { token, user, ready } = useAuth();
  if (!ready) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!allowDriver && user.role === 'driver') return <Navigate to="/driver-portal" replace />;
  return <>{children}</>;
}

function AppRoutesInner() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/driver-portal" element={<AuthGate allowDriver><DriverPortal /></AuthGate>} />
      <Route
        path="/"
        element={
          <AuthGate>
            <MainLayout />
          </AuthGate>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<ProtectedRoute permission="appointments_view"><AppointmentsCalendar /></ProtectedRoute>} />
        <Route path="patients" element={<ProtectedRoute permission="patients_view"><PatientsList /></ProtectedRoute>} />
        <Route path="patients/:id" element={<ProtectedRoute permission="patients_view"><Patient360 /></ProtectedRoute>} />
        <Route path="transport" element={<ProtectedRoute permission="transport_view"><Transport /></ProtectedRoute>} />
        <Route path="equipment" element={<ProtectedRoute permission="patients_view"><Equipment /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute permission="reports_view"><Reports /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute permission="notifications_view"><Notifications /></ProtectedRoute>} />
        <Route path="prescriptions" element={<ProtectedRoute permission="prescriptions_view"><Prescriptions /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute permission="billing_view"><Placeholder /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="users_view"><Users /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute permission="settings_view"><Settings /></ProtectedRoute>} />
        <Route path="receptionist" element={<ProtectedRoute permission="receptionist_portal"><ReceptionistPortal /></ProtectedRoute>} />
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
