import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '@/lib/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const MUTED = '#4b5875';
const TEXT = '#dde6f5';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user?: { nameAr?: string; email?: string };
}

export function AuditLogPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const data = await apiGet<AuditEntry[]>('/audit-log?limit=100');
      setList(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && list.length === 0) {
    return (
      <div className="space-y-4" style={{ background: '#06080e' }}>
        <h1 className="text-2xl font-bold" style={{ color: TEXT }}>{t('nav.auditLog')}</h1>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" style={{ background: '#06080e' }}>
        <h1 className="text-2xl font-bold" style={{ color: TEXT }}>{t('nav.auditLog')}</h1>
        <ErrorState title={t('dashboard.errorLoading')} onRetry={load} retryLabel={t('dashboard.retry')} />
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ background: '#06080e' }}>
      <h1 className="text-2xl font-bold" style={{ color: TEXT }}>{t('nav.auditLog')}</h1>
      <div className="overflow-x-auto rounded-xl border" style={{ background: SURFACE, borderColor: BORDER }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: BORDER, color: MUTED }}>
              <th className="px-4 py-3 text-right font-medium">الوقت</th>
              <th className="px-4 py-3 text-right font-medium">المستخدم</th>
              <th className="px-4 py-3 text-right font-medium">الإجراء</th>
              <th className="px-4 py-3 text-right font-medium">النوع</th>
              <th className="px-4 py-3 text-right font-medium">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: MUTED }}>
                  لا توجد سجلات
                </td>
              </tr>
            ) : (
              list.map((entry) => (
                <tr key={entry.id} className="border-b" style={{ borderColor: BORDER }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: MUTED }}>
                    {new Date(entry.createdAt).toLocaleString('ar-SA')}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>
                    {entry.user?.nameAr ?? entry.user?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{entry.action}</td>
                  <td className="px-4 py-3" style={{ color: MUTED }}>{entry.entityType}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: MUTED }}>
                    {entry.details ? JSON.stringify(entry.details) : entry.entityId ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
