import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { Button, Panel, errorMessage, showToast } from '@haat/shared-frontend';

const sellerLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Seller email or phone number is required')
    .refine((val) => val.includes('@') || /^\d{10}$/.test(val), {
      message: 'Enter a valid email address or 10-digit phone number',
    }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const sellerRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required (min 2 characters)'),
    phoneNumber: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit Indian mobile number'),
    email: z.string().trim().min(1, 'Business email is required').email('Enter a valid business email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SellerLoginFormValues = z.infer<typeof sellerLoginSchema>;
type SellerRegisterFormValues = z.infer<typeof sellerRegisterSchema>;

export function SellerLoginPage() {
  const { login, register } = useSellerAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const loginForm = useForm<SellerLoginFormValues>({
    resolver: zodResolver(sellerLoginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const registerForm = useForm<SellerRegisterFormValues>({
    resolver: zodResolver(sellerRegisterSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onLoginSubmit = async (values: SellerLoginFormValues) => {
    try {
      await login(values);
      showToast.success('Signed in successfully', 'Welcome to HAAT Seller Portal');
      navigate('/', { replace: true });
    } catch (err) {
      showToast.error('Authentication failed', errorMessage(err));
    }
  };

  const onRegisterSubmit = async (values: SellerRegisterFormValues) => {
    try {
      await register({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        email: values.email,
        password: values.password,
      });
      showToast.success('Account created', 'Now complete your store registration to begin selling.');
      navigate('/onboard', { replace: true });
    } catch (err) {
      showToast.error('Registration failed', errorMessage(err));
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas-admin px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header: <logo> <name> <tagline below name> */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3">
            <img
              src="/brand/haat-mark-128.png"
              alt="HAAT Logo"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain drop-shadow-xs"
            />
            <div className="flex flex-col text-left">
              <span className="text-2xl font-black tracking-tight text-[#16135c] leading-none font-sans">HAAT</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c6c75] mt-[2px] leading-tight">
                Seller Operations
              </span>
            </div>
          </div>
          <p className="mt-3 text-caption text-ink-500">
            {mode === 'login'
              ? 'Access your digital storefront, wholesale tiers & order management.'
              : 'Register as an independent merchant on India’s Retail & Wholesale Marketplace.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mb-4 flex rounded-lg border border-line bg-surface p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-md py-2 text-label font-bold transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 rounded-md py-2 text-label font-bold transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            New Merchant
          </button>
        </div>

        {/* Form Panel */}
        <Panel className="p-6 sm:p-8 shadow-card border border-line bg-surface">
          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="identifier" className="block text-label font-semibold text-ink-800">
                  Seller Email or Mobile
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder="seller@haat.com"
                    className="block w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    {...loginForm.register('identifier')}
                  />
                </div>
                {loginForm.formState.errors.identifier ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {loginForm.formState.errors.identifier.message}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-label font-semibold text-ink-800">
                    Password
                  </label>
                </div>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-line bg-surface pl-10 pr-10 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {loginForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full bg-[#16135c] hover:bg-[#12104b] text-white"
                  disabled={loginForm.formState.isSubmitting}
                >
                  {loginForm.formState.isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Authenticating…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In to Store
                    </span>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="reg-name" className="block text-label font-semibold text-ink-800">
                  Full Name / Proprietor Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Ramesh Chandra Roy"
                  className="mt-1.5 block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  {...registerForm.register('fullName')}
                />
                {registerForm.formState.errors.fullName ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {registerForm.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="reg-phone" className="block text-label font-semibold text-ink-800">
                  Mobile Number (10 digits)
                </label>
                <input
                  id="reg-phone"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="9876543210"
                  className="mt-1.5 block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  {...registerForm.register('phoneNumber', {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    },
                  })}
                  onKeyDown={(e) => {
                    if (
                      e.ctrlKey ||
                      e.metaKey ||
                      [
                        'Backspace',
                        'Delete',
                        'Tab',
                        'Escape',
                        'Enter',
                        'ArrowLeft',
                        'ArrowRight',
                        'ArrowUp',
                        'ArrowDown',
                        'Home',
                        'End',
                      ].includes(e.key)
                    ) {
                      return;
                    }
                    if (!/^\d$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.currentTarget;
                    target.value = target.value.replace(/\D/g, '').slice(0, 10);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text');
                    const digits = text.replace(/\D/g, '').slice(0, 10);
                    const target = e.currentTarget;
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    const current = target.value;
                    const nextVal = (current.slice(0, start) + digits + current.slice(end)).slice(0, 10);
                    target.value = nextVal;
                    registerForm.setValue('phoneNumber', nextVal, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                />
                {registerForm.formState.errors.phoneNumber ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {registerForm.formState.errors.phoneNumber.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-label font-semibold text-ink-800">
                  Business Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="merchant@example.com"
                  className="mt-1.5 block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {registerForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-label font-semibold text-ink-800">
                  Choose Password (min 6 characters)
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-line bg-surface pl-3.5 pr-10 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    {...registerForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {registerForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="block text-label font-semibold text-ink-800">
                  Confirm Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="reg-confirm-password"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-line bg-surface pl-3.5 pr-10 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    {...registerForm.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600 cursor-pointer"
                  >
                    {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword ? (
                  <p className="mt-1 text-micro text-danger-fg font-medium">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full bg-[#16135c] hover:bg-[#12104b] text-white"
                  disabled={registerForm.formState.isSubmitting}
                >
                  {registerForm.formState.isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create Merchant Account
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Panel>

        <p className="mt-6 text-center text-micro text-ink-400">
          HAAT Marketplace Seller Engine • Independent Storefront &amp; Scheduled Delivery Infrastructure
        </p>
      </div>
    </div>
  );
}
