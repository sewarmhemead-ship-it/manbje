import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const titles: Record<string, string> = {
  appointments: 'Appointments',
  patients: 'Patients',
  transport: 'Transport',
  equipment: 'Equipment',
  settings: 'Settings',
};

export function Placeholder() {
  const path = useLocation().pathname.replace(/^\//, '') || 'dashboard';
  const title = titles[path] ?? path;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will be fully implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
