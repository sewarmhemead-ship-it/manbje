import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Plus, MoreVertical, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toast';
import { apiGet, apiPost } from '@/lib/api';
import { MOCK_PATIENTS, MOCK_PATIENT_STATS, MOCK_USERS_DOCTORS, isDemoMode } from '@/lib/mock-data';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';

const GRADIENT_CYCLES = [
  'from-cyan-500/30 to-cyan-600/20',
  'from-green-500/30 to-green-600/20',
  'from-amber-500/30 to-amber-600/20',
  'from-purple-500/30 to-purple-600/20',
  'from-pink-500/30 to-pink-600/20',
];

export interface Patient {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  diagnosis?: string | null;
  assignedDoctorId?: string | null;
  assignedDoctor?: { id: string; nameAr?: string | null; nameEn?: string | null } | null;
  arrivalPreference?: string | null;
  createdAt: string;
  /** من أحدث جلسة أو من API إن وُجد */
  recoveryScore?: number | null;
}

function patientIdDisplay(id: string, createdAt: string): string {
  const y = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const short = id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `PT-${y}-${short}`;
}

function ageFromBirth(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

export function PatientsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; activeThisMonth: number; newThisWeek: number }>({ total: 0, activeThisMonth: 0, newThisWeek: 0 });
  const [listData, setListData] = useState<{ data: Patient[]; total: number }>({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [sortBy, setSortBy] = useState<'name' | 'recovery' | 'lastVisit'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const openNewFromQuery = searchParams.get('new') === '1';
  useEffect(() => {
    if (openNewFromQuery) {
      setNewModalOpen(true);
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete('new');
        return next;
      });
    }
  }, [openNewFromQuery, setSearchParams]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      let data = MOCK_PATIENTS as unknown as Patient[];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        data = data.filter((p) => (p.nameAr ?? '').toLowerCase().includes(q) || (p.phone ?? '').includes(q));
      }
      const start = (page - 1) * limit;
      const paginated = data.slice(start, start + limit);
      setListData({ data: paginated, total: data.length });
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await apiGet<{ data: Patient[]; total: number } | Patient[]>(
        '/patients?' + params.toString()
      );
      if (Array.isArray(res)) {
        setListData({ data: res, total: res.length });
      } else {
        setListData({ data: res.data ?? [], total: res.total ?? 0 });
      }
    } catch {
      setListData({ data: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  const fetchStats = useCallback(async () => {
    if (isDemoMode()) {
      setStats(MOCK_PATIENT_STATS);
      return;
    }
    try {
      const s = await apiGet<{ total: number; activeThisMonth: number; newThisWeek: number }>('/patients/stats');
      setStats(s ?? { total: 0, activeThisMonth: 0, newThisWeek: 0 });
    } catch {
      setStats({ total: 0, activeThisMonth: 0, newThisWeek: 0 });
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = () => setSearch(searchInput);
  const totalPages = Math.max(1, Math.ceil(listData.total / limit));

  const sortedData = useMemo(() => {
    const d = [...listData.data];
    if (sortBy === 'name') {
      d.sort((a, b) => {
        const na = (a.nameAr ?? '').localeCompare(b.nameAr ?? '', 'ar');
        return sortDir === 'asc' ? na : -na;
      });
    }
    return d;
  }, [listData.data, sortBy, sortDir]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: BG,
        fontFamily: 'Cairo, Plus Jakarta Sans, sans-serif',
        borderColor: BORDER,
      }}
    >
      <header className="sticky top-0 z-20 border-b px-6 py-4 flex flex-wrap items-center gap-4" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <h1 className="text-xl font-bold text-white">👥 المرضى</h1>
        <div className="flex flex-1 min-w-[200px] max-w-md items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: BORDER, backgroundColor: BG }}>
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="بحث بالاسم أو الهاتف..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
          />
        </div>
        <Button variant="outline" size="sm" className="border-white/10 text-gray-300" onClick={() => setFilterOpen(true)}>
          <Filter className="mr-2 h-4 w-4" /> فلتر
        </Button>
        <Button size="sm" className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" onClick={() => setNewModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> مريض جديد
        </Button>
        <div className="flex items-center gap-4 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
          <span className="text-gray-400">الإجمالي: {stats.total}</span>
          <span className="text-gray-400">نشط هذا الشهر: {stats.activeThisMonth}</span>
          <span className="text-gray-400">جدد هذا الأسبوع: {stats.newThisWeek}</span>
        </div>
      </header>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Button variant={view === 'cards' ? 'default' : 'ghost'} size="sm" className={view === 'cards' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'} onClick={() => setView('cards')}>
            بطاقات
          </Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className={view === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'} onClick={() => setView('table')}>
            جدول
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
                <CardContent className="p-5">
                  <div className="h-14 w-14 rounded-full bg-white/10" />
                  <div className="mt-3 h-5 w-3/4 rounded bg-white/10" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-white/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listData.total === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border py-16" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
            <p className="text-gray-400">{search.trim() ? 'لا يوجد مرضى بهذا البحث' : 'لا يوجد مرضى بعد'}</p>
            {search.trim() ? (
              <Button variant="outline" size="sm" className="mt-4 border-cyan-500/30 text-cyan-400" onClick={() => { setSearch(''); setSearchInput(''); }}>
                إعادة تعيين البحث
              </Button>
            ) : (
              <Button size="lg" className="mt-6 bg-cyan-500/20 text-cyan-400" onClick={() => setNewModalOpen(true)}>
                <UserPlus className="mr-2 h-5 w-5" /> إضافة مريض
              </Button>
            )}
          </div>
        ) : view === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedData.map((p, i) => (
              <PatientCard
                key={p.id}
                patient={p}
                styleIndex={i}
                onOpenProfile={() => navigate('/patients/' + p.id)}
                onNewAppointment={() => { toast('موعد جديد — انتقل إلى التقويم'); navigate('/appointments?new=1'); }}
                onUploadXray={() => { toast('رفع أشعة — انتقل إلى ملف المريض'); navigate('/patients/' + p.id); }}
                onEdit={() => { toast('تعديل — قريباً'); }}
              />
            ))}
          </div>
        ) : (
          <PatientsTable
            patients={sortedData}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={(by) => { setSortBy(by); setSortDir((d) => (sortBy === by ? (d === 'asc' ? 'desc' : 'asc') : 'asc')); }}
            onRowClick={(p) => navigate('/patients/' + p.id)}
          />
        )}

        {!loading && listData.total > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>
              عرض {(page - 1) * limit + 1}–{Math.min(page * limit, listData.total)} من {listData.total} مريض
            </p>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="rounded-lg border bg-[#0b0f1a] px-2 py-1 text-sm text-white"
                style={{ borderColor: BORDER }}
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <Button variant="outline" size="sm" disabled={page <= 1} className="border-white/10" onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = page;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'ghost'}
                    size="sm"
                    className={page === p ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400'}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} className="border-white/10" onClick={() => setPage((p) => p + 1)}>
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>

      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFilterOpen(false)} />
          <FiltersSidebar
            onClose={() => setFilterOpen(false)}
            onApply={() => { setFilterOpen(false); fetchList(); }}
            onReset={() => { setFilterOpen(false); setSearch(''); setSearchInput(''); fetchList(); }}
          />
        </>
      )}

      {newModalOpen && (
        <NewPatientModal
          onClose={() => setNewModalOpen(false)}
          onSuccess={() => {
            toast('تمت إضافة المريض');
            setNewModalOpen(false);
            fetchList();
            fetchStats();
          }}
          toast={toast}
        />
      )}
    </div>
  );
}

