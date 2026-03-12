import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';

interface EquipmentItem {
  id: string;
  name: string;
  description: string | null;
  isAvailable: boolean;
}

export function Equipment() {
  const toast = useToast();
  const [list, setList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '', isAvailable: true });
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<EquipmentItem[] | { data?: EquipmentItem[] }>('/equipment');
      const arr = Array.isArray(data) ? data : (data as { data?: EquipmentItem[] }).data ?? [];
      setList(arr);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const total = list.length;
  const available = list.filter((e) => e.isAvailable).length;
  const inUse = total - available;

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      toast('اسم الجهاز مطلوب');
      return;
    }
    setSaving(true);
    try {
      await apiPost<EquipmentItem>('/equipment', {
        name: addForm.name.trim(),
        description: addForm.description.trim() || undefined,
        isAvailable: addForm.isAvailable,
      });
      toast('✓ تم إضافة الجهاز');
      setAddOpen(false);
      setAddForm({ name: '', description: '', isAvailable: true });
      fetchList();
    } catch (e) {
      toast((e as Error).message ?? 'فشل الإضافة');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (item: EquipmentItem) => {
    try {
      await apiPatch(`/equipment/${item.id}`, { isAvailable: !item.isAvailable });
      toast('✓ تم تغيير الحالة');
      fetchList();
    } catch (e) {
      toast((e as Error).message ?? 'فشل التحديث');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="border-b px-6 py-4" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-[#dde6f5]">⚙️ إدارة الأجهزة</h1>
          <Button
            className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> إضافة جهاز
          </Button>
        </div>
        <div className="mt-3 flex gap-6 text-sm">
          <span className="text-[#4b5875]">الإجمالي: <strong className="text-[#dde6f5]">{total}</strong></span>
          <span className="text-[#4b5875]">متاح: <strong className="text-[#34d399]">{available}</strong></span>
          <span className="text-[#4b5875]">مستخدم: <strong className="text-[#fbbf24]">{inUse}</strong></span>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((item) => (
              <Card
                key={item.id}
                className="rounded-2xl border transition-all duration-200 hover:border-cyan-500/30"
                style={{ background: SURFACE, borderColor: BORDER }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl">
                      🔧
                    </div>
                    <Badge
                      className="text-xs"
                      style={{
                        background: item.isAvailable ? 'rgba(52,211,153,0.18)' : 'rgba(251,191,36,0.18)',
                        color: item.isAvailable ? '#34d399' : '#fbbf24',
                      }}
                    >
                      {item.isAvailable ? 'متاح' : 'مستخدم'}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-bold text-[#dde6f5]">{item.name}</h3>
                  <p className="mt-1 text-sm text-[#4b5875] line-clamp-2">
                    {item.description || '—'}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#4b5875] hover:text-[#dde6f5]"
                      onClick={() => toast('تعديل — قريباً')}
                    >
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-500/30 text-cyan-400"
                      onClick={() => toggleAvailable(item)}
                    >
                      {item.isAvailable ? 'تغيير إلى مستخدم' : 'تغيير إلى متاح'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setAddOpen(false)} />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-xl"
            style={{ background: SURFACE, borderColor: BORDER }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
              <h2 className="text-lg font-semibold text-[#dde6f5]">إضافة جهاز</h2>
              <Button variant="ghost" size="icon" className="text-[#4b5875]" onClick={() => setAddOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[#4b5875]">الاسم *</label>
                <Input
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="اسم الجهاز"
                  className="border-[rgba(255,255,255,0.1)] bg-[#101622] text-[#dde6f5]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#4b5875]">الوصف</label>
                <Input
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="وصف اختياري"
                  className="border-[rgba(255,255,255,0.1)] bg-[#101622] text-[#dde6f5]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-available"
                  checked={addForm.isAvailable}
                  onChange={(e) => setAddForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                  className="h-4 w-4 rounded border-[rgba(255,255,255,0.2)]"
                />
                <label htmlFor="add-available" className="text-sm text-[#4b5875]">متاح حالياً</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#4b5875]" onClick={() => setAddOpen(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                onClick={handleAdd}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
