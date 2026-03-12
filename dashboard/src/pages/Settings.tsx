import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { apiGet, apiPatch, apiPost, apiDelete, type User, type UserRole } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const PURPLE = '#a78bfa';

const CENTER_SETTINGS_KEY = 'centerSettings';
const NOTIFICATION_PREFS_KEY = 'notificationPrefs';

type SectionKey = 'profile' | 'center' | 'rooms' | 'equipment' | 'users' | 'billing' | 'notifications';

const SECTION_TABS: { key: SectionKey; label: string; icon: string; adminOnly?: boolean }[] = [
  { key: 'profile', label: 'الملف الشخصي', icon: '👤' },
  { key: 'center', label: 'إعدادات المركز', icon: '🏥', adminOnly: true },
  { key: 'rooms', label: 'إدارة الغرف', icon: '🚪', adminOnly: true },
  { key: 'equipment', label: 'إدارة الأجهزة', icon: '🔧', adminOnly: true },
  { key: 'users', label: 'المستخدمون', icon: '👥', adminOnly: true },
  { key: 'billing', label: 'الفواتير والإيرادات', icon: '💰', adminOnly: true },
  { key: 'notifications', label: 'الإشعارات', icon: '🔔' },
];

interface CenterSettings {
  centerName: string;
  phone: string;
  address: string;
  workStart: string;
  workEnd: string;
  defaultSessionDuration: number;
  bufferMinutes: number;
}

const defaultCenterSettings: CenterSettings = {
  centerName: 'مركز العلاج الطبيعي المتقدم',
  phone: '',
  address: '',
  workStart: '08:00',
  workEnd: '18:00',
  defaultSessionDuration: 60,
  bufferMinutes: 15,
};

interface NotificationPrefs {
  newAppointments: boolean;
  cancelAlerts: boolean;
  transportArrival: boolean;
  dailySummary: boolean;
  homeExercises: boolean;
  systemUpdates: boolean;
}

const defaultNotificationPrefs: NotificationPrefs = {
  newAppointments: true,
  cancelAlerts: true,
  transportArrival: true,
  dailySummary: false,
  homeExercises: true,
  systemUpdates: true,
};

interface Room {
  id: string;
  roomNumber: string;
  type: string | null;
  isActive: boolean;
}

interface Equipment {
  id: string;
  name: string;
  description: string | null;
  isAvailable: boolean;
}

export function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [section, setSection] = useState<SectionKey>('profile');
  const visibleTabs = SECTION_TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col md:flex-row" style={{ backgroundColor: BG }}>
      {/* Sidebar */}
      <aside
        className="w-full shrink-0 border-b md:w-[220px] md:border-b-0 md:border-l"
        style={{ backgroundColor: SURFACE, borderColor: BORDER }}
      >
        <nav className="flex flex-row flex-wrap gap-1 p-3 md:flex-col md:flex-nowrap md:gap-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSection(tab.key)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-sm transition-all duration-200 md:rounded-r-none md:rounded-l-xl md:border-l-2 md:border-l-transparent"
              style={{
                backgroundColor: section === tab.key ? `${CYAN}14` : 'transparent',
                borderLeftColor: section === tab.key ? CYAN : undefined,
              }}
            >
              <span>{tab.icon}</span>
              <span className="text-white/90">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6">
        {section === 'profile' && <ProfileSection toast={toast} />}
        {section === 'center' && isAdmin && <CenterSection toast={toast} />}
        {section === 'rooms' && isAdmin && <RoomsSection toast={toast} />}
        {section === 'equipment' && isAdmin && <EquipmentSection toast={toast} />}
        {section === 'users' && isAdmin && <UsersSection toast={toast} />}
        {section === 'billing' && isAdmin && <BillingSection toast={toast} />}
        {section === 'notifications' && <NotificationsSection toast={toast} />}
      </main>
    </div>
  );
}

