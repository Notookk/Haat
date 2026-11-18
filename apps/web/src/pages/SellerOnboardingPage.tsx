import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { GSTIN_REGEX, IFSC_REGEX, PAN_REGEX, PINCODE_REGEX } from '@haat/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { api, errorMessage } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { TextAreaField, TextField } from '../components/ui/TextField';
import { Notice, Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';

const onboardingSchema = z.object({
  storeName: z.string().trim().min(2, 'Enter your store name').max(80),
  storeSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'At least 3 characters')
    .max(48, 'At most 48 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and single hyphens'),
  description: z.string().trim().max(600, 'Keep it under 600 characters'),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN'),
  panNumber: z.string().trim().toUpperCase().regex(PAN_REGEX, 'Enter a valid 10-character PAN'),
  bankAccountName: z.string().trim().min(2, 'Enter the account holder name').max(120),
  bankAccountNo: z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  bankIfscCode: z.string().trim().toUpperCase().regex(IFSC_REGEX, 'Enter a valid IFSC code'),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;
type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'unknown';

export function SellerOnboardingPage() {
  const { seller, refreshSession } = useAuth();
  const navigate = useNavigate();

  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pincodeDraft, setPincodeDraft] = useState('');
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const slugTouched = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      storeName: '',
      storeSlug: '',
      description: '',
      gstin: '',
      panNumber: '',
      bankAccountName: '',
      bankAccountNo: '',
      bankIfscCode: '',
    },
  });

  const storeName = watch('storeName');
  const storeSlug = watch('storeSlug');
  const slugField = register('storeSlug');

  // Derive a sensible slug until the seller edits it themselves.
  useEffect(() => {
    if (slugTouched.current) return;
    const derived = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    setValue('storeSlug', derived, { shouldValidate: false });
  }, [storeName, setValue]);

  useEffect(() => {
    if (!storeSlug || storeSlug.length < 3) {
      setSlugState('idle');
      return;
    }
    let active = true;
    setSlugState('checking');
    const timer = window.setTimeout(() => {
      void api
        .get<{ slug: string; available: boolean }>(`/sellers/slug-available?slug=${encodeURIComponent(storeSlug)}`)
        .then((result) => {
          if (active) setSlugState(result.data.available ? 'available' : 'taken');
        })
        .catch(() => {
          if (active) setSlugState('unknown');
        });
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [storeSlug]);

  if (seller) return <Navigate to="/seller/products" replace />;

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
      setPincodeError('Up to 200 pincodes.');
      return;
    }
    setPincodes((current) => [...current, value]);
    setPincodeDraft('');
    setPincodeError(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (pincodes.length === 0) {
      setPincodeError('Add at least one serviceable pincode.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/sellers/onboarding', {
        storeName: values.storeName,
        storeSlug: values.storeSlug,
        description: values.description || undefined,
        gstin: values.gstin,
        panNumber: values.panNumber,
        bankAccountName: values.bankAccountName,
        bankAccountNo: values.bankAccountNo,
        bankIfscCode: values.bankIfscCode,
        servicePincodes: pincodes,
      });
      await refreshSession();
      navigate('/seller/products', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-container px-4 py-8 md:px-6 md:py-10">
      <header className="max-w-prose">
        <h1 className="text-display-md text-ink-900">Open your store</h1>
        <p className="mt-1 text-body text-ink-600">
          Four details and you can start building the catalogue. Verification is reviewed separately — listings stay
          private until it clears.
        </p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <Panel className="p-5 md:p-6">
            <h2 className="text-subtitle text-ink-900">Storefront</h2>
            <p className="mt-0.5 text-caption text-ink-500">This is what buyers see on your public store page.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField label="Store name" error={errors.storeName?.message} {...register('storeName')} />
              <div>
                <TextField
                  label="Store link"
                  prefix="/store/"
                  mono
                  error={errors.storeSlug?.message}
                  hint={
                    slugState === 'checking'
                      ? 'Checking availability…'
                      : slugState === 'available'
                        ? 'Available.'
                        : slugState === 'taken'
                          ? 'Already taken — try another.'
                          : slugState === 'unknown'
                            ? 'Could not check availability right now.'
                            : 'Lowercase letters, numbers and hyphens.'
                  }
                  {...slugField}
                  onChange={(event) => {
                    slugTouched.current = true;
                    void slugField.onChange(event);
                  }}
                />
                {slugState === 'taken' ? (
                  <span className="mt-1 block text-caption font-semibold text-danger-fg">That link is in use.</span>
                ) : null}
              </div>
              <TextAreaField
                label="Short description"
                optional
                className="sm:col-span-2"
                hint="One or two sentences about what you stock."
                error={errors.description?.message}
                {...register('description')}
              />
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <h2 className="text-subtitle text-ink-900">Business identity</h2>
            <p className="mt-0.5 text-caption text-ink-500">Checked against your GST registration during review.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label="GSTIN"
                mono
                maxLength={15}
                placeholder="33ABCDE1234F1Z5"
                error={errors.gstin?.message}
                {...register('gstin')}
              />
              <TextField
                label="PAN"
                mono
                maxLength={10}
                placeholder="ABCDE1234F"
                error={errors.panNumber?.message}
                {...register('panNumber')}
              />
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <h2 className="text-subtitle text-ink-900">Payout account</h2>
            <p className="mt-0.5 text-caption text-ink-500">Settlements go to this account once payouts are enabled.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField label="Account holder" error={errors.bankAccountName?.message} {...register('bankAccountName')} />
              <TextField
                label="Account number"
                inputMode="numeric"
                mono
                error={errors.bankAccountNo?.message}
                {...register('bankAccountNo')}
              />
              <TextField label="IFSC" mono maxLength={11} error={errors.bankIfscCode?.message} {...register('bankIfscCode')} />
            </div>
          </Panel>

          <Panel className="p-5 md:p-6">
            <h2 className="text-subtitle text-ink-900">Delivery area</h2>
            <p className="mt-0.5 text-caption text-ink-500">
              Pincodes you can serve. Slot configuration arrives with the delivery module; this is the whitelist it
              will use.
            </p>

            <div className="mt-4">
              <label className="field-label" htmlFor="pincode-input">
                Serviceable pincodes
              </label>
              <div className="flex gap-2">
                <input
                  id="pincode-input"
                  value={pincodeDraft}
                  onChange={(event) => setPincodeDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      addPincode(pincodeDraft);
                    }
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="600001"
                  className="h-10 w-40 rounded-sm border border-line-strong bg-surface px-3 font-mono text-body text-ink-900 placeholder:text-ink-300 focus:border-brand-500"
                />
                <Button variant="secondary" onClick={() => addPincode(pincodeDraft)}>
                  Add
                </Button>
              </div>
              {pincodeError ? (
                <span className="field-error" role="alert">
                  {pincodeError}
                </span>
              ) : (
                <span className="field-hint">Press Enter after each pincode.</span>
              )}

              {pincodes.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {pincodes.map((pincode) => (
                    <li key={pincode}>
                      <span className="inline-flex h-7 items-center gap-1 rounded-sm border border-line-strong bg-surface-sunken px-2 font-mono text-caption text-ink-700">
                        {pincode}
                        <button
                          type="button"
                          onClick={() => setPincodes((current) => current.filter((value) => value !== pincode))}
                          className="text-ink-400 hover:text-danger-fg"
                          aria-label={`Remove ${pincode}`}
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>

          {serverError ? <Notice tone="danger" title="We couldn’t create the store">{serverError}</Notice> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={submitting} loadingLabel="Creating store…">
              Create store
            </Button>
            <p className="text-caption text-ink-500">You can edit these details after verification.</p>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-[88px]">
          <Panel className="p-5">
            <h2 className="text-micro uppercase tracking-[0.08em] text-ink-500">What happens next</h2>
            <ol className="mt-3 space-y-3">
              {[
                ['Submit', 'Your store record is created and a KYC review is queued.'],
                ['Review', 'An admin checks the GSTIN and PAN against your documents.'],
                ['Publish', 'Verified listings become visible in the public catalogue.'],
              ].map(([step, detail], index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-pill border border-line-strong bg-surface font-mono text-micro text-ink-500">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-label text-ink-800">{step}</p>
                    <p className="text-caption text-ink-500">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-line pt-3">
              <Badge tone="warning">PENDING</Badge>
              <p className="mt-2 text-caption text-ink-500">
                New stores start as <span className="font-mono text-ink-700">PENDING</span>. You can build products
                immediately; they stay private until approval.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