function PatientCard({
  patient,
  styleIndex,
  onOpenProfile,
  onNewAppointment,
  onUploadXray,
  onEdit,
}: {
  patient: Patient;
  styleIndex: number;
  onOpenProfile: () => void;
  onNewAppointment: () => void;
  onUploadXray: () => void;
  onEdit: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const gradient = GRADIENT_CYCLES[styleIndex % 5];
  const initials = (patient.nameAr ?? '؟').slice(0, 2);
  const age = ageFromBirth(patient.birthDate);
  const score = patient.recoveryScore ?? null;
  const hasRecoveryData = score != null;
  const recoveryColor = hasRecoveryData
    ? (score > 70 ? GREEN : score >= 40 ? AMBER : RED)
    : '#4b5875';
  const recoveryBg = hasRecoveryData
    ? (score > 70 ? 'rgba(52,211,153,0.3)' : score >= 40 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)')
    : 'rgba(75,88,117,0.2)';
  const idDisplay = patientIdDisplay(patient.id, patient.createdAt);
  const arrivalIcon = patient.arrivalPreference === 'center_transport' ? '🚐' : '🚶';

  return (
    <Card
      className="cursor-pointer rounded-2xl border transition-all duration-200 hover:border-cyan-500/40 hover:-translate-y-0.5"
      style={{ backgroundColor: SURFACE, borderColor: BORDER, animationDelay: `${styleIndex * 50}ms` }}
      onClick={onOpenProfile}
    >
      <CardContent className="relative p-5" style={{ animation: 'fadeUp 0.3s ease-out both' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 shrink-0 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-lg font-bold text-white`}>
              {initials}
            </div>
            <div>
              <p className="font-bold text-white">{patient.nameAr}</p>
              <p className="text-xs text-gray-500" style={{ fontFamily: "'Space Mono', monospace" }}>{idDisplay}</p>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border py-1 shadow-xl" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenProfile(); }}>عرض الملف</button>
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onNewAppointment(); }}>موعد جديد</button>
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onUploadXray(); }}>رفع أشعة</button>
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}>تعديل</button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {age != null && <Badge variant="outline" className="border-white/10 text-xs">{age} سنة</Badge>}
          {patient.gender && <Badge variant="outline" className="border-white/10 text-xs">{patient.gender}</Badge>}
          {patient.diagnosis && <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{patient.diagnosis}</Badge>}
        </div>
        {patient.assignedDoctor && (
          <p className="mt-2 text-sm text-gray-400">الطبيب: {patient.assignedDoctor.nameAr ?? patient.assignedDoctor.nameEn ?? '—'}</p>
        )}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400">
            <span>نسبة التعافي</span>
            <span style={{ fontFamily: "'Space Mono', monospace", color: recoveryColor }}>
              {hasRecoveryData ? `${score}%` : 'لا توجد جلسات بعد'}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: hasRecoveryData ? `${Math.min(100, Math.max(0, score))}%` : '100%',
                backgroundColor: hasRecoveryData ? recoveryColor : undefined,
                background: hasRecoveryData ? undefined : recoveryBg,
              }}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">آخر جلسة: —</p>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">— جلسة</Badge>
          <span>{arrivalIcon}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientsTable({
  patients,
  onRowClick,
}: {
  patients: Patient[];
  sortBy: 'name' | 'recovery' | 'lastVisit';
  sortDir: 'asc' | 'desc';
  onSort: (by: 'name' | 'recovery' | 'lastVisit') => void;
  onRowClick: (p: Patient) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: BORDER }}>
            <th className="px-4 py-3 text-right font-medium text-gray-400">الاسم</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">المعرّف</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">التشخيص</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">الطبيب</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">الجلسات</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">التعافي</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">آخر زيارة</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">الوصول</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer border-b transition-colors hover:bg-white/5"
              style={{ borderColor: BORDER }}
              onClick={() => onRowClick(p)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${GRADIENT_CYCLES[0]}`} />
                  <span className="font-medium text-white">{p.nameAr}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>{patientIdDisplay(p.id, p.createdAt)}</td>
              <td className="px-4 py-3"><Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{p.diagnosis || '—'}</Badge></td>
              <td className="px-4 py-3 text-gray-400">{p.assignedDoctor?.nameAr ?? '—'}</td>
              <td className="px-4 py-3 text-gray-400">—</td>
              <td className="px-4 py-3" style={{ fontFamily: "'Space Mono', monospace" }}>—%</td>
              <td className="px-4 py-3 text-gray-400">—</td>
              <td className="px-4 py-3">{p.arrivalPreference === 'center_transport' ? '🚐' : '🚶'}</td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="sm" className="text-cyan-400" onClick={(e) => { e.stopPropagation(); onRowClick(p); }}>عرض</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FiltersSidebar({ onClose, onApply, onReset }: { onClose: () => void; onApply: () => void; onReset: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[280px] border-l shadow-xl" style={{ backgroundColor: SURFACE, borderColor: BORDER }} role="dialog">
      <div className="flex items-center justify-between border-b p-4" style={{ borderColor: BORDER }}>
        <h2 className="font-semibold text-white">الفلاتر</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-400">الطبيب، التشخيص، نطاق التعافي، نوع الوصول، التاريخ — قريباً</p>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-cyan-500/20 text-cyan-400" onClick={onApply}>تطبيق</Button>
          <Button size="sm" variant="outline" className="border-white/10" onClick={onReset}>إعادة تعيين</Button>
        </div>
      </div>
    </div>
  );
}

function NewPatientModal({
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
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [arrivalPreference, setArrivalPreference] = useState<'self' | 'center_transport'>('self');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<{ id: string; nameAr?: string | null; nameEn?: string | null }[]>([]);

  useEffect(() => {
    if (isDemoMode()) {
      setDoctors(MOCK_USERS_DOCTORS as { id: string; nameAr?: string | null; nameEn?: string | null }[]);
      return;
    }
    apiGet<{ id: string; nameAr?: string | null; nameEn?: string | null; role?: string }[]>('/users')
      .then((r) => setDoctors(Array.isArray(r) ? r.filter((u) => u.role === 'doctor') : []))
      .catch(() => setDoctors([]));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nameAr.trim()) e.nameAr = 'الاسم بالعربية مطلوب';
    if (!phone.trim()) e.phone = 'رقم الهاتف مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isDemoMode()) {
        onSuccess();
        setSubmitting(false);
        return;
      }
      await apiPost('/patients', {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || undefined,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        insuranceCompany: insuranceProvider.trim() || undefined,
        insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
        assignedDoctorId: assignedDoctorId || undefined,
        notes: notes.trim() || undefined,
        arrivalPreference: arrivalPreference === 'center_transport' ? 'center_transport' : 'self_arrival',
      });
      onSuccess();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <div className="flex items-center justify-between border-b p-4 shrink-0" style={{ borderColor: BORDER }}>
          <h2 className="text-lg font-semibold text-white">مريض جديد</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">الاسم بالعربية *</label>
              <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white focus:border-cyan-500" style={{ borderColor: BORDER }} />
              {errors.nameAr && <p className="mt-1 text-xs text-red-400">{errors.nameAr}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400">الاسم بالإنجليزية</label>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">تاريخ الميلاد</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">الجنس</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }}>
                <option value="">—</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">الهاتف *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white focus:border-cyan-500" style={{ borderColor: BORDER }} />
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400">البريد</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-400">العنوان</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">جهة اتصال الطوارئ (الاسم)</label>
              <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">جهة اتصال الطوارئ (الهاتف)</label>
              <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">شركة التأمين</label>
              <input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">رقم وثيقة التأمين</label>
              <input value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-sm text-gray-400">الطبيب المعيّن</label>
              <select value={assignedDoctorId} onChange={(e) => setAssignedDoctorId(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }}>
                <option value="">—</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.nameAr ?? d.nameEn ?? d.id}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">تفضيل الوصول</label>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-2"><input type="radio" checked={arrivalPreference === 'self'} onChange={() => setArrivalPreference('self')} /> بمفرده</label>
                <label className="flex items-center gap-2"><input type="radio" checked={arrivalPreference === 'center_transport'} onChange={() => setArrivalPreference('center_transport')} /> نقل المركز</label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-400">ملاحظات</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
            </div>
          </div>
          <Button className="w-full bg-cyan-500/20 text-cyan-400" onClick={submit} disabled={submitting}>{submitting ? 'جاري الحفظ...' : 'حفظ'}</Button>
        </div>
      </Card>
    </div>
  );
}
