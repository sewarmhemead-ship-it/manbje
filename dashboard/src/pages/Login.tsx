import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-2xl font-bold text-primary">PT</span>
          </div>
          <CardTitle className="text-2xl">مركز العلاج الفيزيائي</CardTitle>
          <p className="text-sm text-muted-foreground">تسجيل الدخول إلى لوحة التحكم</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl"
            />
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
            {import.meta.env.VITE_DEMO_MODE === 'true' && (
              <p className="text-center text-xs text-muted-foreground">وضع العرض التجريبي — أي بيانات تدخل ستمر مباشرة</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
