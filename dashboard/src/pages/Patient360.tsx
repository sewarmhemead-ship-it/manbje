import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { apiGet } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { OverviewTab } from '@/components/patient360/OverviewTab';
import { XRaysTab } from '@/components/patient360/XRaysTab';
import { HEPTab } from '@/components/patient360/HEPTab';
import { RecordSessionTab } from '@/components/patient360/RecordSessionTab';

const BG = '#06080e';
const SURFACE = '#0b0f1a';
const BORDER = 'rgba(255,255,255,0.06)';

function patientIdDisplay(id: string, createdAt: string): string {
  const y = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const short = id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `PT-${y}-${short}`;
}

export interface PatientRecord {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  diagnosis?: string | null;
  assignedDoctor?: { id: string; nameAr?: string | null; nameEn?: string | null } | null;
  insuranceCompany?: string | null;
  insurancePolicyNumber?: string | null;
  arrivalPreference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export function Patient360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    apiGet<PatientRecord>(`/patients/${id}`)
      .then(setPatient)
      .catch(() => {
        setPatient(null);
        toast('المريض غير موجود');
        navigate('/patients');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: BG }}>
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }
  if (!patient) {
    return null;
  }

  const tabs = [
    { value: 'overview', label: '📊 نظرة عامة' },
    { value: 'xrays', label: '🩻 الأشعة والمرفقات' },
    { value: 'hep', label: '💪 التمارين المنزلية' },
    { value: 'record', label: '📋 تسجيل جلسة (SOAP)' },
  ];

  const idBadge = patientIdDisplay(patient.id, patient.createdAt);

  return (
    <div
      className="min-h-screen text-gray-100"
      style={{ background: BG, fontFamily: 'Cairo, sans-serif' }}
    >
      <header
        className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b px-6 py-4"
        style={{ backgroundColor: SURFACE, borderColor: BORDER }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-cyan-400 hover:bg-cyan-500/10"
          onClick={() => navigate('/patients')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> رجوع
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-xl font-bold text-white" style={{ fontSize: '20px' }}>
            {patient.nameAr}
          </h1>
          <span
            className="rounded-lg border px-2 py-1 text-sm text-gray-300"
            style={{ borderColor: BORDER, fontFamily: "'Space Mono', monospace" }}
          >
            {idBadge}
          </span>
        </div>
        <Button
          size="sm"
          className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
          onClick={() => setTab('record')}
        >
          💾 حفظ الجلسة
        </Button>
      </header>

      <div className="border-b px-6 pt-4" style={{ borderColor: BORDER }}>
        <Tabs value={tab} onValueChange={setTab} tabs={tabs} />
      </div>

      <main className="p-6">
        <TabPanel value="overview" current={tab}>
          <div className="animate-fadeUp">
            <OverviewTab patientId={patient.id} patient={patient} />
          </div>
        </TabPanel>
        <TabPanel value="xrays" current={tab}>
          <div className="animate-fadeUp">
            <XRaysTab patientId={patient.id} toast={toast} />
          </div>
        </TabPanel>
        <TabPanel value="hep" current={tab}>
          <div className="animate-fadeUp">
            <HEPTab patientId={patient.id} toast={toast} />
          </div>
        </TabPanel>
        <TabPanel value="record" current={tab}>
          <div className="animate-fadeUp">
            <RecordSessionTab patientId={patient.id} toast={toast} onSuccess={() => { setTab('overview'); id && apiGet<PatientRecord>(`/patients/${id}`).then(setPatient); }} />
          </div>
        </TabPanel>
      </main>
    </div>
  );
}
