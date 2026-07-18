import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { authApi, getApiErrorMessage } from '@/api/auth';
import { getDefaultEmployeeDashboardPath } from '@/lib/webDashboardAccess';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { zPhone10 } from '@/lib/phoneValidation';

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

type OwnerPasswordForm = z.infer<typeof ownerPasswordSchema>;
type OwnerOtpPhoneForm = z.infer<typeof ownerOtpPhoneSchema>;
type OwnerOtpVerifyForm = z.infer<typeof ownerOtpVerifySchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { loginAsOwner, loginAsOwnerWithOtp } = useAuth();
  const [ownerAuthMode, setOwnerAuthMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone');
  const [otpPhone, setOtpPhone] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const onOwnerPasswordSubmit = async (data: OwnerPasswordForm) => {
    setError('');
    try {
      const identifier = data.identifier.trim();
      const cleaned = String(identifier).replace(/\D/g, '');
      const isPhoneLogin = identifier.includes('@') ? false : cleaned.length === 10;
      const { isFirstLogin, userType } = await loginAsOwner(
        isPhoneLogin ? cleaned : identifier,
        data.password,
        isPhoneLogin
      );
      if (userType === 'EMPLOYEE') {
        const perms = useAuth.getState().featurePermissions;
        navigate(getDefaultEmployeeDashboardPath(perms));
        return;
      }
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
      const { isFirstLogin, userType } = await loginAsOwnerWithOtp(otpPhone, data.otp);
      if (userType === 'EMPLOYEE') {
        const perms = useAuth.getState().featurePermissions;
        navigate(getDefaultEmployeeDashboardPath(perms));
        return;
      }
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
    error: fieldError,
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
          data-testid={placeholder === 'Password' ? 'login-password' : undefined}
          type={showPassword ? 'text' : 'password'}
          className="w-full px-3 py-2 pr-10 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs font-medium"
          tabIndex={-1}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-emerald-lg border border-emerald-100 p-8 mx-4">
        <div className="flex flex-col items-center mb-6">
          <NeoEngineLogo size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
            NeoEngine
          </h1>
          <p className="text-sm text-emerald-700/80 mt-1">Owner & merchant sign in</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 leading-relaxed">
            {error}
          </div>
        )}

        {ownerAuthMode === 'password' ? (
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
                onClick={() => {
                  setOwnerAuthMode('otp');
                  setError('');
                  setOtpStep('phone');
                }}
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
                  data-testid="login-identifier"
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="email@example.com or 9876543210"
                />
                {ownerPasswordForm.formState.errors.identifier && (
                  <p className="mt-1 text-sm text-red-600">
                    {ownerPasswordForm.formState.errors.identifier.message}
                  </p>
                )}
              </div>
              <PasswordInput
                fieldProps={ownerPasswordForm.register('password')}
                error={ownerPasswordForm.formState.errors.password?.message}
              />
              <button
                type="submit"
                data-testid="login-submit"
                disabled={ownerPasswordForm.formState.isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
              >
                {ownerPasswordForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
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
                  <p className="mt-1 text-sm text-red-600">
                    {ownerOtpPhoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={ownerOtpPhoneForm.formState.isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
              >
                {ownerOtpPhoneForm.formState.isSubmitting ? 'Sending…' : 'Send OTP'}
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
                <p className="mt-1 text-sm text-red-600">
                  {ownerOtpVerifyForm.formState.errors.otp.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={ownerOtpVerifyForm.formState.isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-emerald disabled:opacity-50 transition-all"
            >
              {ownerOtpVerifyForm.formState.isSubmitting ? 'Verifying…' : 'Verify & Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOtpStep('phone');
                setError('');
              }}
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
