import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../features/auth/AdminAuthProvider';
import { Button, Panel, errorMessage, showToast } from '@haat/shared-frontend';

const adminLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Admin email or phone number is required')
    .refine((val) => val.includes('@') || /^\d{10}$/.test(val), {
      message: 'Enter a valid administrator email or 10-digit phone number',
    }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (values: AdminLoginFormValues) => {
    try {
      await login(values);
      showToast.success('Signed in successfully', 'Welcome to HAAT Governance');
      navigate('/', { replace: true });
    } catch (err) {
      showToast.error('Authentication failed', errorMessage(err));
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
                India's Marketplace
              </span>
            </div>
          </div>
          <p className="mt-3 text-caption text-ink-500">
            Marketplace operations, store management &amp; catalogue moderation.
          </p>
        </div>

        {/* Login Panel */}
        <Panel className="p-6 sm:p-8 shadow-card border border-line bg-surface">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email / Identifier Field */}
            <div>
              <label htmlFor="identifier" className="block text-label font-semibold text-ink-800">
                Admin Email or Phone
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
                  placeholder="admin@haat.com"
                  aria-invalid={Boolean(form.formState.errors.identifier)}
                  aria-describedby={form.formState.errors.identifier ? 'identifier-error' : undefined}
                  className={`block w-full rounded-lg border bg-surface pl-10 pr-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 ${
                    form.formState.errors.identifier
                      ? 'border-danger-fg focus:border-danger-fg focus:ring-danger-fg/20'
                      : 'border-line focus:border-brand-600 focus:ring-brand-600/20'
                  }`}
                  {...form.register('identifier')}
                />
              </div>
              {form.formState.errors.identifier ? (
                <p id="identifier-error" className="mt-1 text-micro text-danger-fg font-medium">
                  {form.formState.errors.identifier.message}
                </p>
              ) : null}
            </div>

            {/* Password Field with Visibility Toggle */}
            <div>
              <label htmlFor="password" className="block text-label font-semibold text-ink-800">
                Password
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                  className={`block w-full rounded-lg border bg-surface pl-10 pr-10 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 ${
                    form.formState.errors.password
                      ? 'border-danger-fg focus:border-danger-fg focus:ring-danger-fg/20'
                      : 'border-line focus:border-brand-600 focus:ring-brand-600/20'
                  }`}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p id="password-error" className="mt-1 text-micro text-danger-fg font-medium">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center h-10 font-semibold"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating…
                  </span>
                ) : (
                  'Sign In to Admin Console'
                )}
              </Button>
            </div>
          </form>
        </Panel>

        <p className="mt-6 text-center text-micro text-ink-400">
          HAAT Marketplace Governance Engine • Restricted access for authorized operators only.
        </p>
      </div>
    </div>
  );
}
