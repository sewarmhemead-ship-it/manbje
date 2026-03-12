import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const GREEN = '#34d399';
const CYAN = '#22d3ee';
const RED = '#f87171';
const PURPLE = '#a78bfa';
const WA_SENT = '#005c4b';
const WA_HEADER = '#0d1117';

type Channel = 'whatsapp' | 'sms' | 'app';
type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

interface NotificationRow {
  id: string;
  patientId: string;
  type: string;
  channel: Channel;
  messageAr: string;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
  patient?: { nameAr?: string };
}

interface Stats {
  sentToday: number;
  scheduled: number;
  failed: number;
  deliveryRate: number;
}

interface PatientOption {
  id: string;
  nameAr: string;
}

const TYPE_ICON: Record<string, string> = {
  appointment_reminder_24h: '📅',
  appointment_reminder_2h: '📅',
  appointment_confirmed: '✅',
  appointment_cancelled: '❌',
  transport_assigned: '🚐',
  transport_arrived: '🚐',
  exercise_reminder: '💪',
  manual: '✉️',
};

const TYPE_LABEL: Record<string, string> = {
  appointment_reminder_24h: 'تذكير موعد (24 ساعة)',
  appointment_reminder_2h: 'تذكير موعد (2 ساعة)',
  appointment_confirmed: 'تأكيد موعد',
  appointment_cancelled: 'إلغاء موعد',
  transport_assigned: 'النقل مُعيَّن',
  transport_arrived: 'وصول النقل',
  exercise_reminder: 'تذكير تمارين',
  manual: 'إرسال يدوي',
};

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return d.toLocaleDateString('ar-SY');
}

