import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Plus, Loader2, X, Pencil, RefreshCw, Key, UserX, UserCheck } from 'lucide-react';
import type { User as ApiUser, UserRole } from '@/lib/api';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const AMBER = '#fbbf24';
const RED = '#f87171';

const SPECIALTIES = ['علاج عظام', 'مسالك بولية', 'أطفال', 'عام'];

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} د`;
  if (diffHours < 24) return `منذ ${diffHours} س`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return d.toLocaleDateString('ar-SA');
}

interface User extends ApiUser {
  lastLoginAt?: string | null;
  specialty?: string | null;
}

export function Users() {
  const toast = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    apiGet<User[]>('/users')
      .then((data) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'inactive' && u.isActive) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match = (u.nameAr ?? '').toLowerCase().includes(q) || (u.nameEn ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || (u.phone ?? '').includes(q);
      if (!match) return false;
    }
    return true;
  });

  const stats = {
    total: allUsers.length,
    doctors: allUsers.filter((u) => u.role === 'doctor').length,
    staff: allUsers.filter((u) => ['nurse', 'receptionist', 'driver'].includes(u.role)).length,
    inactive: allUsers.filter((u) => !u.isActive).length,
  };

  const handleToggle = async (u: User) => {
    try {
      await apiPatch(`/users/${u.id}/toggle`, {});
      toast(u.isActive ? '✓ تم تعطيل الحساب' : '✓ تم تفعيل الحساب');
      fetchUsers();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    }
  };

  const handleResetPassword = async (u: User) => {
    if (!window.confirm('إعادة تعيين كلمة المرور إلى آخر 4 أرقام من الجوال؟')) return;
    try {
      const res = await apiPost<{ tempPassword: string }>(`/users/${u.id}/reset-password`, {});
      toast(`✓ كلمة المرور المؤقتة: ${res.tempPassword}`);
      fetchUsers();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}>
      <div className="border-b px-6 py-4" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-[#dde6f5]">👤 إدارة المستخدمين</h1>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/30"
          >
            <Plus className="h-4 w-4" /> مستخدم جديد
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[11px] text-[#4b5875]">إجمالي المستخدمين</p>
            <p className="text-2xl font-bold text-[#dde6f5]" style={{ fontFamily: "'Space Mono', monospace" }}>{stats.total}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${CYAN}` }}>
            <p className="text-[11px] text-[#4b5875]">أطباء</p>
            <p className="text-2xl font-bold" style={{ color: CYAN, fontFamily: "'Space Mono', monospace" }}>{stats.doctors}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${AMBER}` }}>
            <p className="text-[11px] text-[#4b5875]">موظفون</p>
            <p className="text-2xl font-bold" style={{ color: AMBER, fontFamily: "'Space Mono', monospace" }}>{stats.staff}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ background: SURFACE, borderColor: BORDER, borderTop: `2px solid ${RED}` }}>
            <p className="text-[11px] text-[#4b5875]">غير نشطين</p>
            <p className="text-2xl font-bold" style={{ color: RED, fontFamily: "'Space Mono', monospace" }}>{stats.inactive}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {['', 'doctor', 'nurse', 'receptionist', 'driver'].map((r) => (
            <button
              key={r || 'all'}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-2 text-sm ${!roleFilter && !r ? 'bg-cyan-500/20 text-cyan-400' : roleFilter === r ? 'bg-cyan-500/20 text-cyan-400' : 'text-[#4b5875] hover:text-[#dde6f5]'}`}
            >
              {r ? ROLE_LABELS[r as UserRole] ?? r : 'الكل'}
            </button>
          ))}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]"
            style={{ borderColor: BORDER }}
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
          <input
            type="text"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mr-auto rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5] w-48"
            style={{ borderColor: BORDER }}
          />
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-[#4b5875]">لا مستخدمين</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr style={{ borderColor: BORDER }}>
                    <th className="p-3 font-medium text-[#4b5875]">المستخدم</th>
                    <th className="p-3 font-medium text-[#4b5875]">الدور</th>
                    <th className="p-3 font-medium text-[#4b5875]">آخر دخول</th>
                    <th className="p-3 font-medium text-[#4b5875]">الحالة</th>
                    <th className="p-3 font-medium text-[#4b5875]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: BORDER }}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: `${ROLE_COLORS[u.role as UserRole] ?? '#4b5875'}44` }}
                          >
                            {(u.nameAr ?? u.email).slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-[#dde6f5]">{u.nameAr ?? u.email}</p>
                            <p className="text-xs text-[#4b5875]">{u.phone ?? u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{
                            background: `${ROLE_COLORS[u.role as UserRole] ?? '#4b5875'}22`,
                            color: ROLE_COLORS[u.role as UserRole] ?? '#4b5875',
                          }}
                        >
                          {ROLE_LABELS[u.role as UserRole] ?? u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-[#4b5875]">{relativeTime(u.lastLoginAt)}</td>
                      <td className="p-3">
                        <span className={u.isActive ? 'text-green-400' : 'text-red-400'}>
                          {u.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => setEditUser(u)} className="rounded p-2 text-cyan-400 hover:bg-cyan-500/10" title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setRoleChangeUser(u)} className="rounded p-2 text-[#dde6f5] hover:bg-white/10" title="تغيير الدور">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleResetPassword(u)} className="rounded p-2 text-amber-400 hover:bg-amber-500/10" title="إعادة كلمة المرور">
                            <Key className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleToggle(u)} className="rounded p-2 text-[#dde6f5] hover:bg-white/10" title={u.isActive ? 'تعطيل' : 'تفعيل'}>
                            {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {newOpen && (
        <NewUserModal
          onClose={() => setNewOpen(false)}
          onSuccess={() => { setNewOpen(false); fetchUsers(); }}
          toast={toast}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); fetchUsers(); }}
          toast={toast}
        />
      )}
      {roleChangeUser && (
        <RoleChangeModal
          user={roleChangeUser}
          onClose={() => setRoleChangeUser(null)}
          onSuccess={() => { setRoleChangeUser(null); fetchUsers(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function NewUserModal({ onClose, onSuccess, toast }: { onClose: () => void; onSuccess: () => void; toast: (m: string) => void }) {
  const [form, setForm] = useState({ nameAr: '', nameEn: '', email: '', phone: '', role: 'doctor' as UserRole, specialty: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.email.trim()) {
      toast('أدخل البريد الإلكتروني');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ user: User; tempPassword: string }>('/users', {
        nameAr: form.nameAr || undefined,
        nameEn: form.nameEn || undefined,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        specialty: form.role === 'doctor' && form.specialty ? form.specialty : undefined,
      });
      toast(`✓ تم إنشاء الحساب — كلمة المرور أُرسلت للجوال: ${res.tempPassword}`);
      onSuccess();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الإنشاء');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#dde6f5]">مستخدم جديد</h2>
          <button type="button" onClick={onClose} className="rounded p-2 text-[#4b5875] hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الاسم بالعربي *</label>
            <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الاسم بالإنجليزي</label>
            <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">رقم الجوال *</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} placeholder="+963..." />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الدور</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>
              {(['doctor', 'nurse', 'receptionist', 'driver'] as const).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          {form.role === 'doctor' && (
            <div>
              <label className="mb-1 block text-sm text-[#4b5875]">تخصص</label>
              <select value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>
                <option value="">—</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={handleSubmit} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-3 text-sm text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} إنشاء
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border py-3 px-4 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess, toast }: { user: User; onClose: () => void; onSuccess: () => void; toast: (m: string) => void }) {
  const [form, setForm] = useState({ nameAr: user.nameAr ?? '', nameEn: user.nameEn ?? '', email: user.email, phone: user.phone ?? '', specialty: user.specialty ?? '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiPatch(`/users/${user.id}`, { nameAr: form.nameAr || null, nameEn: form.nameEn || null, email: form.email, phone: form.phone || null, specialty: form.specialty || null });
      toast('✓ تم التحديث');
      onSuccess();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#dde6f5]">تعديل المستخدم</h2>
          <button type="button" onClick={onClose} className="rounded p-2 text-[#4b5875] hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الاسم بالعربي</label>
            <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">البريد</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">الجوال</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#4b5875]">تخصص</label>
            <select value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} className="w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>
              <option value="">—</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={handleSubmit} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-3 text-sm text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} حفظ
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border py-3 px-4 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function RoleChangeModal({ user, onClose, onSuccess, toast }: { user: User; onClose: () => void; onSuccess: () => void; toast: (m: string) => void }) {
  const [newRole, setNewRole] = useState<UserRole>(user.role as UserRole);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (newRole === user.role) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await apiPatch(`/users/${user.id}/role`, { role: newRole });
      toast('✓ تم تغيير الدور');
      onSuccess();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#dde6f5]">تغيير الدور</h2>
          <button type="button" onClick={onClose} className="rounded p-2 text-[#4b5875] hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 rounded-lg border p-3 text-sm text-amber-400" style={{ borderColor: AMBER, background: 'rgba(251,191,36,0.1)' }}>
          ⚠️ تغيير الدور سيؤثر على صلاحيات المستخدم فوراً
        </div>
        <p className="mb-2 text-sm text-[#4b5875]">الدور الحالي: {ROLE_LABELS[user.role as UserRole]}</p>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="mb-4 w-full rounded-lg border bg-[#06080e] px-3 py-2 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>
          {(['admin', 'doctor', 'nurse', 'receptionist', 'driver', 'patient'] as const).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button type="button" onClick={handleSubmit} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500/20 py-3 text-sm text-amber-400 hover:bg-amber-500/30 disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} تأكيد تغيير الدور
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border py-3 px-4 text-sm text-[#dde6f5]" style={{ borderColor: BORDER }}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
