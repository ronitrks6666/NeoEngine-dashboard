import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { authApi, getApiErrorMessage } from '@/api/auth';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { zPhone10 } from '@/lib/phoneValidation';

const superAdminSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const ownerPasswordSchema = z.object({
  identifier: z.string().min(1, 'Enter email or phone'),
  password: z.string().min(1, 'Password required'),
});

const ownerOtpPhoneSchema = z.object({
  phone: zPhone10,
});

const ownerOtpVerifySchema = z.object({
  otp: z.string().length(6, 'Enter 6-digit OTP'),
});

type SuperAdminForm = z.infer<typeof superAdminSchema>;
type OwnerPasswordForm = z.infer<typeof ownerPasswordSchema>;
type OwnerOtpPhoneForm = z.infer<typeof ownerOtpPhoneSchema>;
type OwnerOtpVerifyForm = z.infer<typeof ownerOtpVerifySchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { loginAsSuperAdmin, loginAsOwner, loginAsOwnerWithOtp } = useAuth();
  const [mode, setMode] = useState<'superadmin' | 'owner'>('owner');
  const [ownerAuthMode, setOwnerAuthMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone');
  const [otpPhone, setOtpPhone] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const superAdminForm = useForm<SuperAdminForm>({
    resolver: zodResolver(superAdminSchema),
    defaultValues: { email: '', password: '' },
  });

  const ownerPasswordForm = useForm<OwnerPasswordForm>({
    resolver: zodResolver(ownerPasswordSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const ownerOtpPhoneForm = useForm<OwnerOtpPhoneForm>({
    resolver: zodResolver(ownerOtpPhoneSchema),
    defaultValues: { phone: '' },
  });

  const ownerOtpVerifyForm = useForm<OwnerOtpVerifyForm>({
    resolver: zodResolver(ownerOtpVerifySchema),
    defaultValues: { otp: '' },
  });

  const onSuperAdminSubmit = async (data: SuperAdminForm) => {
    setError('');
    try {
      await loginAsSuperAdmin(data.email, data.password);
      navigate('/super-admin/dashboard');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    }
  };

  const onOwnerPasswordSubmit = async (data: OwnerPasswordForm) => {
    setError('');
    try {
      const identifier = data.identifier.trim();
      const cleaned = String(identifier).replace(/\D/g, '');
      const isPhoneLogin = identifier.includes('@') ? false : cleaned.length === 10;
      const { isFirstLogin } = await loginAsOwner(
        isPhoneLogin ? cleaned : identifier,
        data.password,
        isPhoneLogin
      );
      if (isFirstLogin) {
        navigate('/owner/set-password');
      } else {
        navigate('/owner/dashboard');
      }
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    }
  };

  const onOwnerOtpSend = async (data: OwnerOtpPhoneForm) => {
    setError('');
    try {
      await authApi.sendOtp(data.phone);
      setOtpPhone(String(data.phone).replace(/\D/g, ''));
      setOtpStep('verify');
      ownerOtpVerifyForm.reset({ otp: '' });
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    }
  };

  const onOwnerOtpVerify = async (data: OwnerOtpVerifyForm) => {
    setError('');
    try {
      const { isFirstLogin } = await loginAsOwnerWithOtp(otpPhone, data.otp);
      if (isFirstLogin) {
        navigate('/owner/set-password');
      } else {
        navigate('/owner/dashboard');
      }
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    }
  };

  const PasswordInput = ({
    fieldProps,
    error,
    placeholder = 'Password',
  }: {
    fieldProps: React.InputHTMLAttributes<HTMLInputElement>;
    error?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{placeholder}</label>
      <div className="relative">
        <input
          {...fieldProps}
          type={showPassword ? 'text' : 'password'}
          className="w-full px-3 py-2 pr-10 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-emerald-lg border border-emerald-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <NeoEngineLogo size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
            NeoEngine Dashboard
          </h1>
        </div>

        <div className="flex border-b mb-6">
          <button
            type="button"
            onClick={() => { setMode('owner'); setError(''); setOtpStep('phone'); }}
            className={`flex-1 py-2 text-sm font-medium ${mode === 'owner' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          >
            Owner
          </button>
          <button
            type="button"
            onClick={() => { setMode('superadmin'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium ${mode === 'superadmin' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          >
            Super Admin
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {mode === 'superadmin' ? (
          <form onSubmit={superAdminForm.handleSubmit(onSuperAdminSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...superAdminForm.register('email')}
                type="email"
                className="w-full px-3 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                placeholder="admin@example.com"
              />
              {superAdminForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{superAdminForm.formState.errors.email.message}</p>
              )}
            </div>
            <PasswordInput
              fieldProps={superAdminForm.register('password')}
              error={superAdminForm.formState.errors.password?.message}
            />
            <button
              type="submit"
              disabled={superAdminForm.formState.isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
            >
              {superAdminForm.formState.isSubmitting ? 'Signing in...' : 'Sign in as Super Admin'}
            </button>
          </form>
        ) : ownerAuthMode === 'password' ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOwnerAuthMode('password')}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-100 text-emerald-700"
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setOwnerAuthMode('otp'); setError(''); setOtpStep('phone'); }}
                className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
              >
                OTP
              </button>
            </div>
            <form onSubmit={ownerPasswordForm.handleSubmit(onOwnerPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
                <input
                  {...ownerPasswordForm.register('identifier')}
                  type="text"
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="email@example.com or 9876543210"
                />
                {ownerPasswordForm.formState.errors.identifier && (
                  <p className="mt-1 text-sm text-red-600">{ownerPasswordForm.formState.errors.identifier.message}</p>
                )}
              </div>
              <PasswordInput
                fieldProps={ownerPasswordForm.register('password')}
                error={ownerPasswordForm.formState.errors.password?.message}
              />
              <button
                type="submit"
                disabled={ownerPasswordForm.formState.isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
              >
                {ownerPasswordForm.formState.isSubmitting ? 'Signing in...' : 'Sign in as Owner'}
              </button>
            </form>
          </>
        ) : otpStep === 'phone' ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOwnerAuthMode('password')}
                className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setOwnerAuthMode('otp')}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-emerald-100 text-emerald-700"
              >
                OTP
              </button>
            </div>
            <form onSubmit={ownerOtpPhoneForm.handleSubmit(onOwnerOtpSend)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <Controller
                  name="phone"
                  control={ownerOtpPhoneForm.control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tracking-wide"
                      placeholder="9876543210"
                    />
                  )}
                />
                {ownerOtpPhoneForm.formState.errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{ownerOtpPhoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={ownerOtpPhoneForm.formState.isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
              >
                {ownerOtpPhoneForm.formState.isSubmitting ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={ownerOtpVerifyForm.handleSubmit(onOwnerOtpVerify)} className="space-y-4">
            <p className="text-sm text-gray-600">OTP sent to ****{otpPhone.slice(-4)}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                {...ownerOtpVerifyForm.register('otp')}
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-center text-lg tracking-widest"
                placeholder="000000"
              />
              {ownerOtpVerifyForm.formState.errors.otp && (
                <p className="mt-1 text-sm text-red-600">{ownerOtpVerifyForm.formState.errors.otp.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={ownerOtpVerifyForm.formState.isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
            >
              {ownerOtpVerifyForm.formState.isSubmitting ? 'Verifying...' : 'Verify & Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setOtpStep('phone'); setError(''); }}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
