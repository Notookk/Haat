import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { validateTiers } from '@haat/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { flattenCategories, useCategoryTree } from '../features/catalog/api';
import {
  emptyProductForm,
  orderableQuantities,
  parseTierRows,
  productEditorSchema,
  productToFormValues,
  toProductPayload,
  type ProductEditorValues,
} from '../features/products/editor-schema';
import { useCreateProduct, useMyProduct, useUpdateProduct } from '../features/products/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Notice, Panel } from '../components/ui/Panel';
import { ErrorState, SkeletonBlock } from '../components/ui/States';
import { SelectField, TextAreaField, TextField } from '../components/ui/TextField';
import { ImagePicker } from '../components/seller/ImagePicker';
import { ProductPreview } from '../components/seller/ProductPreview';
import { TierEditor } from '../components/seller/TierEditor';
import { VariantMatrix } from '../components/seller/VariantMatrix';
import { errorMessage } from '../lib/api-client';

const DESCRIPTION_LIMIT = 4000;

export function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { seller } = useAuth();

  const categories = useCategoryTree();
  const existing = useMyProduct(isEdit ? id : undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(id ?? '');

  const [serverError, setServerError] = useState<string | null>(null);
  const loadedProductId = useRef<string | null>(null);

  const form = useForm<ProductEditorValues>({
    resolver: zodResolver(productEditorSchema),
    defaultValues: emptyProductForm(),
    mode: 'onBlur',
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    const product = existing.data;
    if (!product || loadedProductId.current === product.id) return;
    loadedProductId.current = product.id;
    reset(productToFormValues(product));
  }, [existing.data, reset]);

  const values = watch();
  const options = flattenCategories(categories.data ?? []);
  const categoryLabel = options.find((option) => option.id === values.categoryId)?.label ?? '';
  const selectedCategoryMissing = Boolean(values.categoryId) && !options.some((option) => option.id === values.categoryId);
  const quantities = orderableQuantities(Number(values.moq), Number(values.orderMultiple));
  const descriptionLength = values.description.trim().length;

  const onSubmit = handleSubmit(async (formValues) => {
    setServerError(null);

    const parsed = parseTierRows(formValues.pricingTiers);
    if (!parsed.complete) {
      setError('pricingTiers', { type: 'manual', message: 'Finish or remove the incomplete tier rows.' });
      return;
    }
    const issues = validateTiers(parsed.tiers);
    if (issues.length > 0) {
      setError('pricingTiers', { type: 'manual', message: issues[0] });
      return;
    }

    let payload;
    try {
      payload = toProductPayload(formValues, parsed.tiers);
    } catch (error) {
      setServerError(errorMessage(error));
      return;
    }

    try {
      if (isEdit && id) await updateProduct.mutateAsync(payload);
      else await createProduct.mutateAsync(payload);
      navigate('/seller/products', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  if (isEdit && existing.isError) {
    return (
      <div>
        <BackLink />
        <div className="mt-4">
          <ErrorState message={errorMessage(existing.error)} onRetry={() => void existing.refetch()} />
        </div>
      </div>
    );
  }

  if (isEdit && existing.isPending) {
    return (
      <div aria-busy="true">
        <BackLink />
        <SkeletonBlock className="mt-4 h-8 w-56" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <SkeletonBlock className="h-72 w-full" />
            <SkeletonBlock className="h-56 w-full" />
          </div>
          <SkeletonBlock className="hidden h-[420px] w-full lg:block" />
        </div>
      </div>
    );
  }

  const isArchived = isEdit && existing.data ? !existing.data.isActive : false;

  return (
    <div>
      <BackLink />

      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display-md text-ink-900">{isEdit ? 'Edit product' : 'New product'}</h1>
          <p className="mt-1 max-w-prose text-caption text-ink-500">
            {isEdit
              ? 'Changes go live immediately. Prices and stock are saved as integers of paise.'
              : 'One product, one variant grid, one price ladder. Everything on this page is required except the extras marked optional.'}
          </p>
        </div>
        {isEdit && existing.data ? (
          <div className="flex items-center gap-2">
            {existing.data.isApproved ? (
              <Badge tone="success" shape="chip">
                Verified
              </Badge>
            ) : (
              <Badge tone="warning" shape="chip">
                Awaiting KYC
              </Badge>
            )}
            <Badge tone={existing.data.isActive ? 'neutral' : 'danger'} shape="chip">
              {existing.data.isActive ? 'Listed' : 'Archived'}
            </Badge>
          </div>
        ) : null}
      </header>

      {isArchived ? (
        <Notice tone="warning" className="mt-4" title="This listing is archived">
          It is hidden from the public catalogue. Tick <strong>Listed in the catalogue</strong> and save to bring it back.
        </Notice>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="text-subtitle text-ink-900">Basics</h2>
            <p className="mt-0.5 text-caption text-ink-500">What the product is and where it belongs.</p>

            <div className="mt-4 space-y-4">
              <TextField
                label="Title"
                placeholder="M10 Hex Bolt, Hot-Dip Galvanised"
                maxLength={160}
                error={errors.title?.message}
                {...register('title')}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Category" error={errors.categoryId?.message} {...register('categoryId')}>
                  <option value="">Select a category</option>
                  {selectedCategoryMissing ? (
                    <option value={values.categoryId}>Current category (inactive)</option>
                  ) : null}
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Brand"
                  optional
                  maxLength={80}
                  placeholder="Bharat Fasteners"
                  error={errors.brand?.message}
                  {...register('brand')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Product SKU"
                  mono
                  maxLength={64}
                  placeholder="HAAT-IND-0001"
                  hint="Unique across HAAT. Uppercase is applied on save."
                  error={errors.sku?.message}
                  {...register('sku')}
                />
                <div className="hidden sm:block" />
              </div>

              <div>
                <TextAreaField
                  label="Description"
                  maxLength={DESCRIPTION_LIMIT}
                  placeholder="Construction, finish, standards, what is included, and how it is packed."
                  error={errors.description?.message}
                  {...register('description')}
                />
                <p className="mt-1 tnum text-right text-micro text-ink-400">
                  {descriptionLength}/{DESCRIPTION_LIMIT}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-subtitle text-ink-900">Price &amp; quantity</h2>
            <p className="mt-0.5 text-caption text-ink-500">
              Retail price applies at every quantity that no tier covers.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <TextField
                label="Retail price"
                prefix="₹"
                inputMode="decimal"
                placeholder="249.50"
                error={errors.retailPriceRupees?.message}
                {...register('retailPriceRupees')}
              />
              <TextField
                label="Minimum order (MOQ)"
                inputMode="numeric"
                error={errors.moq?.message}
                {...register('moq')}
              />
              <TextField
                label="Order multiple"
                inputMode="numeric"
                error={errors.orderMultiple?.message}
                {...register('orderMultiple')}
              />
            </div>

            <p className="mt-2 tnum text-caption text-ink-500">
              {quantities.length > 0
                ? `Buyers can order ${quantities.join(', ')}… units.`
                : 'Set a minimum of 1 or more to see orderable quantities.'}
            </p>

            <div className="mt-4 border-t border-line pt-4">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded-sm border-line-strong accent-brand-600"
                  {...register('isWholesaleActive')}
                />
                <span>
                  <span className="block text-label text-ink-800">Show quantity pricing</span>
                  <span className="block text-caption text-ink-500">
                    Tier prices are public only while this is on. The retail price still applies above the last tier.
                  </span>
                </span>
              </label>

              {isEdit ? (
                <label className="mt-3 flex items-start gap-2.5 border-t border-line pt-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded-sm border-line-strong accent-brand-600"
                    {...register('isActive')}
                  />
                  <span>
                    <span className="block text-label text-ink-800">Listed in the catalogue</span>
                    <span className="block text-caption text-ink-500">
                      Uncheck to hide it without deleting it. Archived listings are editable but never public.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-label text-ink-800">Quantity pricing tiers</h3>
                <span className="text-micro text-ink-400">optional</span>
              </div>
              <div className="mt-2">
                <TierEditor form={form} />
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-subtitle text-ink-900">Variants</h2>
              <span className="text-micro text-ink-400">at least one</span>
            </div>
            <p className="mt-0.5 text-caption text-ink-500">
              Stock lives on the variant. The price modifier is added to the retail price for that variant.
            </p>
            <div className="mt-3">
              <VariantMatrix form={form} />
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-subtitle text-ink-900">Images</h2>
              <span className="text-micro text-ink-400">up to 10</span>
            </div>
            <p className="mt-0.5 text-caption text-ink-500">
              The primary image is the card and gallery lead. Order matters.
            </p>
            <div className="mt-3">
              <ImagePicker form={form} />
            </div>
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <ProductPreview
            values={values}
            sellerName={seller?.storeName ?? ''}
            categoryLabel={categoryLabel}
            isApproved={isEdit ? Boolean(existing.data?.isApproved) : Boolean(seller?.isVerified)}
          />

          <Panel className="p-4">
            {serverError ? (
              <Notice tone="danger" className="mb-3" title="Not saved">
                {serverError}
              </Notice>
            ) : null}

            <Button type="submit" block loading={isSubmitting} loadingLabel="Saving…">
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>

            <Link
              to="/seller/products"
              className="mt-2 block text-center text-caption text-ink-500 underline underline-offset-2 hover:text-ink-800"
            >
              Cancel
            </Link>

            {seller && !seller.isVerified ? (
              <p className="mt-3 border-t border-line pt-3 text-micro text-ink-500">
                Your store is awaiting verification, so this listing stays out of the public catalogue until approval.
              </p>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-micro text-ink-500">
                Saving an image to Cloudinary uses one signed upload per file. Nothing is billed twice.
              </p>
            )}
          </Panel>
        </aside>
      </form>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/seller/products"
      className="inline-flex items-center gap-1.5 text-caption text-ink-500 underline underline-offset-2 hover:text-ink-900"
    >
      <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
      All products
    </Link>
  );
}
