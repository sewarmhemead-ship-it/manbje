import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sun, ZoomIn, ZoomOut, GitCompare, FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiUpload } from '@/lib/api';

const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';

interface Attachment {
  id: string;
  fileType: string;
  fileUrl?: string;
  description?: string | null;
  originalName?: string | null;
  createdAt: string;
  sessionId?: string | null;
}

export function XRaysTab({ patientId, toast }: { patientId: string; toast: (m: string) => void }) {
  const [list, setList] = useState<Attachment[]>([]);
  const [sessions, setSessions] = useState<{ id: string; appointment?: { startTime?: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('xray');
  const [description, setDescription] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = () => {
    apiGet<Attachment[]>(`/attachments/patient/${patientId}`)
      .then((r) => setList(Array.isArray(r) ? r : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiGet<unknown[]>(`/patients/${patientId}/sessions`)
      .then((r) => setSessions(Array.isArray(r) ? (r as { id: string; appointment?: { startTime?: string } }[]) : []))
      .catch(() => setSessions([]));
  }, [patientId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('patientId', patientId);
      form.append('fileType', fileType);
      if (description) form.append('description', description);
      if (sessionId) form.append('sessionId', sessionId);
      await apiUpload('/attachments/upload', form);
      toast('تم رفع الملف');
      setUploadOpen(false);
      setFile(null);
      setDescription('');
      setSessionId('');
      load();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const current = list[selectedIndex];
  const isImage = current?.fileType === 'xray' || current?.fileType === 'mri' || (current?.originalName && /\.(jpg|jpeg|png|gif|webp|dcm)$/i.test(current.originalName));

  return (
    <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-white">عارض الصور</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/10 text-gray-400" onClick={() => setZoom((z) => Math.min(150, z + 10))} disabled={!list.length}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-gray-400" onClick={() => setZoom((z) => Math.max(50, z - 10))} disabled={!list.length}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-gray-400">
              <GitCompare className="h-4 w-4" /> مقارنة
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-gray-400" onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))} disabled={!list.length}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400" style={{ fontFamily: "'Space Mono', monospace" }}>{list.length ? selectedIndex + 1 : 0} / {list.length || 1}</span>
            <Button variant="outline" size="sm" className="border-white/10 text-gray-400" onClick={() => setSelectedIndex((i) => Math.min(list.length - 1, i + 1))} disabled={!list.length}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Sun className="h-4 w-4 text-amber-400" />
              <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-20 accent-amber-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="flex min-h-[350px] items-center justify-center rounded-xl"
            style={{ backgroundColor: '#06080e', filter: `brightness(${brightness}%)` }}
          >
            {!list.length ? (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <ImageIcon className="h-12 w-12" />
                <p>اختر أشعة من القائمة</p>
              </div>
            ) : isImage && current?.fileUrl ? (
              <img src={current.fileUrl} alt={current.originalName ?? ''} className="max-h-[400px] object-contain" style={{ transform: `scale(${zoom / 100})` }} />
            ) : isImage ? (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon className="h-12 w-12" />
                <p>{current?.originalName ?? 'صورة'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <FileText className="h-12 w-12" />
                <p>{current?.originalName ?? 'ملف'}</p>
                {current?.fileUrl && (
                  <a href={current.fileUrl} download className="text-cyan-400 hover:underline">تحميل</a>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-white">📁 المرفقات</CardTitle>
          <Button size="sm" className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" onClick={() => setUploadOpen(true)}>
            ⬆️ رفع
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400">جاري التحميل…</p>
          ) : (
            <ul className="space-y-2">
              {list.map((a, i) => (
                <li
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2 transition-colors ${selectedIndex === i ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/6 hover:border-cyan-500/30'}`}
                  style={{ borderColor: selectedIndex === i ? undefined : BORDER }}
                  onClick={() => setSelectedIndex(i)}
                >
                  {a.fileType === 'xray' || a.fileType === 'mri' ? <span className="text-lg">🦴</span> : a.fileType === 'report' ? <span className="text-lg">📄</span> : <Paperclip className="h-5 w-5 text-gray-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{a.originalName ?? a.fileType}</p>
                    <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString('ar-SA')} — {a.description ?? '—'}</p>
                    {a.sessionId && <p className="text-xs text-gray-500">جلسة #{a.sessionId.slice(0, 8)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: BORDER }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">رفع مرفق</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setUploadOpen(false)}><X className="h-5 w-5" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">الملف</label>
                  <input type="file" accept="image/*,.pdf,.dcm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-sm text-gray-400" style={{ borderColor: BORDER }} />
                </div>
                <div>
                  <label className="text-sm text-gray-400">النوع</label>
                  <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }}>
                    <option value="xray">أشعة</option>
                    <option value="report">تقرير</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">الوصف</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }} />
                </div>
                <div>
                  <label className="text-sm text-gray-400">ربط بجلسة (اختياري)</label>
                  <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="mt-1 w-full rounded-xl border bg-[#06080e] px-3 py-2 text-white" style={{ borderColor: BORDER }}>
                    <option value="">—</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.appointment?.startTime ? new Date(s.appointment.startTime).toLocaleString('ar-SA') : s.id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={!file || uploading} className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                  {uploading ? 'جاري الرفع…' : 'رفع'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
