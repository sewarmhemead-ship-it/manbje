import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/permissions';
import { Lock } from 'lucide-react';

const BG = '#06080e';
const BORDER = 'rgba(255,255,255,0.06)';
const RED = '#f87171';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role : '—';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}
    >
      <div
        className="flex max-w-md flex-col items-center rounded-2xl border p-8 text-center"
        style={{ background: '#0b0f1a', borderColor: BORDER }}
      >
        <div
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'rgba(248,113,113,0.15)' }}
        >
          <Lock className="h-10 w-10" style={{ color: RED }} />
        </div>
        <h1 className="mb-2 text-xl font-bold text-[#dde6f5]">
          ليس لديك صلاحية لعرض هذه الصفحة
        </h1>
        <p className="mb-6 text-sm text-[#4b5875]">
          تواصل مع المدير لطلب الصلاحية المطلوبة
        </p>
        {user && (
          <span
            className="mb-4 rounded-full px-3 py-1 text-xs"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#4b5875' }}
          >
            الدور الحالي: {role}
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl px-6 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-500/10"
        >
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
