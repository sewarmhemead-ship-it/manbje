import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Eye, Printer, X, Loader2 } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const RED = '#f87171';
const PURPLE = '#a78bfa';
const AMBER = '#fbbf24';
const MUTED = '#4b5875';

const CATEGORY_COLORS: Record<string, string> = {
  analgesic: '#f87171',
  anti_inflammatory: '#22d3ee',
  muscle_relaxant: '#a78bfa',
  corticosteroid: '#fbbf24',
  vitamin: '#34d399',
  other: MUTED,
  antibiotic: '#34d399',
};

const CATEGORY_LABELS: Record<string, string> = {
  analgesic: 'مسكنات',
  anti_inflammatory: 'مضادات التهاب',
  muscle_relaxant: 'مرخيات عضل',
  corticosteroid: 'كورتيزون',
  vitamin: 'فيتامينات',
  other: 'أخرى',
  antibiotic: 'مضاد حيوي',
};

const FORM_ICONS: Record<string, string> = {
  tablet: '💊',
  injection: '💉',
  cream: '🩹',
  syrup: '🧴',
  patch: '🩹',
  inhaler: '💨',
  other: '💊',
};

const FREQUENCY_OPTIONS = [
  'مرة يومياً',
  'مرتين يومياً',
  'ثلاث مرات',
  'كل 8 ساعات',
  'كل 12 ساعة',
  'عند الحاجة',
];

const TIMING_OPTIONS = [
  'مع الأكل',
  'قبل الأكل',
  'بعد الأكل',
  'قبل النوم',
  'على معدة فارغة',
];

const STATUS_LABELS: Record<string, string> = {
  active: 'نشطة',
  dispensed: 'صُرفت',
  expired: 'منتهية',
  cancelled: 'ملغاة',
};

const STATUS_BORDER: Record<string, string> = {
  active: CYAN,
  dispensed: GREEN,
  expired: AMBER,
  cancelled: RED,
};

interface Drug {
  id: string;
  nameAr: string;
  nameEn: string;
  defaultDose: number;
  doseUnit: string;
  form: string;
  category: string;
  isActive?: boolean;
}

interface PrescriptionItem {
  id: string;
  drugId: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  durationDays: number;
  timing?: string | null;
  notes?: string | null;
  drug?: Drug;
}

interface Prescription {
  id: string;
  rxNumber: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  diagnosis?: string | null;
  instructions?: string | null;
  notes?: string | null;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
  patient?: { id: string; nameAr?: string };
  doctor?: { id: string; nameAr?: string | null };
  items?: PrescriptionItem[];
}

interface RxStats {
  totalThisMonth: number;
  activePrescriptions: number;
  mostPrescribedDrug: string;
  interactionWarnings: number;
}

interface PatientOption {
  id: string;
  nameAr: string;
}

interface NewRxItem {
  drugId: string;
  drug?: Drug | null;
  dose: number;
  doseUnit: string;
  frequency: string;
  durationDays: number;
  timing: string;
  notes: string;
}

