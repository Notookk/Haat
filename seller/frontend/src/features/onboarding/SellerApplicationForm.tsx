import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Store, MapPin, ShieldCheck, Landmark, CheckCircle2, ArrowLeft, RotateCcw } from 'lucide-react';
import { GSTIN_REGEX, IFSC_REGEX, PAN_REGEX, PINCODE_REGEX } from '@haat/shared-contracts';
import { errorMessage, Button, TextAreaField, TextField, Notice, Panel, showToast, api } from '@haat/shared-frontend';
import { useSellerAuth } from '../auth/SellerAuthProvider';

export const onboardingSchema = z.object({
  storeName: z.string().trim().min(2, 'Enter your store name').max(80),
  storeAddress: z.string().trim().min(3, 'Enter your physical store / pickup address').max(300),
  description: z.string().trim().max(600, 'Keep it under 600 characters').optional(),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN'),
  panNumber: z.string().trim().toUpperCase().regex(PAN_REGEX, 'Enter a valid 10-character PAN'),
  bankAccountName: z.string().trim().min(2, 'Enter the account holder name').max(120),
  bankAccountNo: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  bankIfscCode: z.string().trim().toUpperCase().regex(IFSC_REGEX, 'Enter a valid IFSC code'),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

interface SellerApplicationFormProps {
  isEditing?: boolean;
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
}

export function SellerApplicationForm({
  isEditing = false,
  onCancel,
  onSubmitSuccess,
}: SellerApplicationFormProps) {
  const { seller, onboardStore, resubmitApplication, reloadProfile } = useSellerAuth();

  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pincodeDraft, setPincodeDraft] = useState('');
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      storeName: seller?.storeName || '',
      storeAddress: seller?.storeAddress || '',
      description: seller?.description || '',
      gstin: seller?.gstin || '',
      panNumber: seller?.panNumber || '',
      bankAccountName: seller?.bankAccountName || '',
      bankAccountNo: seller?.bankAccountNo || '',
      bankIfscCode: seller?.bankIfscCode || '',
    },
  });

  const hasInitializedRef = useRef(false);

  // Prefill existing application response data when editing (runs once upon mount)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Fetch authoritative full profile from backend to ensure all fields are fresh
    if (isEditing) {
      api
        .get<{ seller: any }>('/api/v1/seller/profile/me')
        .then((res) => {
          const s = res.data?.seller;
          if (s) {
            reset({
              storeName: s.storeName || '',
              storeAddress: s.storeAddress || '',
              description: s.description || '',
              gstin: s.gstin || '',
              panNumber: s.panNumber || '',
              bankAccountName: s.bankAccountName || '',
              bankAccountNo: s.bankAccountNo || '',
              bankIfscCode: s.bankIfscCode || '',
            });
            if (Array.isArray(s.servicePincodes)) {
              setPincodes(s.servicePincodes);
            }
          }
        })
        .catch(() => {
          if (seller) {
            reset({
              storeName: seller.storeName || '',
              storeAddress: seller.storeAddress || '',
              description: seller.description || '',
              gstin: seller.gstin || '',
              panNumber: seller.panNumber || '',
              bankAccountName: seller.bankAccountName || '',
              bankAccountNo: seller.bankAccountNo || '',
              bankIfscCode: seller.bankIfscCode || '',
            });
            if (seller.servicePincodes && seller.servicePincodes.length > 0) {
              setPincodes(seller.servicePincodes);
            }
          }
        })
        .finally(() => {
          setInitialLoading(false);
        });
    } else if (seller) {
      reset({
        storeName: seller.storeName || '',
        storeAddress: seller.storeAddress || '',
        description: seller.description || '',
        gstin: seller.gstin || '',
        panNumber: seller.panNumber || '',
        bankAccountName: seller.bankAccountName || '',
        bankAccountNo: seller.bankAccountNo || '',
        bankIfscCode: seller.bankIfscCode || '',
      });
      if (seller.servicePincodes && seller.servicePincodes.length > 0) {
        setPincodes(seller.servicePincodes);
      }
    }
  }, [isEditing, reset, seller]);

  const addPincode = (raw: string) => {
    const value = raw.replace(/\D/g, '').slice(0, 6);
    if (!value) return;
    if (!PINCODE_REGEX.test(value)) {
      setPincodeError('Enter a 6-digit pincode starting with 1–9.');
      return;
    }
    if (pincodes.includes(value)) {
      setPincodeDraft('');
      setPincodeError(null);
      return;
    }
    if (pincodes.length >= 200) {
      setPincodeError('Up to 200 pincodes allowed.');
      return;
    }
    setPincodes((current) => [...current, value]);
    setPincodeDraft('');
    setPincodeError(null);
  };

  const removePincode = (code: string) => {
    setPincodes((current) => current.filter((c) => c !== code));
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (pincodes.length === 0) {
      setPincodeError('Add at least one serviceable pincode.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await resubmitApplication({
          storeName: values.storeName,
          storeAddress: values.storeAddress,
          description: values.description || undefined,
          gstin: values.gstin,
          panNumber: values.panNumber,
          bankAccountName: values.bankAccountName,
          bankAccountNo: values.bankAccountNo,
          bankIfscCode: values.bankIfscCode,
          servicePincodes: pincodes,
        });
        await reloadProfile();
        showToast.success('Application updated', 'Your updated response has been submitted for administrative review.');
      } else {
        await onboardStore({
          storeName: values.storeName,
          storeAddress: values.storeAddress,
          description: values.description || undefined,
          gstin: values.gstin,
          panNumber: values.panNumber,
          bankAccountName: values.bankAccountName,
          bankAccountNo: values.bankAccountNo,
          bankIfscCode: values.bankIfscCode,
          servicePincodes: pincodes,
        });
        showToast.success('Store application submitted', 'Your store is awaiting administrator approval.');
      }
      onSubmitSuccess?.();
    } catch (error) {
      const msg = errorMessage(error);
      setServerError(msg);
      showToast.error(isEditing ? 'Update failed' : 'Onboarding failed', msg);
    } finally {
      setSubmitting(false);
    }
  });

  if (initialLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-xs text-ink-500 font-medium">Loading your previous response...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Header */}
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-line/60 pb-5">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:text-ink-900 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Review Status</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-700/10">
              <Store className="h-3.5 w-3.5" />
              {isEditing ? 'Edit Application' : 'Store Setup'}
            </span>
            <span className="text-xs text-ink-500">
              {isEditing
                ? '• Update your response and resubmit for review'
                : '• Complete store details to activate merchant account'}
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {isEditing ? 'Edit Store Application' : 'Setup Your Store'}
          </h1>
          <p className="mt-0.5 text-sm text-ink-600">
            {isEditing
              ? 'Update your storefront profile, business tax identifiers (PAN & GSTIN), and settlement bank account.'
              : 'Enter storefront profile, business identifiers (PAN & GSTIN), and settlement bank account.'}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-xs shadow-xs">
          <div className="flex items-center gap-1.5 font-medium text-ink-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
              ✓
            </span>
            <span>Account</span>
          </div>
          <span className="text-ink-300">&rarr;</span>
          <div className="flex items-center gap-1.5 font-bold text-brand-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              2
            </span>
            <span>{isEditing ? 'Edit Details' : 'Store & KYC'}</span>
          </div>
          <span className="text-ink-300">&rarr;</span>
          <div className="flex items-center gap-1.5 font-medium text-ink-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-ink-500">
              3
            </span>
            <span>Admin Review</span>
          </div>
        </div>
      </header>

      {/* 2-Column Symmetrical Grid */}
      <form onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Row 1, Card 1: Storefront Identity */}
          <Panel className="flex flex-col justify-between p-5 md:p-6 shadow-xs border border-line/80 h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">Storefront Identity</h2>
                    <p className="text-[12px] text-ink-500">Public profile displayed to buyers across HAAT.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Store Name"
                  placeholder="e.g. Ramesh General Store"
                  error={errors.storeName?.message}
                  {...register('storeName')}
                />
                <TextField
                  label="Store Address"
                  placeholder="e.g. Shop 12, Market Complex, Station Road"
                  error={errors.storeAddress?.message}
                  {...register('storeAddress')}
                />
              </div>

              <div className="mt-4">
                <TextAreaField
                  label="Store Description (Optional)"
                  rows={3}
                  placeholder="e.g. Fresh local groceries, dairy products, and daily essentials"
                  error={errors.description?.message}
                  {...register('description')}
                />
              </div>
            </div>
          </Panel>

          {/* Row 1, Card 2: Seller KYC (PAN & GSTIN) */}
          <Panel className="flex flex-col justify-between p-5 md:p-6 shadow-xs border border-line/80 h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">Seller KYC (PAN &amp; GSTIN)</h2>
                    <p className="text-[12px] text-ink-500">Provide registered business tax identifiers for onboarding.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="GST Number (GSTIN)"
                  placeholder="e.g. 19AAAAA0000A1Z5"
                  mono
                  maxLength={15}
                  error={errors.gstin?.message}
                  {...register('gstin', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
                <TextField
                  label="PAN Number"
                  placeholder="e.g. AAAAA0000A"
                  mono
                  maxLength={10}
                  error={errors.panNumber?.message}
                  {...register('panNumber', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
              </div>
            </div>

            <div className="mt-4 rounded-md bg-emerald-50/70 border border-emerald-100 p-3 text-xs text-emerald-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900">Zero Document Verification</p>
                  <p className="mt-0.5 text-emerald-700">
                    HAAT uses your GSTIN and PAN for digital business verification. No certificate uploads or paper forms are required.
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Row 2, Card 1: Serviceable Pincodes (Bottom-Left) */}
          <Panel className="flex flex-col justify-between p-5 md:p-6 shadow-xs border border-line/80 h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">Serviceable Pincodes</h2>
                    <p className="text-[12px] text-ink-500">Delivery coverage areas where your team or 3PL can deliver.</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    pincodes.length > 0 ? 'bg-slate-100 text-ink-700' : 'bg-slate-100 text-ink-400'
                  }`}
                >
                  {pincodes.length} configured
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pincodeDraft}
                    onChange={(e) => setPincodeDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPincode(pincodeDraft);
                        return;
                      }
                      if (
                        e.ctrlKey ||
                        e.metaKey ||
                        ['Backspace', 'Delete', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)
                      ) {
                        return;
                      }
                      if (!/^\d$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      target.value = target.value.replace(/\D/g, '').slice(0, 6);
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text');
                      const digits = text.replace(/\D/g, '').slice(0, 6);
                      setPincodeDraft(digits);
                    }}
                    placeholder="e.g. 700001"
                    maxLength={6}
                    className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-xs placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                  />
                  <Button type="button" variant="secondary" onClick={() => addPincode(pincodeDraft)}>
                    Add Pincode
                  </Button>
                </div>
                {pincodeError && <p className="text-xs text-danger-fg">{pincodeError}</p>}

                {pincodes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {pincodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 border border-brand-100"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => removePincode(code)}
                          className="ml-1 rounded text-brand-400 hover:text-brand-800 focus:outline-none cursor-pointer"
                          aria-label={`Remove ${code}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-ink-400 italic pt-1">
                    No serviceable pincodes added yet. Enter a 6-digit postal code above and click Add Pincode.
                  </p>
                )}
              </div>
            </div>

            <p className="mt-4 text-[11px] text-ink-400 border-t border-line/40 pt-2">
              Orders will only be routed to your store from buyers within these postal areas.
            </p>
          </Panel>

          {/* Row 2, Card 2: Settlement Bank Account (Bottom-Right, exactly matching height) */}
          <Panel className="flex flex-col justify-between p-5 md:p-6 shadow-xs border border-line/80 h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">Settlement Bank Account</h2>
                    <p className="text-[12px] text-ink-500">Funds from completed customer orders will be disbursed here.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <TextField
                  label="Account Holder Name"
                  placeholder="e.g. Ramesh Chandra Roy"
                  error={errors.bankAccountName?.message}
                  {...register('bankAccountName')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Account Number"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 123456789012"
                    mono
                    maxLength={18}
                    error={errors.bankAccountNo?.message}
                    {...register('bankAccountNo', {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/\D/g, '');
                      },
                    })}
                  />
                  <TextField
                    label="IFSC Code"
                    placeholder="e.g. SBIN0001234"
                    mono
                    maxLength={11}
                    error={errors.bankIfscCode?.message}
                    {...register('bankIfscCode', {
                      onChange: (e) => {
                        e.target.value = e.target.value.toUpperCase();
                      },
                    })}
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-ink-400 border-t border-line/40 pt-2">
              Weekly settlements and customer refunds will process via direct NEFT / RTGS to this account.
            </p>
          </Panel>
        </div>

        {/* Server error alert if any */}
        {serverError && (
          <div className="mt-6">
            <Notice tone="danger" title="Application Submission Error">
              {serverError}
            </Notice>
          </div>
        )}

        {/* Action Row */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-line/60 pt-6">
          {onCancel && (
            <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="w-full sm:w-auto">
              Cancel
            </Button>
          )}

          <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full sm:w-auto">
            {isEditing ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Save &amp; Submit Again
              </span>
            ) : (
              'Complete Store Onboarding'
            )}
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-ink-400">
          {isEditing
            ? 'Your updated application will be immediately reflected in administrative verification.'
            : 'Upon submission, your store application will be sent to HAAT platform administrators for activation.'}
        </p>
      </form>
    </div>
  );
}
