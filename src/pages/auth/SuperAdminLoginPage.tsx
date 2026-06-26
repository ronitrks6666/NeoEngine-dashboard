import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/api/auth';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type FormValues = z.infer<typeof schema>;

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { loginAsSuperAdmin } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      await loginAsSuperAdmin(data.email, data.password);
      navigate('/super-admin/dashboard');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mx-4">
        <div className="flex flex-col items-center mb-6">
          <NeoEngineLogo size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">Platform operations console</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...form.register('email')}
              type="email"
              autoComplete="email"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              placeholder="admin@example.com"
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                {...form.register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Merchant login?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Go to owner sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