function ProfileSection({ toast }: { toast: (m: string) => void }) {
  const { user, refreshUser } = useAuth();
  const [nameAr, setNameAr] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNameAr(user.nameAr ?? '');
      setEmail(user.email);
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await apiPatch<User>(`/users/${user.id}`, {
        nameAr: nameAr || null,
        nameEn: user.nameEn,
        email: email || undefined,
        phone: phone || null,
      });
      await refreshUser();
      toast('✓ تم حفظ التعديلات');
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [user, nameAr, phone, refreshUser, toast]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (newPassword.length < 8) {
      toast('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setPasswordSaving(true);
    try {
      // TODO: PATCH /auth/change-password when backend adds it
      toast('قريباً');
    } finally {
      setPasswordSaving(false);
    }
  }, [newPassword, confirmPassword, toast]);

  if (!user) return null;

  const initials = (user.nameAr ?? user.email).slice(0, 2);
  const roleLabel = { admin: 'مدير', doctor: 'طبيب', patient: 'مريض', driver: 'سائق' }[user.role] ?? user.role;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
        👤 الملف الشخصي
      </h1>

      <Card className="rounded-2xl border transition-all duration-200" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${CYAN}40, ${PURPLE}30)` }}
              >
                {initials}
              </div>
              <button
                type="button"
                onClick={() => toast('قريباً')}
                className="text-sm text-cyan-400 hover:underline"
              >
                تغيير الصورة
              </button>
            </div>
            <div className="grid gap-4 sm:col-span-1 sm:grid-cols-1">
              <div>
                <label className="mb-1 block text-xs text-gray-400">الاسم الكامل</label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="border-white/10 bg-black/20 focus:border-cyan-500"
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">البريد الإلكتروني</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/10 bg-black/20 focus:border-cyan-500"
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">الهاتف</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-white/10 bg-black/20 focus:border-cyan-500"
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">الدور</label>
                <Badge className="bg-white/10 text-gray-300">{roleLabel}</Badge>
              </div>
              {user.role === 'doctor' && (
                <div>
                  <label className="mb-1 block text-xs text-gray-400">التخصص</label>
                  <Input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثال: علاج طبيعي عصبي"
                    className="border-white/10 bg-black/20 focus:border-cyan-500"
                    style={{ borderColor: BORDER }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setPasswordOpen((o) => !o)}
              className="text-sm text-cyan-400 hover:underline"
            >
              {passwordOpen ? 'إخفاء تغيير كلمة المرور' : 'تغيير كلمة المرور'}
            </button>
            {passwordOpen && (
              <div className="mt-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-1" style={{ borderColor: BORDER, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">كلمة المرور الحالية</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="border-white/10 bg-black/20 focus:border-cyan-500"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">كلمة المرور الجديدة</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-white/10 bg-black/20 focus:border-cyan-500"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">تأكيد كلمة المرور الجديدة</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-white/10 bg-black/20 focus:border-cyan-500"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <Button variant="outline" onClick={handleChangePassword} disabled={passwordSaving} className="border-cyan-500/50 text-cyan-400">
                  تحديث كلمة المرور
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-500">
              حفظ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CenterSection({ toast }: { toast: (m: string) => void }) {
  const [settings, setSettings] = useState<CenterSettings>(defaultCenterSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CENTER_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CenterSettings>;
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  const save = () => {
    // TODO: ربط بـ API عند إضافة endpoint إعدادات المركز
    localStorage.setItem(CENTER_SETTINGS_KEY, JSON.stringify(settings));
    toast('✓ تم حفظ إعدادات المركز');
  };

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
        🏥 إعدادات المركز
      </h1>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">اسم المركز</label>
            <Input value={settings.centerName} onChange={(e) => setSettings((s) => ({ ...s, centerName: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">الهاتف</label>
            <Input value={settings.phone} onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">العنوان</label>
            <Input value={settings.address} onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">بداية الدوام</label>
              <Input type="time" value={settings.workStart} onChange={(e) => setSettings((s) => ({ ...s, workStart: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">نهاية الدوام</label>
              <Input type="time" value={settings.workEnd} onChange={(e) => setSettings((s) => ({ ...s, workEnd: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">مدة الجلسة الافتراضية (دقيقة)</label>
            <select
              value={settings.defaultSessionDuration}
              onChange={(e) => setSettings((s) => ({ ...s, defaultSessionDuration: Number(e.target.value) }))}
              className="h-10 w-full rounded-xl border bg-black/20 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
              style={{ borderColor: BORDER }}
            >
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">فاصل الزمن بين المواعيد (دقيقة)</label>
            <Input type="number" min={0} value={settings.bufferMinutes} onChange={(e) => setSettings((s) => ({ ...s, bufferMinutes: Number(e.target.value) || 0 }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
          </div>
          <div>
            <button type="button" onClick={() => toast('قريباً')} className="text-sm text-cyan-400 hover:underline">رفع الشعار</button>
          </div>
          <Button onClick={save} className="bg-cyan-600 text-white hover:bg-cyan-500">حفظ</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200"
      style={{ backgroundColor: checked ? CYAN : 'rgba(255,255,255,0.1)', borderColor: BORDER }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(1.25rem)' : 'translateX(0)' }}
      />
    </button>
  );
}

function RoomsSection({ toast }: { toast: (m: string) => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | { edit: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ roomNumber: '', type: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<Room[]>('/rooms');
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      setRooms([]);
      toast('فشل تحميل الغرف');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const openAdd = () => {
    setForm({ roomNumber: '', type: 'عام', isActive: true });
    setModal('add');
  };
  const openEdit = (r: Room) => {
    setForm({ roomNumber: r.roomNumber, type: r.type ?? 'عام', isActive: r.isActive });
    setModal({ edit: r.id });
  };
  const submitRoom = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await apiPost<Room>('/rooms', { roomNumber: form.roomNumber, type: form.type || null, isActive: form.isActive });
        toast('✓ تمت إضافة الغرفة');
      } else if (modal && 'edit' in modal) {
        await apiPatch<Room>(`/rooms/${modal.edit}`, { roomNumber: form.roomNumber, type: form.type || null, isActive: form.isActive });
        toast('✓ تم تحديث الغرفة');
      }
      setModal(null);
      fetchRooms();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await apiPatch(`/rooms/${id}`, { isActive });
      toast('✓ تم التحديث');
      fetchRooms();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    }
  };
  const doDelete = async (id: string) => {
    try {
      await apiDelete(`/rooms/${id}`);
      toast('✓ تم الحذف');
      setDeleteConfirm(null);
      fetchRooms();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحذف');
    }
  };

  const typeLabel = (t: string | null) => (t === 'كهربائي' ? 'كهربائي' : t === 'مائي' ? 'مائي' : 'عام');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>🚪 إدارة الغرف</h1>
        <Button onClick={openAdd} className="bg-cyan-600 text-white hover:bg-cyan-500">إضافة غرفة</Button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }} />
      ) : (
        <Card className="rounded-2xl border overflow-hidden" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr style={{ borderColor: BORDER }}>
                  <th className="p-3 font-medium text-gray-400">الغرفة</th>
                  <th className="p-3 font-medium text-gray-400">النوع</th>
                  <th className="p-3 font-medium text-gray-400">السعة</th>
                  <th className="p-3 font-medium text-gray-400">التجهيزات</th>
                  <th className="p-3 font-medium text-gray-400">الحالة</th>
                  <th className="p-3 font-medium text-gray-400">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderColor: BORDER }}>
                    <td className="p-3 font-medium text-white">{r.roomNumber}</td>
                    <td className="p-3"><Badge className="bg-cyan-500/20 text-cyan-400">{typeLabel(r.type)}</Badge></td>
                    <td className="p-3 text-gray-400">—</td>
                    <td className="p-3 text-gray-400">—</td>
                    <td className="p-3">
                      <Toggle checked={r.isActive} onChange={(v) => toggleActive(r.id, v)} />
                    </td>
                    <td className="p-3 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>تعديل</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setDeleteConfirm(r.id)}>حذف</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'إضافة غرفة' : 'تعديل غرفة'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">اسم/رقم الغرفة</label>
              <Input value={form.roomNumber} onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">النوع</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="h-10 w-full rounded-xl border bg-black/20 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none" style={{ borderColor: BORDER }}>
                <option value="عام">عام</option>
                <option value="كهربائي">كهربائي</option>
                <option value="مائي">مائي</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              <span className="text-sm text-gray-400">نشط</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={submitRoom} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-500">حفظ</Button>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)} className="border-red-500/30 bg-red-950/20">
          <div className="flex items-center gap-3 text-amber-200">
            <span className="text-2xl">⚠️</span>
            <p>هل أنت متأكد من حذف هذه الغرفة؟</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="outline" className="border-red-500 text-red-400" onClick={() => doDelete(deleteConfirm)}>حذف</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EquipmentSection({ toast }: { toast: (m: string) => void }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | { edit: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isAvailable: true });
  const [saving, setSaving] = useState(false);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<Equipment[]>('/equipment');
      setEquipment(Array.isArray(list) ? list : []);
    } catch {
      setEquipment([]);
      toast('فشل تحميل الأجهزة');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const openAdd = () => {
    setForm({ name: '', description: '', isAvailable: true });
    setModal('add');
  };
  const openEdit = (e: Equipment) => {
    setForm({ name: e.name, description: e.description ?? '', isAvailable: e.isAvailable });
    setModal({ edit: e.id });
  };
  const submitEquipment = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await apiPost<Equipment>('/equipment', { name: form.name, description: form.description || null, isAvailable: form.isAvailable });
        toast('✓ تمت إضافة الجهاز');
      } else if (modal && 'edit' in modal) {
        await apiPatch<Equipment>(`/equipment/${modal.edit}`, { name: form.name, description: form.description || null, isAvailable: form.isAvailable });
        toast('✓ تم تحديث الجهاز');
      }
      setModal(null);
      fetchEquipment();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };
  const doDelete = async (id: string) => {
    try {
      await apiDelete(`/equipment/${id}`);
      toast('✓ تم الحذف');
      setDeleteConfirm(null);
      fetchEquipment();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحذف');
    }
  };

  const statusLabel = (isAvailable: boolean) => (isAvailable ? 'متاح' : 'قيد الاستخدام');
  const statusColor = (isAvailable: boolean) => (isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>🔧 إدارة الأجهزة</h1>
        <Button onClick={openAdd} className="bg-cyan-600 text-white hover:bg-cyan-500">إضافة جهاز</Button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }} />
      ) : (
        <Card className="rounded-2xl border overflow-hidden" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr style={{ borderColor: BORDER }}>
                  <th className="p-3 font-medium text-gray-400">الجهاز</th>
                  <th className="p-3 font-medium text-gray-400">النوع</th>
                  <th className="p-3 font-medium text-gray-400">الغرفة</th>
                  <th className="p-3 font-medium text-gray-400">الحالة</th>
                  <th className="p-3 font-medium text-gray-400">الصيانة القادمة</th>
                  <th className="p-3 font-medium text-gray-400">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderColor: BORDER }}>
                    <td className="p-3 font-medium text-white">{eq.name}</td>
                    <td className="p-3"><Badge className="bg-cyan-500/20 text-cyan-400">{eq.description || '—'}</Badge></td>
                    <td className="p-3 text-gray-400">—</td>
                    <td className="p-3"><Badge className={statusColor(eq.isAvailable)}>{statusLabel(eq.isAvailable)}</Badge></td>
                    <td className="p-3 font-mono text-xs text-gray-400">—</td>
                    <td className="p-3 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(eq)}>تعديل</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setDeleteConfirm(eq.id)}>حذف</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'إضافة جهاز' : 'تعديل جهاز'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">اسم الجهاز</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">الوصف/النوع</label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={form.isAvailable} onChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))} />
              <span className="text-sm text-gray-400">متاح</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={submitEquipment} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-500">حفظ</Button>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)} className="border-red-500/30 bg-red-950/20">
          <div className="flex items-center gap-3 text-amber-200">
            <span className="text-2xl">⚠️</span>
            <p>هل أنت متأكد من حذف هذا الجهاز؟</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="outline" className="border-red-500 text-red-400" onClick={() => doDelete(deleteConfirm)}>حذف</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-500/30 text-purple-300',
  doctor: 'bg-cyan-500/20 text-cyan-400',
  patient: 'bg-gray-500/20 text-gray-400',
  driver: 'bg-amber-500/20 text-amber-400',
};

function UsersSection({ toast }: { toast: (m: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | { edit: string } | null>(null);
  const [form, setForm] = useState({ nameAr: '', nameEn: '', email: '', phone: '', password: '', role: 'doctor' as UserRole });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<User[]>('/users');
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setUsers([]);
      toast('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAdd = () => {
    setForm({ nameAr: '', nameEn: '', email: '', phone: '', password: '', role: 'doctor' });
    setModal('add');
  };
  const openEdit = (u: User) => {
    setForm({ nameAr: u.nameAr ?? '', nameEn: u.nameEn ?? '', email: u.email, phone: u.phone ?? '', password: '', role: u.role });
    setModal({ edit: u.id });
  };
  const submitUser = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await apiPost<User>('/users', { nameAr: form.nameAr || null, nameEn: form.nameEn || null, email: form.email, phone: form.phone || null, password: form.password, role: form.role });
        toast('✓ تمت إضافة المستخدم');
      } else if (modal && 'edit' in modal) {
        await apiPatch<User>(`/users/${modal.edit}`, { nameAr: form.nameAr || null, nameEn: form.nameEn || null, email: form.email, phone: form.phone || null, isActive: undefined });
        toast('✓ تم تحديث المستخدم');
      }
      setModal(null);
      fetchUsers();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (u: User) => {
    try {
      await apiPatch<User>(`/users/${u.id}`, { isActive: !u.isActive });
      toast('✓ تم التحديث');
      fetchUsers();
    } catch (e) {
      toast((e as Error).message ?? 'فشل');
    }
  };

  const roleLabel = (r: UserRole) => ({ admin: 'مدير', doctor: 'طبيب', patient: 'مريض', driver: 'سائق' }[r] ?? r);
  const formatDate = (d: string | undefined) => (d ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>👥 المستخدمون</h1>
        <Button onClick={openAdd} className="bg-cyan-600 text-white hover:bg-cyan-500">إضافة مستخدم</Button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }} />
      ) : (
        <Card className="rounded-2xl border overflow-hidden" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr style={{ borderColor: BORDER }}>
                  <th className="p-3 font-medium text-gray-400">الاسم</th>
                  <th className="p-3 font-medium text-gray-400">البريد</th>
                  <th className="p-3 font-medium text-gray-400">الدور</th>
                  <th className="p-3 font-medium text-gray-400">الحالة</th>
                  <th className="p-3 font-medium text-gray-400">تاريخ الإنشاء</th>
                  <th className="p-3 font-medium text-gray-400">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderColor: BORDER }}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: u.role === 'admin' ? PURPLE + '40' : u.role === 'doctor' ? CYAN + '40' : u.role === 'driver' ? AMBER + '40' : GREEN + '40' }}>
                          {(u.nameAr ?? u.email).slice(0, 2)}
                        </div>
                        <span className="font-medium text-white">{u.nameAr ?? u.email}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-400">{u.email}</td>
                    <td className="p-3"><Badge className={ROLE_COLORS[u.role]}>{roleLabel(u.role)}</Badge></td>
                    <td className="p-3">
                      <span className={`inline-block h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="mr-2 text-gray-400">{u.isActive ? 'نشط' : 'غير نشط'}</span>
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                    <td className="p-3 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>تعديل</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>{u.isActive ? 'تعطيل' : 'تفعيل'}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'إضافة مستخدم' : 'تعديل مستخدم'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">الاسم (عربي)</label>
              <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">الاسم (إنجليزي)</label>
              <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">البريد الإلكتروني</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} disabled={modal !== 'add'} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">الهاتف</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
            </div>
            {modal === 'add' && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">كلمة المرور</label>
                  <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="bg-black/20 border-white/10 focus:border-cyan-500" style={{ borderColor: BORDER }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">الدور</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))} className="h-10 w-full rounded-xl border bg-black/20 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none" style={{ borderColor: BORDER }}>
                    <option value="admin">مدير</option>
                    <option value="doctor">طبيب</option>
                    <option value="driver">سائق</option>
                    <option value="patient">مريض</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={submitUser} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-500">حفظ</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface BillingStats {
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  insuranceCollected: number;
  byMethod?: { method: string; amount: number }[];
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  patientId: string;
  total: string;
  status: string;
  dueDate: string;
  patient?: { nameAr?: string };
}

function BillingSection(_props: { toast: (m: string) => void }) {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [statsRes, invRes] = await Promise.all([
          apiGet<BillingStats>('/billing/stats').catch(() => null),
          apiGet<InvoiceRow[]>('/billing/invoices').catch(() => []),
        ]);
        if (!cancelled) {
          setStats(statsRes ?? null);
          setInvoices(Array.isArray(invRes) ? invRes.slice(0, 10) : []);
        }
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>💰 الفواتير والإيرادات</h1>
        <Link to="/billing" className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
          صفحة الفوترة الكاملة
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
            <CardContent className="p-4">
              <p className="text-[11px] text-gray-400">إجمالي الإيرادات</p>
              <p className="mt-1 text-xl font-bold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>${stats.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
            <CardContent className="p-4">
              <p className="text-[11px] text-gray-400">المحصل</p>
              <p className="mt-1 text-xl font-bold text-green-400" style={{ fontFamily: "'Space Mono', monospace" }}>${stats.totalPaid.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
            <CardContent className="p-4">
              <p className="text-[11px] text-gray-400">المتبقي</p>
              <p className="mt-1 text-xl font-bold text-amber-400" style={{ fontFamily: "'Space Mono', monospace" }}>${stats.totalPending.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
            <CardContent className="p-4">
              <p className="text-[11px] text-gray-400">التأمين</p>
              <p className="mt-1 text-xl font-bold text-cyan-400" style={{ fontFamily: "'Space Mono', monospace" }}>${(stats.insuranceCollected ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <Card className="rounded-2xl border overflow-hidden" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader><CardTitle className="text-base text-white">آخر الفواتير</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="py-4 text-center text-gray-400">لا توجد فواتير</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr style={{ borderColor: BORDER }}>
                    <th className="p-2 font-medium text-gray-400">الرقم</th>
                    <th className="p-2 font-medium text-gray-400">المريض</th>
                    <th className="p-2 font-medium text-gray-400">المبلغ</th>
                    <th className="p-2 font-medium text-gray-400">الحالة</th>
                    <th className="p-2 font-medium text-gray-400">الاستحقاق</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02]" style={{ borderColor: BORDER }}>
                      <td className="p-2 font-mono text-cyan-400">{inv.invoiceNumber}</td>
                      <td className="p-2 text-white">{inv.patient?.nameAr ?? inv.patientId}</td>
                      <td className="p-2 font-mono text-gray-300">{inv.total}</td>
                      <td className="p-2"><Badge className="bg-cyan-500/20 text-cyan-400">{inv.status}</Badge></td>
                      <td className="p-2 font-mono text-gray-400">{inv.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection({ toast }: { toast: (m: string) => void }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
        setPrefs((p) => ({ ...p, ...parsed }));
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  const save = () => {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
    toast('✓ تم حفظ تفضيلات الإشعارات');
  };

  if (!loaded) return null;

  const items: { key: keyof NotificationPrefs; label: string }[] = [
    { key: 'newAppointments', label: 'إشعارات المواعيد الجديدة' },
    { key: 'cancelAlerts', label: 'تنبيهات الإلغاء' },
    { key: 'transportArrival', label: 'تنبيهات وصول النقل' },
    { key: 'dailySummary', label: 'ملخص يومي بالبريد' },
    { key: 'homeExercises', label: 'تنبيهات التمارين المنزلية' },
    { key: 'systemUpdates', label: 'تحديثات النظام' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>🔔 الإشعارات</h1>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardContent className="p-6 space-y-4">
          {items.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-300">{label}</span>
              <Toggle checked={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-4">سيتم ربط الإشعارات بنظام Push Notifications لاحقاً</p>
          <Button onClick={save} className="bg-cyan-600 text-white hover:bg-cyan-500 mt-2">حفظ</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative z-10 w-full max-w-md rounded-[18px] border p-6 shadow-xl ${className}`}
        style={{ backgroundColor: SURFACE, borderColor: BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
