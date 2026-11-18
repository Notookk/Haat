import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { registerFormSchema, type RegisterFormValues } from '../features/auth/schemas';
import { useAuth } from '../features/auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Panel } from '../components/ui/Panel';
import { errorMessage } from '../lib/api-client';

export function RegisterPage() {
  const { status, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const wantsSeller = searchParams.get('role') === 'SELLER';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      password: '',
      role: wantsSeller ? 'SELLER' : 'BUYER',
    },
  });

  const role = watch('role');

  if (status === 'authenticated') {
    return <Navigate to={role === 'SELLER' ? '/seller/onboarding' : '/'} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createAccount({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        email: values.email || undefined,
        password: values.password,
        role: values.role,
      });
      navigate(values.role === 'SELLER' ? '/seller/onboarding' : '/', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <div className="mx-auto w-full max-w-auth px-4 py-12 md:py-16">
      <h1 className="text-display-md text-ink-900">Create an account</h1>
      <p className="mt-1 text-caption text-ink-500">One account works for buying and, after onboarding, for selling.</p>

      <Panel className="mt-6 p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <fieldset>
            <legend className="field-label">I am here to</legend>
            <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
              {(
                [
                  { value: 'BUYER', title: 'Buy', detail: 'Retail and bulk' },
                  { value: 'SELLER', title: 'Sell', detail: 'Open a store' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={role === option.value}
                  onClick={() => setValue('role', option.value, { shouldValidate: true })}
                  className={clsx(
                    'rounded-md border px-3 py-2 text-left transition-colors duration-120 ease-out',
                    role === option.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-line-strong bg-surface hover:border-ink-300',
                  )}
                >
                  <span className={clsx('block text-label', role === option.value ? 'text-brand-700' : 'text-ink-800')}>
                    {option.title}
                  </span>
                  <span className="block text-caption text-ink-500">{option.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <TextField label="Full name" autoComplete="name" autoFocus error={errors.fullName?.message} {...register('fullName')} />
          <TextField
            label="Mobile number"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10 digits"
            hint="Indian mobile numbers start with 6–9."
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            optional
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError ? (
            <p role="alert" className="rounded-sm border border-danger-fg bg-danger-bg px-3 py-2 text-caption text-danger-fg">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" block loading={isSubmitting} loadingLabel="Creating account…">
            {role === 'SELLER' ? 'Create seller account' : 'Create account'}
          </Button>
        </form>
      </Panel>

      <p className="mt-4 text-caption text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
