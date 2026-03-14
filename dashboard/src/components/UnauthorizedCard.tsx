import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';

const BORDER = 'rgba(255,255,255,0.06)';
const RED = '#f87171';

interface UnauthorizedCardProps {
  title?: string;
  backPath?: string;
  backLabel?: string;
}

export function UnauthorizedCard({ title, backPath, backLabel }: UnauthorizedCardProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role : '—';

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border p-8 text-center"
      style={{ background: '#0b0f1a', borderColor: BORDER }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(248,113,113,0.15)' }}
      >
        <Lock className="h-8 w-8" style={{ color: RED }} />
      </div>
      <h2 className="mb-2 text-lg font-bold text-[#dde6f5]">
        {title ?? 'هذا القسم مخصص للأطباء والإدارة فقط'}
      </h2>
      <p className="mb-4 text-sm text-[#4b5875]">
        صلاحيتك: {role}
      </p>
      <button
        type="button"
        onClick={() => navigate(backPath ?? '/receptionist')}
        className="rounded-xl px-5 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10"
      >
        {backLabel ?? 'العودة لبوابة الاستقبال'}
      </button>
    </div>
  );
}

/** Use as fallback for admin-only routes so doctor/nurse/receptionist see the right message and back link */
export function UnauthorizedCardByRole() {
  const { user } = useAuth();
  if (user?.role === 'doctor') {
    return (
      <UnauthorizedCard
        title="هذا القسم للإدارة فقط"
        backPath="/doctor-portal"
        backLabel="العودة لبوابة الطبيب"
      />
    );
  }
  if (user?.role === 'nurse') {
    return (
      <UnauthorizedCard
        title="هذا القسم للأطباء والإدارة"
        backPath="/nurse-portal"
        backLabel="العودة لبوابة الممرض"
      />
    );
  }
  return <UnauthorizedCard />;
}
