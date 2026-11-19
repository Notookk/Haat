import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Lock, User, ShieldCheck, LogOut, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, Button, Panel, TextField, Notice, showToast, showConfirm, errorMessage, Badge } from '@haat/shared-frontend';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function SellerSettingsPage() {
  const { user, seller, logout } = useSellerAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const newPasswordVal = watch('newPassword') || '';
  const confirmPasswordVal = watch('confirmPassword') || '';

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsChangingPassword(true);
    try {
      await api.patch('/api/v1/seller/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccessMsg('Your account password has been updated successfully.');
      showToast.success('Password Updated', 'Your seller account password has been updated.');
      reset();
    } catch (err) {
      const msg = errorMessage(err);
      setErrorMsg(msg);
      showToast.error('Password Update Failed', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Account &amp; Security Settings</h1>
          <p className="mt-1 text-caption text-ink-500">
            Manage your personal login credentials, merchant identity details, and active seller session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={seller?.status === 'ACTIVE' ? 'success' : 'warning'}>
            {seller?.status || 'Active Session'}
          </Badge>
          <span className="font-mono text-micro text-ink-400">ID: {user?.id?.slice(-8)}</span>
        </div>
      </header>

      {/* Main Full-Width Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: 6 of 12 columns (~50% width) */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Seller Identity Profile */}
          <Panel className="p-5 md:p-6 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-brand-600" />
                <h2 className="text-subtitle font-bold text-ink-900">Seller Identity Details</h2>
              </div>
              <Badge tone="brand">Verified Profile</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-micro font-bold uppercase tracking-wider text-ink-400">Full Name</label>
                <div className="w-full rounded-md border border-line bg-surface-sunken px-3.5 py-2.5 text-label font-semibold text-ink-900">
                  {user?.fullName || 'N/A'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-micro font-bold uppercase tracking-wider text-ink-400">Registered Phone</label>
                <div className="w-full rounded-md border border-line bg-surface-sunken px-3.5 py-2.5 font-mono text-label font-semibold text-ink-900">
                  {user?.phoneNumber || 'N/A'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-micro font-bold uppercase tracking-wider text-ink-400">Login Email Address</label>
                <div className="w-full rounded-md border border-line bg-surface-sunken px-3.5 py-2.5 text-label font-semibold text-ink-900">
                  {user?.email || 'N/A'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-micro font-bold uppercase tracking-wider text-ink-400">Storefront Assigned</label>
                <div className="w-full rounded-md border border-line bg-surface-sunken px-3.5 py-2.5 text-label font-semibold text-ink-900">
                  {seller?.storeName || 'N/A'}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-sunken/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-ink-800 font-bold text-label">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Merchant Account Privileges</span>
              </div>
              <p className="text-micro text-ink-500">
                Your credentials grant administrative access to product catalogue publishing, order processing, and
                delivery slot scheduling for <strong>{seller?.storeName || 'your store'}</strong>.
              </p>
            </div>
          </Panel>

          {/* 2. Session Control & Sign Out */}
          <Panel className="p-5 md:p-6 border-l-4 border-l-rose-500 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <LogOut className="h-5 w-5 text-rose-600" />
              <h2 className="text-subtitle font-bold text-ink-900">Active Seller Session</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-label font-semibold text-ink-800">Sign out of this device</p>
                <p className="text-caption text-ink-500 mt-0.5">
                  Terminates your current JWT session and clears authentication tokens. You will need your login
                  credentials to sign back in.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                className="shrink-0"
                onClick={async () => {
                  const confirmed = await showConfirm({
                    title: 'Sign Out?',
                    text: 'Are you sure you want to sign out of the HAAT Seller Console?',
                    confirmButtonText: 'Yes, sign out',
                    danger: false,
                  });
                  if (confirmed) {
                    await logout();
                    showToast.info('Signed Out', 'Your session has ended.');
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
              </Button>
            </div>
          </Panel>
        </div>

        {/* Right Column: 6 of 12 columns (~50% width) */}
        <div className="lg:col-span-6 space-y-6">
          {/* 3. Password Management Form */}
          <Panel className="p-5 md:p-6 space-y-5 shadow-2xs border-brand-200">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-600" />
                <h2 className="text-subtitle font-bold text-ink-900">Change Account Password</h2>
              </div>
              <span className="text-micro font-bold text-ink-400">Security</span>
            </div>

            <form onSubmit={handleSubmit(onPasswordSubmit)} noValidate className="space-y-4 w-full">
              {errorMsg && (
                <Notice tone="danger" title="Password update failed">
                  {errorMsg}
                </Notice>
              )}

              {successMsg && (
                <Notice tone="success" title="Success">
                  {successMsg}
                </Notice>
              )}

              <TextField
                label="Current Password"
                type="password"
                placeholder="Enter your existing account password"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="New Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  error={errors.newPassword?.message}
                  {...register('newPassword')}
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-type new password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </div>

              {/* Password Requirements Helper */}
              <div className="rounded-lg border border-line bg-surface-sunken p-3 space-y-2">
                <p className="text-micro font-bold uppercase tracking-wider text-ink-500">Password Checklist</p>
                <div className="grid grid-cols-2 gap-2 text-micro">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        newPasswordVal.length >= 8 ? 'text-emerald-600' : 'text-ink-300'
                      }`}
                    />
                    <span className={newPasswordVal.length >= 8 ? 'text-ink-800 font-medium' : 'text-ink-400'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        newPasswordVal && newPasswordVal === confirmPasswordVal
                          ? 'text-emerald-600'
                          : 'text-ink-300'
                      }`}
                    />
                    <span
                      className={
                        newPasswordVal && newPasswordVal === confirmPasswordVal
                          ? 'text-ink-800 font-medium'
                          : 'text-ink-400'
                      }
                    >
                      Passwords match
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  loading={isChangingPassword}
                  loadingLabel="Updating Password..."
                  className="w-full sm:w-auto bg-[#16135c] hover:bg-[#12104b] text-white"
                >
                  Update Account Password
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
