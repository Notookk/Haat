import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Store,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  api,
  Button,
  Panel,
  TextField,
  TextAreaField,
  Notice,
  Badge,
  SkeletonBlock,
  ErrorState,
  errorMessage,
  showToast,
} from '@haat/shared-frontend';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';

interface StoreProfileData {
  _id: string;
  storeName: string;
  storeSlug: string;
  storeAddress?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  isOpen?: boolean;
  businessPhone?: string | null;
  businessEmail?: string | null;
  status: string;
  isVerified: boolean;
  isActive: boolean;
  servicePincodes: string[];
}

const storeUpdateSchema = z.object({
  storeName: z.string().trim().min(2, 'Store name must be at least 2 characters').max(80),
  storeAddress: z.string().trim().max(300).optional().or(z.literal('')),
  description: z.string().trim().max(600).optional().or(z.literal('')),
  logoUrl: z.string().trim().optional().or(z.literal('')),
  bannerUrl: z.string().trim().optional().or(z.literal('')),
  businessPhone: z
    .string({ required_error: 'Business phone number is mandatory' })
    .trim()
    .min(1, 'Business phone number is mandatory so buyers can call your store')
    .regex(/^(?:\+91|91)?[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number (e.g. 9876543210 or +919876543210)'),
  businessEmail: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  servicePincodesText: z.string().optional().or(z.literal('')),
  isOpen: z.boolean(),
});

type StoreUpdateValues = z.infer<typeof storeUpdateSchema>;

export function SellerStorePage() {
  const { user, reloadProfile } = useSellerAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<StoreProfileData>({
    queryKey: ['seller', 'store-profile'],
    queryFn: async () => {
      const res = await api.get<{ seller: StoreProfileData }>('/api/v1/seller/profile/me');
      return res.data.seller;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StoreUpdateValues>({
    resolver: zodResolver(storeUpdateSchema),
    defaultValues: {
      storeName: '',
      storeAddress: '',
      description: '',
      logoUrl: '',
      bannerUrl: '',
      businessPhone: '',
      businessEmail: '',
      servicePincodesText: '',
      isOpen: true,
    },
  });

  const isOpenVal = watch('isOpen');
  const servicePincodesTextVal = watch('servicePincodesText');
  const descriptionVal = watch('description') || '';

  // Parse pincodes for preview chips
  const parsedPincodes = (servicePincodesTextVal || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  useEffect(() => {
    if (profile) {
      reset({
        storeName: profile.storeName,
        storeAddress: profile.storeAddress || '',
        description: profile.description || '',
        logoUrl: profile.logoUrl || '',
        bannerUrl: profile.bannerUrl || '',
        businessPhone: profile.businessPhone || user?.phoneNumber || '',
        businessEmail: profile.businessEmail || '',
        servicePincodesText: (profile.servicePincodes || []).join(', '),
        isOpen: profile.isOpen !== false,
      });
    }
  }, [profile, user, reset]);

  const updateMutation = useMutation({
    mutationFn: async (values: StoreUpdateValues) => {
      let servicePincodes: string[] | undefined = undefined;
      if (values.servicePincodesText !== undefined) {
        const parsed = values.servicePincodesText
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        if (parsed.length > 0) {
          const invalid = parsed.find((p) => !/^\d{6}$/.test(p));
          if (invalid) {
            throw new Error(`Pincode "${invalid}" is invalid. Each pincode must be a 6-digit number.`);
          }
          servicePincodes = parsed;
        } else {
          servicePincodes = [];
        }
      }

      const payload = {
        storeName: values.storeName,
        storeAddress: values.storeAddress ? values.storeAddress.trim() : null,
        description: values.description ? values.description.trim() : null,
        logoUrl: values.logoUrl ? values.logoUrl.trim() : null,
        bannerUrl: values.bannerUrl ? values.bannerUrl.trim() : null,
        businessPhone: values.businessPhone ? values.businessPhone.trim() : null,
        businessEmail: values.businessEmail ? values.businessEmail.trim() : null,
        isOpen: values.isOpen,
        ...(servicePincodes !== undefined && { servicePincodes }),
      };
      const res = await api.patch<{ seller: StoreProfileData }>('/api/v1/seller/profile/me', payload);
      return res.data.seller;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['seller', 'store-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard', 'stats'] });
      await reloadProfile();
      showToast.success('Store updated', 'Store information saved successfully.');
    },
    onError: (err) => {
      const msg = errorMessage(err);
      setServerError(msg);
      showToast.error('Update failed', msg);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    await updateMutation.mutateAsync(values);
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-5">
        <SkeletonBlock className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <SkeletonBlock className="h-48 w-full" />
            <SkeletonBlock className="h-36 w-full" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <SkeletonBlock className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="w-full">
        <ErrorState message={errorMessage(error) || 'Failed to load store profile.'} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">My Store</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-micro font-bold border tracking-wide ${
                profile.status === 'ACTIVE'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-amber-500 text-amber-700 bg-amber-50'
              }`}
            >
              {profile.status}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-micro font-bold border tracking-wide ${
                isOpenVal
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-amber-500 text-amber-700 bg-amber-50'
              }`}
            >
              {isOpenVal ? 'Open for Orders' : 'Temporarily Closed'}
            </span>
          </div>
          <p className="mt-1 text-caption text-ink-500">
            Manage your store identity, operating status, contact channels, and delivery coverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void onSubmit()}
            loading={isSubmitting}
            loadingLabel="Saving..."
            className="bg-[#16135c] hover:bg-[#12104b] text-white"
          >
            Save Store Details
          </Button>
        </div>
      </header>

      {serverError && (
        <Notice tone="danger" title="Could not update store details">
          {serverError}
        </Notice>
      )}

      {/* Main Full-Width Form Grid */}
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: 7 of 12 columns (~58% width) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Operating Status Card */}
          <Panel className="p-5 border-l-4 border-l-brand-600 shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-subtitle font-bold text-ink-900">Store Operating Status</h2>
                <p className="text-caption text-ink-500 mt-0.5">
                  Toggle whether buyers can place new scheduled orders and purchase products from your storefront.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isOpenVal}
                  onChange={(e) => setValue('isOpen', e.target.checked, { shouldDirty: true })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </Panel>

          {/* 2. Store Information */}
          <Panel className="p-5 md:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Store className="h-5 w-5 text-brand-600" />
              <h2 className="text-subtitle font-bold text-ink-900">Store Information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Store Name *"
                placeholder="e.g. ABCD Store"
                error={errors.storeName?.message}
                {...register('storeName')}
              />
              <TextField
                label="Store Physical Address"
                placeholder="Shop No, Street, City, State"
                error={errors.storeAddress?.message}
                {...register('storeAddress')}
              />
            </div>

            <div>
              <TextAreaField
                label="Store Description"
                rows={3}
                placeholder="Tell buyers what your store specializes in, quality standards, or delivery promises..."
                error={errors.description?.message}
                {...register('description')}
              />
              <p className="mt-1 text-right text-micro text-ink-400">{descriptionVal.length} / 600 characters</p>
            </div>
          </Panel>

          {/* 3. Business Contact Information (Mandatory Phone & Optional Email) */}
          <Panel className="p-5 md:p-6 space-y-4 shadow-2xs border-brand-200">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Phone className="h-5 w-5 text-brand-600" />
              <h2 className="text-subtitle font-bold text-ink-900">Business Contact Information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Mandatory Phone Number */}
              <div>
                <label className="block text-label font-bold text-ink-800 mb-1">
                  Business Phone Number <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210 or +919876543210"
                    className={`w-full h-10 rounded-md border pl-9 pr-3 text-body text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-1 ${
                      errors.businessPhone
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-line-strong bg-surface focus:border-brand-500 focus:ring-brand-500'
                    }`}
                    {...register('businessPhone')}
                  />
                </div>
                {errors.businessPhone?.message ? (
                  <p className="mt-1 text-micro text-rose-600 font-medium">{errors.businessPhone.message}</p>
                ) : null}
              </div>

              {/* Optional Email Address */}
              <div>
                <label className="block text-label font-bold text-ink-800 mb-1">
                  Business Email Address <span className="text-ink-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="contact@mystore.in"
                    className={`w-full h-10 rounded-md border pl-9 pr-3 text-body text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-1 ${
                      errors.businessEmail
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-line-strong bg-surface focus:border-brand-500 focus:ring-brand-500'
                    }`}
                    {...register('businessEmail')}
                  />
                </div>
                {errors.businessEmail?.message ? (
                  <p className="mt-1 text-micro text-rose-600 font-medium">{errors.businessEmail.message}</p>
                ) : null}
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: 5 of 12 columns (~42% width) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Service Area Pincodes Management */}
          <Panel className="p-5 md:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <MapPin className="h-5 w-5 text-brand-600" />
              <h2 className="text-subtitle font-bold text-ink-900">Service Area Pincodes</h2>
            </div>

            <div>
              <TextField
                label="Serviceable Pincodes (Comma-separated 6-digit PIN codes)"
                placeholder="e.g. 700001, 700019, 741235, 700091"
                optional
                error={errors.servicePincodesText?.message}
                {...register('servicePincodesText')}
              />
              <p className="mt-1.5 text-micro text-ink-400">
                Only buyers located in these postal codes will be eligible for delivery checkout from your store.
              </p>

              {parsedPincodes.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-line">
                  <span className="text-micro font-bold uppercase text-ink-400 mr-1">Active Pincodes:</span>
                  {parsedPincodes.map((pin) => (
                    <span
                      key={pin}
                      className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-micro font-bold bg-surface-sunken border border-line text-ink-700"
                    >
                      {pin}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-[#16135c] hover:bg-[#12104b] text-white"
              loading={isSubmitting}
              loadingLabel="Saving Changes..."
            >
              Save Store Details
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
