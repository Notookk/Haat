import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerFormSchema, type RegisterFormValues } from '../features/auth/schemas';
import { useAuth } from '../features/auth/AuthProvider';
import { Button, TextField, Panel, errorMessage } from '@haat/shared-frontend';

export function RegisterPage() {
  const { status, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      password: '',
      role: 'BUYER',
    },
  });

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createAccount({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        email: values.email || undefined,
        password: values.password,
        role: 'BUYER',
      });
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <div className="mx-auto w-full max-w-auth px-4 py-12 md:py-16">
      <h1 className="text-display-md text-ink-900">Create an account</h1>
      <p className="mt-1 text-caption text-ink-500">
        Order retail singles or bulk wholesale lots with scheduled delivery.
      </p>

      <Panel className="mt-6 p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <TextField
            label="Full name"
            autoComplete="name"
            autoFocus
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <TextField
            label="Mobile number"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            autoComplete="tel"
            placeholder="10 digits"
            hint="Indian mobile numbers start with 6–9."
            error={errors.phoneNumber?.message}
            {...register('phoneNumber', {
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
              setValue('phoneNumber', nextVal, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
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
            showPasswordToggle
            autoComplete="new-password"
            placeholder="••••••••"
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError ? (
            <p
              role="alert"
              className="rounded-sm border border-danger-fg bg-danger-bg px-3 py-2 text-caption text-danger-fg"
            >
              {serverError}
            </p>
          ) : null}

          <Button type="submit" block loading={isSubmitting} loadingLabel="Creating account…">
            Create account
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