export function Notifications() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [list, setList] = useState<NotificationRow[]>([]);
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Record<string, { whatsapp?: string; sms?: string; app?: string; variables: string[] }>>({});
  const [rules, setRules] = useState([
    { id: 'reminder_24', label: 'تذكير موعد (24 ساعة)', channel: 'WhatsApp', on: true },
    { id: 'reminder_2', label: 'تذكير موعد (2 ساعة)', channel: 'SMS', on: true },
    { id: 'confirmed', label: 'تأكيد الحجز', channel: 'WhatsApp', on: true },
    { id: 'transport', label: 'المريض في الطريق', channel: 'WhatsApp', on: true },
    { id: 'exercise', label: 'تذكير التمارين', channel: 'App', on: false },
  ]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel>('whatsapp');
  const [manualVars, setManualVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const fetchStats = useCallback(() => {
    apiGet<Stats>('/notifications/stats').then(setStats).catch(() => setStats(null));
  }, []);
  const fetchList = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (channelFilter !== 'all') params.set('channel', channelFilter);
    if (statusFilter) params.set('status', statusFilter);
    apiGet<NotificationRow[]>(`/notifications?${params}`)
      .then(setList)
      .catch(() => setList([]));
  }, [channelFilter, statusFilter]);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<Stats>('/notifications/stats').then(setStats).catch(() => setStats(null)),
      apiGet<NotificationRow[]>(`/notifications?limit=50`).then(setList).catch(() => setList([])),
      apiGet<Record<string, { whatsapp?: string; sms?: string; app?: string; variables: string[] }>>('/notifications/templates').then(setTemplates).catch(() => ({})),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (channelFilter !== 'all' || statusFilter) fetchList();
  }, [channelFilter, statusFilter, fetchList]);

  useEffect(() => {
    const t = setInterval(() => {
      fetchStats();
      fetchList();
    }, 30000);
    return () => clearInterval(t);
  }, [fetchStats, fetchList]);

  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientOptions([]);
      return;
    }
    apiGet<PatientOption[]>(`/patients?search=${encodeURIComponent(patientSearch)}`)
      .then((data) => setPatientOptions(Array.isArray(data) ? data.slice(0, 10) : []))
      .catch(() => setPatientOptions([]));
  }, [patientSearch]);

  const handleRetry = (id: string) => {
    apiPatch(`/notifications/${id}/retry`, {})
      .then(() => {
        toast('✓ تم إعادة المحاولة');
        fetchList();
        fetchStats();
      })
      .catch(() => toast('فشل إعادة المحاولة'));
  };

  const handleSendManual = () => {
    if (!selectedPatientId || !selectedType) {
      toast('اختر المريض ونوع الرسالة');
      return;
    }
    setSending(true);
    apiPost(`/notifications/send`, {
      patientId: selectedPatientId,
      type: selectedType,
      channel: selectedChannel,
      vars: Object.keys(manualVars).length ? manualVars : undefined,
    })
      .then(() => {
        toast('✓ تم إرسال الإشعار');
        fetchList();
        fetchStats();
      })
      .catch((e) => toast(e?.message ?? 'فشل الإرسال'))
      .finally(() => setSending(false));
  };

  const lastThree = list.slice(0, 3);
  const typeKeys = Object.keys(templates);
  const previewText = selectedType && templates[selectedType]
    ? (templates[selectedType][selectedChannel] ?? templates[selectedType].whatsapp ?? '')
        .replace(/\{\{(\w+)\}\}/g, (_, k) => manualVars[k] ?? '')
    : '';

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <div className="border-b px-6 py-4" style={{ borderColor: BORDER, background: SURFACE }}>
        <h1 className="text-xl font-bold text-[#dde6f5]">🔔 الإشعارات</h1>
      </div>

      <div className="p-6">
        {/* Section 1 — Stats */}
        {!loading && stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
              style={{ background: SURFACE, borderColor: BORDER, borderTop: '2px solid ' + GREEN }}
            >
              <p className="text-[11px] text-[#4b5875]">أُرسلت اليوم</p>
              <p className="text-2xl font-bold" style={{ color: GREEN, fontFamily: "'Space Mono', monospace" }}>{stats.sentToday}</p>
            </div>
            <div
              className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
              style={{ background: SURFACE, borderColor: BORDER, borderTop: '2px solid ' + CYAN }}
            >
              <p className="text-[11px] text-[#4b5875]">مجدولة</p>
              <p className="text-2xl font-bold" style={{ color: CYAN, fontFamily: "'Space Mono', monospace" }}>{stats.scheduled}</p>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter((s) => (s === 'failed' ? null : 'failed'))}
              className="rounded-2xl border p-4 text-right transition-all hover:-translate-y-0.5"
              style={{ background: SURFACE, borderColor: BORDER, borderTop: '2px solid ' + RED }}
            >
              <p className="text-[11px] text-[#4b5875]">فشلت</p>
              <p className="text-2xl font-bold" style={{ color: RED, fontFamily: "'Space Mono', monospace" }}>{stats.failed}</p>
            </button>
          </div>
        )}

        {/* Section 2 — Two columns */}
        <div className="mb-8 grid gap-6 lg:grid-cols-10">
          {/* Left 60% — Log */}
          <div className="lg:col-span-6 rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="flex border-b p-2 gap-1" style={{ borderColor: BORDER }}>
              {(['all', 'whatsapp', 'sms', 'app'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`rounded-lg px-3 py-2 text-sm ${channelFilter === ch ? 'bg-cyan-500/20 text-cyan-400' : 'text-[#4b5875] hover:text-[#dde6f5]'}`}
                >
                  {ch === 'all' ? 'الكل' : ch === 'whatsapp' ? 'WhatsApp' : ch === 'sms' ? 'SMS' : 'التطبيق'}
                </button>
              ))}
            </div>
            <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {loading ? (
                <div className="flex items-center justify-center p-8 text-[#4b5875]">جاري التحميل...</div>
              ) : list.length === 0 ? (
                <div className="p-8 text-center text-[#4b5875]">لا توجد إشعارات</div>
              ) : (
                list.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-wrap items-center gap-2 border-b px-4 py-3 hover:bg-white/[0.02]"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <span className="text-lg">{TYPE_ICON[n.type] ?? '✉️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#dde6f5]">
                        {n.patient?.nameAr ?? '—'} · {TYPE_LABEL[n.type] ?? n.type}
                      </p>
                      <p className="truncate text-xs text-[#4b5875]" style={{ maxWidth: 280 }}>
                        {n.messageAr.slice(0, 60)}{n.messageAr.length > 60 ? '…' : ''}
                      </p>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-[10px]"
                      style={{
                        background: n.channel === 'whatsapp' ? 'rgba(37,211,102,0.12)' : n.channel === 'sms' ? 'rgba(34,211,238,0.10)' : 'rgba(167,139,250,0.10)',
                        color: n.channel === 'whatsapp' ? '#25d366' : n.channel === 'sms' ? CYAN : PURPLE,
                      }}
                    >
                      {n.channel === 'whatsapp' ? 'WhatsApp' : n.channel === 'sms' ? 'SMS' : 'App'}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] ${n.status === 'sent' || n.status === 'delivered' ? 'text-green-400' : n.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                      {n.status === 'sent' || n.status === 'delivered' ? '✓ تم' : n.status === 'failed' ? '✗ فشل' : '⏳ معلق'}
                    </span>
                    <span className="text-[10px] text-[#4b5875]" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {relativeTime(n.sentAt ?? n.createdAt)}
                    </span>
                    {n.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(n.id)}
                        className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
                      >
                        إعادة المحاولة
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right 40% — WhatsApp preview + Rules + Manual send */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* WhatsApp Preview */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
              <div className="px-4 py-3 text-center text-sm font-medium text-white" style={{ background: WA_HEADER }}>
                مركز العلاج الفيزيائي
              </div>
              <div className="space-y-2 p-3" style={{ background: '#0d1117', minHeight: 160 }}>
                {lastThree.length === 0 ? (
                  <p className="text-center text-xs text-[#4b5875]">لا توجد رسائل لعرضها</p>
                ) : (
                  lastThree.map((n) => (
                    <div
                      key={n.id}
                      className="ml-auto max-w-[85%] rounded-lg px-3 py-2 text-right text-sm text-white"
                      style={{ background: WA_SENT }}
                    >
                      {n.messageAr.slice(0, 120)}{n.messageAr.length > 120 ? '…' : ''}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
              <h3 className="mb-3 text-sm font-medium text-[#dde6f5]">قواعد الإشعارات</h3>
              <div className="space-y-2">
                {rules.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#dde6f5]">{r.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#4b5875]">{r.channel}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.on}
                        onClick={() => setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))}
                        className={`relative h-6 w-10 rounded-full transition-colors ${r.on ? 'bg-cyan-500' : 'bg-white/10'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${r.on ? 'left-5' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toast('تم حفظ القواعد (واجهة فقط)')}
                className="mt-3 w-full rounded-xl border py-2 text-sm text-[#dde6f5] hover:bg-white/5"
                style={{ borderColor: BORDER }}
              >
                حفظ
              </button>
            </div>

            {/* Manual Send */}
            <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
              <h3 className="mb-3 text-sm font-medium text-[#dde6f5]">إرسال يدوي</h3>
              <input
                type="text"
                placeholder="بحث عن مريض..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="mb-2 w-full rounded-lg border bg-[#101622] px-3 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              />
              {patientOptions.length > 0 && (
                <ul className="mb-2 max-h-32 overflow-y-auto rounded-lg border" style={{ borderColor: BORDER }}>
                  {patientOptions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(p.nameAr);
                          setPatientOptions([]);
                        }}
                        className="w-full px-3 py-2 text-right text-sm text-[#dde6f5] hover:bg-white/5"
                      >
                        {p.nameAr}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="mb-2 w-full rounded-lg border bg-[#101622] px-3 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              >
                <option value="">نوع الرسالة</option>
                {typeKeys.map((k) => (
                  <option key={k} value={k}>{TYPE_LABEL[k] ?? k}</option>
                ))}
              </select>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value as Channel)}
                className="mb-2 w-full rounded-lg border bg-[#101622] px-3 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="app">التطبيق</option>
              </select>
              {selectedType && templates[selectedType]?.variables?.length > 0 && (
                <div className="mb-2 space-y-1">
                  {templates[selectedType].variables.map((v) => (
                    <input
                      key={v}
                      type="text"
                      placeholder={v}
                      value={manualVars[v] ?? ''}
                      onChange={(e) => setManualVars((prev) => ({ ...prev, [v]: e.target.value }))}
                      className="w-full rounded border bg-[#101622] px-2 py-1 text-xs text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                  ))}
                </div>
              )}
              <div className="mb-3 rounded-lg border p-2 text-xs text-[#4b5875]" style={{ borderColor: BORDER, minHeight: 48 }}>
                {previewText ? previewText.slice(0, 200) + (previewText.length > 200 ? '…' : '') : 'معاينة...'}
              </div>
              <button
                type="button"
                disabled={sending || !selectedPatientId || !selectedType}
                onClick={handleSendManual}
                className="w-full rounded-xl bg-cyan-500/20 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
              >
                {sending ? 'جاري الإرسال...' : 'إرسال'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3 — Templates */}
        <div className="rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
          <h3 className="mb-4 text-base font-medium text-[#dde6f5]">قوالب الإشعارات</h3>
          <div className="space-y-4">
            {Object.entries(templates).map(([name, t]) => (
              <div key={name} className="rounded-xl border p-4" style={{ borderColor: BORDER }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-[#dde6f5]">{TYPE_LABEL[name] ?? name}</span>
                  <button type="button" className="text-xs text-cyan-400 hover:underline">تعديل</button>
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {t.whatsapp && (
                    <div className="flex-1 min-w-[200px] rounded-lg bg-white/5 p-2 text-xs text-[#4b5875]">
                      <span className="text-[10px] text-[#4b5875]">WhatsApp:</span>
                      <p className="mt-1 text-[#dde6f5]">{t.whatsapp.slice(0, 150)}{t.whatsapp.length > 150 ? '…' : ''}</p>
                    </div>
                  )}
                  {t.sms && (
                    <div className="flex-1 min-w-[200px] rounded-lg bg-white/5 p-2 text-xs text-[#4b5875]">
                      <span className="text-[10px] text-[#4b5875]">SMS:</span>
                      <p className="mt-1 text-[#dde6f5]">{t.sms.slice(0, 150)}{t.sms.length > 150 ? '…' : ''}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.variables?.map((v) => (
                    <span key={v} className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-[#4b5875]">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
