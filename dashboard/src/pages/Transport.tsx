import { useState, useEffect, useCallback } from 'react';
import { Truck, User, Car, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useToast } from '@/lib/toast';

const STATUS_FILTER = ['all', 'en_route', 'requested', 'assigned', 'arrived_at_center', 'completed'] as const;
const today = new Date().toISOString().slice(0, 10);

export function Transport() {
  const toast = useToast();
  const [requests, setRequests] = useState<unknown[]>([]);
  const [vehicles, setVehicles] = useState<unknown[]>([]);
  const [drivers, setDrivers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      apiGet<unknown[]>('/transport/requests'),
      apiGet<unknown[]>('/transport/vehicles'),
      apiGet<unknown[]>('/transport/drivers'),
    ])
      .then(([r, v, d]) => {
        setRequests(Array.isArray(r) ? r : []);
        setVehicles(Array.isArray(v) ? v : []);
        setDrivers(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = requests.filter((r: unknown) => {
    if (statusFilter === 'all') return true;
    return (r as { status?: string }).status === statusFilter;
  });
  const todayRequests = requests.filter((r: unknown) => (r as { createdAt?: string }).createdAt?.startsWith(today));
  const inTransit = requests.filter((r: unknown) => (r as { status?: string }).status === 'en_route').length;
  const completed = requests.filter((r: unknown) => {
    const s = (r as { status?: string }).status;
    return s === 'arrived_at_center' || s === 'completed';
  }).length;
  const activeVehicles = vehicles.filter((v: unknown) => (v as { status?: string }).status === 'in_use').length;
  const availableDrivers = drivers.filter((d: unknown) => (d as { isAvailable?: boolean }).isAvailable).length;

  const selected = requests.find((r: unknown) => (r as { id: string }).id === selectedId) as Record<string, unknown> | undefined;

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/transport/requests/${id}/status`, { status });
      toast('Status updated');
      load();
    } catch {
      toast('Update failed');
    }
  };

  const assignDriver = async (driverId: string, vehicleId: string) => {
    if (!selectedId) return;
    try {
      await apiPatch(`/transport/requests/${selectedId}/assign`, { driverId, vehicleId });
      toast('Driver assigned');
      setAssignOpen(false);
      load();
    } catch {
      toast('Assign failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090f] font-sans text-gray-100">
      <div className="sticky top-0 z-20 border-b border-amber-500/20 bg-[#07090f]/95 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-bold text-amber-400">Transport Management</h1>
      </div>
      <div className="p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Requests today" value={todayRequests.length} icon={<Truck className="h-5 w-5" />} />
          <StatCard title="In transit" value={inTransit} icon={<Car className="h-5 w-5" />} />
          <StatCard title="Completed" value={completed} icon={<Truck className="h-5 w-5" />} />
          <StatCard title="Active vehicles" value={activeVehicles} icon={<Car className="h-5 w-5" />} />
          <StatCard title="Available drivers" value={availableDrivers} icon={<User className="h-5 w-5" />} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTER.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  className={statusFilter === s ? 'bg-amber-500/20 text-amber-400' : 'border-amber-500/30 text-gray-400'}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </Button>
              ))}
              <Button size="sm" className="ml-auto bg-amber-500/20 text-amber-400" onClick={() => setNewRequestOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Request
              </Button>
            </div>
            <Card className="border-amber-500/20 bg-[#0b0f1a]">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-500/20">
                        <th className="px-4 py-3 text-left font-medium text-amber-400">Request</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Patient</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Pickup</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Driver</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r: unknown) => {
                        const x = r as Record<string, unknown>;
                        const isSelected = x.id === selectedId;
                        const status = (x.status as string) ?? '';
                        return (
                          <tr
                            key={x.id as string}
                            className={`cursor-pointer border-b border-amber-500/10 transition ${isSelected ? 'border-l-4 border-l-amber-500 bg-amber-500/10' : 'hover:bg-amber-500/5'}`}
                            onClick={() => setSelectedId(x.id as string)}
                          >
                            <td className="px-4 py-3 font-mono text-amber-400">TRP#{String(x.id).slice(0, 8)}</td>
                            <td className="px-4 py-3">{(x.patient as { nameAr?: string })?.nameAr ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-400">{(x.pickupAddress as string)?.slice(0, 20)}… {x.pickupTime ? new Date(x.pickupTime as string).toLocaleTimeString() : ''}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-amber-500/30 text-xs">
                                {(x.completionStatus as string) === 'round_trip' ? '🔄' : (x.completionStatus as string) === 'to_center_only' ? '→' : '←'}
                              </Badge>
                              <Badge variant="outline" className="ml-1 border-amber-500/30 text-xs">
                                {(x.mobilityNeed as string) === 'wheelchair' ? '♿' : (x.mobilityNeed as string) === 'stretcher' ? '🛏' : '🚶'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">{(x.driver as { user?: { nameAr?: string } })?.user?.nameAr ?? 'Unassigned'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${status === 'en_route' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : status === 'requested' || status === 'assigned' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {selectedId && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-amber-500/20 text-amber-400" onClick={() => setAssignOpen(true)}>Assign Driver</Button>
                <Button size="sm" variant="outline" className="border-amber-500/30" onClick={() => updateStatus(selectedId, 'en_route')}>Start Trip</Button>
                <Button size="sm" variant="outline" className="border-amber-500/30" onClick={() => updateStatus(selectedId, 'arrived_at_center')}>Arrived at Center</Button>
                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400" onClick={() => updateStatus(selectedId, 'completed')}>Complete</Button>
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => updateStatus(selectedId, 'cancelled')}>Cancel</Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selected && (
              <Card className="border-amber-500/20 bg-[#0b0f1a]">
                <CardHeader>
                  <CardTitle className="text-base text-amber-400">Live Trip Tracker</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-white">{(selected.patient as { nameAr?: string })?.nameAr}</p>
                  <p className="text-sm text-gray-400">Vehicle: {(selected.vehicle as { plateNumber?: string })?.plateNumber ?? '—'}</p>
                  <div className="relative h-24 rounded bg-[#07090f]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="h-8 w-8 text-amber-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {['Driver Assigned', 'Trip Started', 'En Route to Patient', 'Patient Picked Up', 'Arrived at Center'].map((step, i) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${i < 2 ? 'bg-amber-500 animate-pulse' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-amber-500/20 bg-[#0b0f1a]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base text-amber-400">Fleet Status</CardTitle>
                <Button size="sm" variant="ghost" className="text-amber-400" onClick={() => setNewVehicleOpen(true)}><Plus className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(vehicles as { id: string; plateNumber?: string; status?: string }[]).map((v) => (
                    <li key={v.id} className="flex items-center justify-between rounded border border-amber-500/10 px-2 py-2">
                      <span className="font-mono text-amber-400">{v.plateNumber}</span>
                      <span className={`h-2 w-2 rounded-full ${v.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-[#0b0f1a]">
              <CardHeader>
                <CardTitle className="text-base text-amber-400">Drivers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(drivers as { id: string; user?: { nameAr?: string }; vehicle?: { plateNumber?: string }; isAvailable?: boolean }[]).map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded border border-amber-500/10 px-2 py-2">
                      <div>
                        <p className="text-white">{d.user?.nameAr ?? '—'}</p>
                        <p className="text-xs text-gray-500">{d.vehicle?.plateNumber ?? 'No vehicle'}</p>
                      </div>
                      <Badge variant={d.isAvailable ? 'default' : 'secondary'} className={d.isAvailable ? 'bg-emerald-500/20 text-emerald-400' : ''}>{d.isAvailable ? 'Available' : 'Busy'}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {assignOpen && selectedId && (
        <AssignModal
          drivers={drivers as { id: string; user?: { nameAr?: string }; vehicle?: { id: string } }[]}
          vehicles={vehicles as { id: string; plateNumber?: string }[]}
          onAssign={assignDriver}
          onClose={() => setAssignOpen(false)}
        />
      )}
      {newRequestOpen && <NewRequestModal onClose={() => setNewRequestOpen(false)} onSuccess={load} />}
      {newVehicleOpen && <NewVehicleModal onClose={() => setNewVehicleOpen(false)} onSuccess={load} />}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="border-amber-500/20 bg-[#0b0f1a]">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="text-amber-400">{icon}</div>
        <div>
          <p className="text-2xl font-bold font-mono text-white">{value}</p>
          <p className="text-xs text-gray-400">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignModal({
  drivers,
  vehicles,
  onAssign,
  onClose,
}: {
  drivers: { id: string; user?: { nameAr?: string }; vehicle?: { id: string } }[];
  vehicles: { id: string; plateNumber?: string }[];
  onAssign: (driverId: string, vehicleId: string) => void;
  onClose: () => void;
}) {
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-md border-amber-500/20 bg-[#0b0f1a]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-amber-400">Assign Driver</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Driver</label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mt-1 w-full rounded border border-amber-500/30 bg-[#07090f] px-3 py-2 text-white">
              <option value="">Select</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.user?.nameAr ?? d.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Vehicle</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded border border-amber-500/30 bg-[#07090f] px-3 py-2 text-white">
              <option value="">Select</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plateNumber ?? v.id}</option>
              ))}
            </select>
          </div>
          <Button className="w-full bg-amber-500/20 text-amber-400" onClick={() => driverId && vehicleId && onAssign(driverId, vehicleId)} disabled={!driverId || !vehicleId}>
            Assign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NewRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [patientId, setPatientId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [mobilityNeed, setMobilityNeed] = useState('walking');
  const [completionStatus, setCompletionStatus] = useState('to_center_only');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!patientId || !pickupAddress || !pickupTime) return;
    setSubmitting(true);
    try {
      await apiPost<unknown>('/transport/requests', {
        appointmentId: appointmentId || undefined,
        patientId,
        pickupAddress,
        pickupTime: new Date(pickupTime).toISOString(),
        mobilityNeed,
        completionStatus,
        notes: notes || undefined,
      });
      toast('Request created');
      onSuccess();
      onClose();
    } catch (e: unknown) {
      toast('Failed: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-md border-amber-500/20 bg-[#0b0f1a]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-amber-400">New Transport Request</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Patient ID" value={patientId} onChange={setPatientId} placeholder="UUID" />
          <Input label="Appointment ID (optional)" value={appointmentId} onChange={setAppointmentId} placeholder="UUID" />
          <Input label="Pickup address" value={pickupAddress} onChange={setPickupAddress} />
          <Input label="Pickup time" type="datetime-local" value={pickupTime} onChange={setPickupTime} />
          <div>
            <label className="text-sm text-gray-400">Mobility need</label>
            <select value={mobilityNeed} onChange={(e) => setMobilityNeed(e.target.value)} className="mt-1 w-full rounded border border-amber-500/30 bg-[#07090f] px-3 py-2 text-white">
              <option value="wheelchair">Wheelchair ♿</option>
              <option value="stretcher">Stretcher 🛏</option>
              <option value="walking">Walking 🚶</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Completion</label>
            <select value={completionStatus} onChange={(e) => setCompletionStatus(e.target.value)} className="mt-1 w-full rounded border border-amber-500/30 bg-[#07090f] px-3 py-2 text-white">
              <option value="to_center_only">To center only →</option>
              <option value="from_center_only">From center only ←</option>
              <option value="round_trip">Round trip 🔄</option>
            </select>
          </div>
          <Input label="Notes" value={notes} onChange={setNotes} placeholder="Optional" />
          <Button className="w-full bg-amber-500/20 text-amber-400" onClick={submit} disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm text-gray-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded border border-amber-500/30 bg-[#07090f] px-3 py-2 text-white" />
    </div>
  );
}

function NewVehicleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [plateNumber, setPlateNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!plateNumber.trim()) return;
    setSubmitting(true);
    try {
      await apiPost<unknown>('/transport/vehicles', { plateNumber: plateNumber.trim(), accommodationType: 'all' });
      toast('Vehicle added');
      onSuccess();
      onClose();
      setPlateNumber('');
    } catch {
      toast('Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-md border-amber-500/20 bg-[#0b0f1a]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-amber-400">Add Vehicle</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Plate number" value={plateNumber} onChange={setPlateNumber} placeholder="e.g. ABC 1234" />
          <Button className="w-full bg-amber-500/20 text-amber-400" onClick={submit} disabled={submitting}>{submitting ? 'Adding…' : 'Add'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
