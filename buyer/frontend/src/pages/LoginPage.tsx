import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { loginFormSchema, type LoginFormValues } from '../features/auth/schemas';
import { useAuth } from '../features/auth/AuthProvider';
import { Button, TextField, Panel, errorMessage } from '@haat/shared-frontend';

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: '', password: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to={safeNext(searchParams.get('next'))} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.identifier, values.password);
      navigate(safeNext(searchParams.get('next')), { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <div className="mx-auto w-full max-w-auth px-4 py-12 md:py-20">
      <h1 className="text-display-md text-ink-900">Sign in</h1>
      <p className="mt-1 text-caption text-ink-500">Use the phone number or email on your HAAT account.</p>

      <Panel className="mt-6 p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <TextField
            label="Phone number or email"
            autoComplete="username"
            autoFocus
            error={errors.identifier?.message}
            {...register('identifier')}
          />
          <TextField
            label="Password"
            type="password"
            showPasswordToggle
            autoComplete="current-password"
            placeholder="••••••••"
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

          <Button type="submit" block loading={isSubmitting} loadingLabel="Signing in…">
            Sign in
          </Button>
        </form>
      </Panel>

      <p className="mt-4 text-caption text-ink-500">
        New to HAAT?{' '}
        <Link to="/register" className="font-semibold text-brand-700 underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