export function Prescriptions() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState<RxStats | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [drugSearch, setDrugSearch] = useState('');
  const [drugCategoryFilter, setDrugCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newRxOpen, setNewRxOpen] = useState(false);
  const [detailRx, setDetailRx] = useState<Prescription | null>(null);
  const [addDrugOpen, setAddDrugOpen] = useState(false);
  const [initialPatientForNewRx, setInitialPatientForNewRx] = useState<{ id: string; nameAr: string } | null>(null);
  const [cancelConfirmRx, setCancelConfirmRx] = useState<Prescription | null>(null);

  useEffect(() => {
    const state = location.state as { openRx?: boolean; patientId?: string; patientName?: string } | null;
    if (state?.openRx) {
      setNewRxOpen(true);
      if (state.patientId) setInitialPatientForNewRx({ id: state.patientId, nameAr: state.patientName ?? '' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const fetchStats = useCallback(() => {
    apiGet<RxStats>('/prescriptions/stats').then(setStats).catch(() => setStats(null));
  }, []);
  const fetchPrescriptions = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (statusFilter) params.set('status', statusFilter);
    apiGet<Prescription[]>(`/prescriptions?${params}`)
      .then((data) => setPrescriptions(Array.isArray(data) ? data : []))
      .catch(() => setPrescriptions([]));
  }, [statusFilter]);
  const fetchDrugs = useCallback(() => {
    const params = new URLSearchParams();
    if (drugSearch.trim()) params.set('search', drugSearch.trim());
    if (drugCategoryFilter) params.set('category', drugCategoryFilter);
    apiGet<Drug[]>(`/drugs?${params}`)
      .then((data) => setDrugs(Array.isArray(data) ? data : []))
      .catch(() => setDrugs([]));
  }, [drugSearch, drugCategoryFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<RxStats>('/prescriptions/stats').then(setStats).catch(() => setStats(null)),
      apiGet<Prescription[]>('/prescriptions?limit=100').then((d) => setPrescriptions(Array.isArray(d) ? d : [])).catch(() => setPrescriptions([])),
      apiGet<Drug[]>('/drugs').then((d) => setDrugs(Array.isArray(d) ? d : [])).catch(() => setDrugs([])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchPrescriptions();
  }, [statusFilter, loading, fetchPrescriptions]);

  const filteredPrescriptions = patientSearch.trim()
    ? prescriptions.filter((rx) => (rx.patient?.nameAr ?? '').toLowerCase().includes(patientSearch.trim().toLowerCase()))
    : prescriptions;
  useEffect(() => {
    if (!loading) fetchDrugs();
  }, [drugSearch, drugCategoryFilter, loading, fetchDrugs]);

  const handleCancelRx = (rx: Prescription) => {
    setCancelConfirmRx(rx);
  };
  const confirmCancelRx = () => {
    const rx = cancelConfirmRx;
    if (!rx) return;
    apiPatch(`/prescriptions/${rx.id}/status`, { status: 'cancelled' })
      .then(() => {
        (toast as { success?: (a: string) => void }).success?.('تم إلغاء الوصفة') ?? toast('✓ تم إلغاء الوصفة');
        fetchPrescriptions();
        fetchStats();
        if (detailRx?.id === rx.id) setDetailRx(null);
      })
      .catch(() => (toast as { error?: (a: string) => void }).error?.('فشل الإلغاء') ?? toast('فشل الإلغاء'));
    setCancelConfirmRx(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <div
        className="border-b px-6 py-4"
        style={{
          borderColor: BORDER,
          background: SURFACE,
          backgroundImage: 'radial-gradient(ellipse at top right, rgba(167,139,250,0.08) 0%, transparent 50%)',
        }}
      >
        <h1 className="text-xl font-bold text-[#dde6f5]">💊 الوصفات والأدوية</h1>
      </div>

      <div className="p-6">
        {/* Stats row */}
        {!loading && stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
              style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${PURPLE}` }}
            >
              <p className="text-[11px] text-[#4b5875]">وصفة هذا الشهر</p>
              <p className="text-2xl font-bold" style={{ color: PURPLE, fontFamily: "'Space Mono', monospace" }}>
                {stats.totalThisMonth}
              </p>
            </div>
            <div
              className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
              style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${GREEN}` }}
            >
              <p className="text-[11px] text-[#4b5875]">أدوية بالمكتبة</p>
              <p className="text-2xl font-bold" style={{ color: GREEN, fontFamily: "'Space Mono', monospace" }}>
                {drugs.length}
              </p>
            </div>
            <div
              className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
              style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${RED}` }}
            >
              <p className="text-[11px] text-[#4b5875]">تحذيرات تفاعل</p>
              <p className="text-2xl font-bold" style={{ color: RED, fontFamily: "'Space Mono', monospace" }}>
                {stats.interactionWarnings ?? 0}
              </p>
            </div>
          </div>
        )}

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[65%_1fr]">
          {/* Left — Prescriptions list */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="flex flex-wrap items-center gap-2 border-b p-3" style={{ borderColor: BORDER }}>
              {['', 'active', 'dispensed', 'expired', 'cancelled'].map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-2 text-sm ${!statusFilter && !s ? 'bg-cyan-500/20 text-cyan-400' : statusFilter === s ? 'bg-cyan-500/20 text-cyan-400' : 'text-[#4b5875] hover:text-[#dde6f5]'}`}
                >
                  {s ? STATUS_LABELS[s] ?? s : 'الكل'}
                </button>
              ))}
              <input
                type="text"
                placeholder="بحث باسم المريض..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="mr-auto rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] w-40"
                style={{ borderColor: BORDER }}
              />
              <button
                type="button"
                onClick={() => setNewRxOpen(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/10"
              >
                <Plus className="h-4 w-4" /> وصفة جديدة
              </button>
            </div>
            <div className="max-h-[480px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <EmptyState icon="💊" title="لا وصفات نشطة" />
              ) : (
                filteredPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex flex-wrap items-center gap-3 border-b px-4 py-3 hover:bg-white/[0.02]"
                    style={{
                      borderColor: 'rgba(255,255,255,0.04)',
                      borderRight: `2px solid ${STATUS_BORDER[rx.status] ?? BORDER}`,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#dde6f5]" style={{ fontFamily: "'Space Mono', monospace", color: CYAN }}>
                        {rx.rxNumber}
                      </p>
                      <p className="text-xs text-[#4b5875]">
                        {new Date(rx.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                      <p className="text-sm font-medium text-[#dde6f5]">
                        {rx.patient?.nameAr ?? '—'} · د. {rx.doctor?.nameAr ?? '—'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(rx.items ?? []).slice(0, 5).map((it) => (
                          <span
                            key={it.id}
                            className="rounded-full px-2 py-0.5 text-[10px]"
                            style={{ background: 'rgba(167,139,250,0.2)', color: PURPLE }}
                          >
                            {it.drug?.nameAr ?? '—'}
                          </span>
                        ))}
                        {(rx.items?.length ?? 0) > 5 && (
                          <span className="text-[10px] text-[#4b5875]">+{(rx.items?.length ?? 0) - 5}</span>
                        )}
                      </div>
                      <span
                        className="mt-1 inline-block rounded px-2 py-0.5 text-[10px]"
                        style={{
                          background: `${STATUS_BORDER[rx.status] ?? MUTED}22`,
                          color: STATUS_BORDER[rx.status] ?? MUTED,
                        }}
                      >
                        {STATUS_LABELS[rx.status] ?? rx.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailRx(rx)}
                        className="rounded-lg p-2 text-cyan-400 hover:bg-cyan-500/10"
                        title="عرض"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDetailRx(rx); setTimeout(handlePrint, 200); }}
                        className="rounded-lg p-2 text-[#dde6f5] hover:bg-white/10"
                        title="طباعة"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {rx.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleCancelRx(rx)}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                          title="إلغاء"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right — Drug library */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="border-b p-3" style={{ borderColor: BORDER }}>
              <input
                type="text"
                placeholder="بحث دواء..."
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                className="mb-2 w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              />
              <div className="flex flex-wrap gap-1">
                {['', 'analgesic', 'anti_inflammatory', 'muscle_relaxant', 'corticosteroid', 'vitamin'].map((c) => (
                  <button
                    key={c || 'all'}
                    type="button"
                    onClick={() => setDrugCategoryFilter(c)}
                    className={`rounded-full px-2.5 py-1 text-xs ${!drugCategoryFilter && !c ? 'bg-cyan-500/20 text-cyan-400' : drugCategoryFilter === c ? 'bg-cyan-500/20 text-cyan-400' : 'text-[#4b5875] hover:text-[#dde6f5]'}`}
                  >
                    {c ? CATEGORY_LABELS[c] ?? c : 'الكل'}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAddDrugOpen(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm text-cyan-400 hover:bg-cyan-500/10"
                  style={{ borderColor: BORDER }}
                >
                  <Plus className="h-4 w-4" /> دواء جديد
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {drugs.filter((d) => d.isActive !== false).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 border-b px-3 py-2 hover:bg-white/[0.02]"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-lg">{FORM_ICONS[d.form] ?? '💊'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#dde6f5]">{d.nameAr}</p>
                    <p className="text-[10px] text-[#4b5875]">
                      {d.defaultDose} {d.doseUnit} · {d.form}
                    </p>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-[10px]"
                    style={{
                      background: `${CATEGORY_COLORS[d.category] ?? MUTED}22`,
                      color: CATEGORY_COLORS[d.category] ?? MUTED,
                    }}
                  >
                    {CATEGORY_LABELS[d.category] ?? d.category}
                  </span>
                </div>
              ))}
              {drugs.length === 0 && !loading && (
                <div className="p-6 text-center text-[#4b5875]">لا توجد أدوية. شغّل البذرة: npm run db:seed-drugs</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Rx Modal */}
      {newRxOpen && (
        <NewRxModal
          onClose={() => { setNewRxOpen(false); setInitialPatientForNewRx(null); }}
          onSuccess={() => {
            setNewRxOpen(false);
            setInitialPatientForNewRx(null);
            fetchPrescriptions();
            fetchStats();
            fetchDrugs();
          }}
          toast={toast}
          initialPatientId={initialPatientForNewRx?.id}
          initialPatientName={initialPatientForNewRx?.nameAr}
        />
      )}

      {/* Rx Detail Modal (with print area) */}
      {detailRx && (
        <RxDetailModal
          prescription={detailRx}
          onClose={() => setDetailRx(null)}
          onPrint={handlePrint}
        />
      )}

      <ConfirmDialog
        isOpen={!!cancelConfirmRx}
        title="إلغاء الوصفة"
        message="هل تريد إلغاء هذه الوصفة؟"
        confirmLabel="إلغاء الوصفة"
        confirmVariant="danger"
        onConfirm={confirmCancelRx}
        onCancel={() => setCancelConfirmRx(null)}
      />

      {/* Add Drug Modal (Admin) */}
      {addDrugOpen && isAdmin && (
        <AddDrugModal
          onClose={() => setAddDrugOpen(false)}
          onSuccess={() => {
            setAddDrugOpen(false);
            fetchDrugs();
          }}
          toast={toast}
        />
      )}
    </div>
  );
}

function NewRxModal({
  onClose,
  onSuccess,
  toast,
  initialPatientId,
  initialPatientName,
}: {
  onClose: () => void;
  onSuccess: () => void;
  toast: (m: string) => void;
  initialPatientId?: string;
  initialPatientName?: string;
}) {
  const { user } = useAuth();
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? '');
  const [selectedPatientName, setSelectedPatientName] = useState(initialPatientName ?? '');
  useEffect(() => {
    if (initialPatientId) setSelectedPatientId(initialPatientId);
    if (initialPatientName != null) setSelectedPatientName(initialPatientName);
  }, [initialPatientId, initialPatientName]);
  const [appointmentId, setAppointmentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewRxItem[]>([
    { drugId: '', dose: 0, doseUnit: 'mg', frequency: FREQUENCY_OPTIONS[0], durationDays: 7, timing: '', notes: '' },
  ]);
  const [interactionWarnings, setInteractionWarnings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [drugSearchOpen, setDrugSearchOpen] = useState<number | null>(null);
  const [drugSearchQuery, setDrugSearchQuery] = useState('');
  const [drugOptions, setDrugOptions] = useState<Drug[]>([]);

  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientOptions([]);
      return;
    }
    apiGet<PatientOption[]>(`/patients?search=${encodeURIComponent(patientSearch)}`)
      .then((data) => setPatientOptions(Array.isArray(data) ? data.slice(0, 10) : []))
      .catch(() => setPatientOptions([]));
  }, [patientSearch]);

  useEffect(() => {
    if (drugSearchOpen === null || !drugSearchQuery.trim()) {
      setDrugOptions([]);
      return;
    }
    apiGet<Drug[]>(`/drugs?search=${encodeURIComponent(drugSearchQuery)}`)
      .then((data) => setDrugOptions(Array.isArray(data) ? data : []))
      .catch(() => setDrugOptions([]));
  }, [drugSearchOpen, drugSearchQuery]);

  useEffect(() => {
    const ids = items.map((i) => i.drugId).filter(Boolean);
    if (ids.length < 2) {
      setInteractionWarnings([]);
      return;
    }
    apiPost<string[]>('/prescriptions/check-interactions', { drugIds: ids })
      .then((w) => setInteractionWarnings(Array.isArray(w) ? w : []))
      .catch(() => setInteractionWarnings([]));
  }, [items.map((i) => i.drugId).join(',')]);

  const addItem = () => {
    if (items.length >= 10) return;
    setItems((prev) => [...prev, { drugId: '', dose: 0, doseUnit: 'mg', frequency: FREQUENCY_OPTIONS[0], durationDays: 7, timing: '', notes: '' }]);
  };
  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };
  const setItem = (idx: number, patch: Partial<NewRxItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const selectDrug = (idx: number, drug: Drug) => {
    setItem(idx, {
      drugId: drug.id,
      drug,
      dose: Number(drug.defaultDose),
      doseUnit: drug.doseUnit,
    });
    setDrugSearchOpen(null);
    setDrugSearchQuery('');
  };

  const handleSubmit = () => {
    if (!selectedPatientId || !user?.id) {
      toast('اختر المريض');
      return;
    }
    const validItems = items.filter((i) => i.drugId && i.dose > 0 && i.durationDays > 0);
    if (validItems.length === 0) {
      toast('أضف دواء واحد على الأقل');
      return;
    }
    setSubmitting(true);
    apiPost<Prescription>('/prescriptions', {
      patientId: selectedPatientId,
      appointmentId: appointmentId || undefined,
      diagnosis: diagnosis || undefined,
      instructions: instructions || undefined,
      notes: notes || undefined,
      items: validItems.map((i) => ({
        drugId: i.drugId,
        dose: i.dose,
        doseUnit: i.doseUnit,
        frequency: i.frequency,
        durationDays: i.durationDays,
        timing: i.timing || undefined,
        notes: i.notes || undefined,
      })),
    })
      .then((rx) => {
        toast(`✓ تم إنشاء الوصفة ${rx.rxNumber}`);
        onSuccess();
      })
      .catch((e) => toast(e?.message ?? 'فشل إنشاء الوصفة'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6"
        style={{ background: SURFACE, borderColor: BORDER }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#dde6f5]">وصفة جديدة</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#4b5875] hover:bg-white/10 hover:text-[#dde6f5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">المريض</label>
            <input
              type="text"
              placeholder="بحث عن مريض..."
              value={drugSearchOpen !== null ? '' : (selectedPatientId ? selectedPatientName : patientSearch)}
              onChange={(e) => {
                if (selectedPatientId) {
                  setSelectedPatientId('');
                  setSelectedPatientName('');
                }
                setPatientSearch(e.target.value);
              }}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
            {patientOptions.length > 0 && !selectedPatientId && (
              <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg border" style={{ borderColor: BORDER }}>
                {patientOptions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setSelectedPatientName(p.nameAr);
                        setPatientSearch('');
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
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">معرف الموعد (اختياري)</label>
            <input
              type="text"
              placeholder="appointmentId"
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">التشخيص</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[#4b5875]">الأدوية</span>
              <button
                type="button"
                onClick={addItem}
                disabled={items.length >= 10}
                className="text-sm text-cyan-400 hover:underline disabled:opacity-50"
              >
                + إضافة دواء
              </button>
            </div>
            {interactionWarnings.length > 0 && (
              <div
                className="mb-3 flex items-start gap-2 rounded-lg border p-3 text-sm"
                style={{ background: 'rgba(251,191,36,0.1)', borderColor: AMBER }}
              >
                <span>⚠️</span>
                <ul className="list-disc list-inside text-amber-400" style={{ direction: 'rtl' }}>
                  {interactionWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border p-3"
                  style={{ borderColor: BORDER }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[#4b5875]">دواء {idx + 1}</span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-xs text-red-400 hover:underline">
                        إزالة
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="بحث دواء..."
                        value={drugSearchOpen === idx ? drugSearchQuery : (it.drug?.nameAr ?? '')}
                        onFocus={() => setDrugSearchOpen(idx)}
                        onChange={(e) => setDrugSearchQuery(e.target.value)}
                        className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                        style={{ borderColor: BORDER }}
                      />
                      {drugSearchOpen === idx && drugOptions.length > 0 && (
                        <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border" style={{ borderColor: BORDER }}>
                          {drugOptions.map((d) => (
                            <li key={d.id}>
                              <button
                                type="button"
                                onClick={() => selectDrug(idx, d)}
                                className="w-full px-3 py-2 text-right text-sm text-[#dde6f5] hover:bg-white/5"
                              >
                                {d.nameAr} — {d.defaultDose} {d.doseUnit}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder="الجرعة"
                      value={it.dose || ''}
                      onChange={(e) => setItem(idx, { dose: Number(e.target.value) || 0 })}
                      className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                    <input
                      type="text"
                      placeholder="الوحدة"
                      value={it.doseUnit}
                      onChange={(e) => setItem(idx, { doseUnit: e.target.value })}
                      className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                    <select
                      value={it.frequency}
                      onChange={(e) => setItem(idx, { frequency: e.target.value })}
                      className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="المدة (يوم)"
                      value={it.durationDays || ''}
                      onChange={(e) => setItem(idx, { durationDays: Number(e.target.value) || 0 })}
                      className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                      style={{ borderColor: BORDER }}
                    />
                    <select
                      value={it.timing}
                      onChange={(e) => setItem(idx, { timing: e.target.value })}
                      className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] sm:col-span-2"
                      style={{ borderColor: BORDER }}
                    >
                      <option value="">— توقيت —</option>
                      {TIMING_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="ملاحظات السطر"
                      value={it.notes}
                      onChange={(e) => setItem(idx, { notes: e.target.value })}
                      className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] sm:col-span-2"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">التعليمات</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            إنشاء الوصفة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border py-3 px-4 text-sm text-[#dde6f5] hover:bg-white/5"
            style={{ borderColor: BORDER }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function RxDetailModal({ prescription, onClose, onPrint }: { prescription: Prescription; onClose: () => void; onPrint: () => void }) {
  const patientName = prescription.patient?.nameAr ?? '—';
  const doctorName = prescription.doctor?.nameAr ?? '—';
  const createdAt = prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString('ar-SA') : '—';
  const expiresAt = prescription.expiresAt ? new Date(prescription.expiresAt).toLocaleDateString('ar-SA') : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ fontFamily: "'Space Mono', monospace", color: CYAN }}>
              {prescription.rxNumber}
            </span>
            <span
              className="rounded px-2 py-0.5 text-xs"
              style={{
                background: `${STATUS_BORDER[prescription.status] ?? MUTED}22`,
                color: STATUS_BORDER[prescription.status] ?? MUTED,
              }}
            >
              {STATUS_LABELS[prescription.status] ?? prescription.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 hover:bg-cyan-500/30"
            >
              <Printer className="h-4 w-4" /> طباعة الوصفة
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#4b5875] hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="rx-print-area rounded-xl border p-6" style={{ borderColor: BORDER, background: '#0f1420' }}>
          <div className="text-center mb-4">
            <p className="text-lg font-bold text-[#dde6f5]">🏥 مركز العلاج الفيزيائي</p>
            <p className="text-sm text-[#4b5875]">هاتف: — | العنوان —</p>
            <p className="mt-2 text-2xl" style={{ color: CYAN }}>℞</p>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <p className="text-[#4b5875]">المريض:</p>
            <p className="font-medium text-[#dde6f5]">{patientName}</p>
            <p className="text-[#4b5875]">التاريخ:</p>
            <p className="font-medium text-[#dde6f5]">{createdAt}</p>
            <p className="text-[#4b5875]">الطبيب:</p>
            <p className="font-medium text-[#dde6f5]">د. {doctorName}</p>
            <p className="text-[#4b5875]">تنتهي:</p>
            <p className="font-medium text-[#dde6f5]">{expiresAt}</p>
          </div>
          {prescription.diagnosis && (
            <div className="mb-4">
              <p className="text-[#4b5875] text-sm">التشخيص:</p>
              <p className="text-[#dde6f5]">{prescription.diagnosis}</p>
            </div>
          )}
          <div className="mb-4">
            <p className="mb-2 text-sm text-[#4b5875]">℞ الأدوية:</p>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="py-2 text-right text-[#4b5875]">الدواء</th>
                  <th className="py-2 text-right text-[#4b5875]">الجرعة</th>
                  <th className="py-2 text-right text-[#4b5875]">التكرار</th>
                  <th className="py-2 text-right text-[#4b5875]">المدة</th>
                </tr>
              </thead>
              <tbody>
                {(prescription.items ?? []).map((it) => (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="py-2 text-[#dde6f5]">{it.drug?.nameAr ?? '—'}</td>
                    <td className="py-2 text-[#dde6f5]">{it.dose} {it.doseUnit}</td>
                    <td className="py-2 text-[#dde6f5]">{it.frequency}</td>
                    <td className="py-2 text-[#dde6f5]">{it.durationDays} يوم</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prescription.instructions && (
            <div className="mb-4">
              <p className="text-[#4b5875] text-sm">التعليمات:</p>
              <p className="text-[#dde6f5]">{prescription.instructions}</p>
            </div>
          )}
          <div className="mt-6 flex justify-between text-sm text-[#4b5875]">
            <span>توقيع الطبيب __________</span>
            <span>ختم المركز __________</span>
          </div>
          <p className="mt-4 text-center text-xs text-[#4b5875]">صالحة لمدة 30 يوماً</p>
        </div>
      </div>
    </div>
  );
}

function AddDrugModal({
  onClose,
  onSuccess,
  toast,
}: {
  onClose: () => void;
  onSuccess: () => void;
  toast: (m: string) => void;
}) {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [defaultDose, setDefaultDose] = useState('');
  const [doseUnit, setDoseUnit] = useState('mg');
  const [form, setForm] = useState('tablet');
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!nameAr.trim()) {
      toast('أدخل الاسم بالعربية');
      return;
    }
    setSubmitting(true);
    apiPost<Drug>('/drugs', {
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      defaultDose: Number(defaultDose) || 0,
      doseUnit: doseUnit.trim() || 'mg',
      form,
      category,
    })
      .then(() => {
        toast('✓ تم إضافة الدواء');
        onSuccess();
      })
      .catch((e) => toast(e?.message ?? 'فشل الإضافة'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#dde6f5]">دواء جديد</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#4b5875] hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الاسم (عربي)</label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الاسم (إنجليزي)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">الجرعة الافتراضية</label>
              <input
                type="number"
                value={defaultDose}
                onChange={(e) => setDefaultDose(e.target.value)}
                className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">الوحدة</label>
              <input
                type="text"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
                style={{ borderColor: BORDER }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الشكل</label>
            <select
              value={form}
              onChange={(e) => setForm(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            >
              {Object.entries(FORM_ICONS).map(([k]) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الفئة</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
              style={{ borderColor: BORDER }}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-3 text-sm text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            إضافة
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border py-3 px-4 text-sm" style={{ borderColor: BORDER }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
