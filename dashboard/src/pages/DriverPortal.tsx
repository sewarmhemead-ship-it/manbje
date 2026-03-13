import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Loader2, LogOut } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';

interface Trip {
  id: string;
  status: string;
  pickupAddress?: string;
  pickupTime?: string;
  patient?: { nameAr?: string; user?: { nameAr?: string } };
  appointmentId?: string;
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'مطلوب',
  assigned: 'مسند',
  en_route: 'في الطريق',
  arrived_at_center: 'وصلنا للمركز',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};

export function DriverPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiGet<Trip[]>('/transport/requests')
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/transport/requests/${id}/status`, { status });
      toast('✓ تم تحديث الحالة');
      load();
    } catch {
      toast('فشل التحديث');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayTrips = trips.filter((t) => (t as { createdAt?: string }).createdAt?.startsWith?.(today) || (t as { pickupTime?: string }).pickupTime?.startsWith?.(today));

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3"
        style={{ background: SURFACE, borderColor: BORDER }}
      >
        <div className="flex items-center gap-2">
          <Truck className="h-8 w-8" style={{ color: CYAN }} />
          <span className="text-lg font-bold text-[#dde6f5]">رحلاتي اليوم</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#4b5875]">{user?.nameAr ?? user?.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-xl border px-3 py-2 text-sm text-[#dde6f5] hover:bg-white/5"
            style={{ borderColor: BORDER }}
          >
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: CYAN }} />
          </div>
        ) : todayTrips.length === 0 ? (
          <div className="rounded-2xl border py-12 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[#4b5875]">لا توجد رحلات مسندة إليك اليوم</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTrips.map((trip) => {
              const patientName = trip.patient?.nameAr ?? trip.patient?.user?.nameAr ?? '—';
              const status = trip.status;
              const canEnRoute = status === 'assigned';
              const canArrived = status === 'en_route' || status === 'assigned';
              const isDone = String(status) === 'arrived_at_center' || String(status) === 'completed';
              return (
                <div
                  key={trip.id}
                  className="rounded-2xl border p-4"
                  style={{ background: SURFACE, borderColor: BORDER }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-bold text-[#dde6f5]">{patientName}</span>
                    <span
                      className="rounded-full px-3 py-1 text-xs"
                      style={{
                        background: isDone ? 'rgba(52,211,153,0.2)' : 'rgba(34,211,238,0.2)',
                        color: isDone ? '#34d399' : CYAN,
                      }}
                    >
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                  <p className="mb-1 text-sm text-[#4b5875]">عنوان الاستلام: {trip.pickupAddress ?? '—'}</p>
                  <p className="mb-4 text-sm text-[#4b5875]">
                    الوقت: {trip.pickupTime ? new Date(trip.pickupTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canEnRoute && (
                      <button
                        type="button"
                        onClick={() => updateStatus(trip.id, 'en_route')}
                        className="rounded-xl bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-500/30"
                      >
                        في الطريق
                      </button>
                    )}
                    {canArrived && (
                      <button
                        type="button"
                        onClick={() => updateStatus(trip.id, 'arrived_at_center')}
                        className="rounded-xl bg-green-500/20 px-4 py-3 text-sm font-medium text-green-400 hover:bg-green-500/30"
                      >
                        وصلنا للمركز
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
