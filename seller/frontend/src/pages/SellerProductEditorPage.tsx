import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FolderPlus, Check, Tag, PackagePlus, MessageSquareQuote } from 'lucide-react';
import {
  Button,
  Panel,
  ErrorState,
  SkeletonBlock,
  CustomSelect,
  TextAreaField,
  TextField,
  errorMessage,
  showToast,
} from '@haat/shared-frontend';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import {
  emptyProductForm,
  generateSkuFromTitle,
  productEditorSchema,
  productToFormValues,
  toProductPayload,
  type ProductEditorValues,
} from '../features/products/editor-schema';
import {
  useCreateProduct,
  useMyProduct,
  useUpdateProduct,
  useSellerCategories,
  useCreateCategory,
} from '../features/products/api';
import { ImagePicker } from '../components/ImagePicker';

const DESCRIPTION_LIMIT = 4000;

export function SellerProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { seller } = useSellerAuth();

  const categories = useSellerCategories();
  const existing = useMyProduct(isEdit ? id : undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(id ?? '');
  const createCategory = useCreateCategory();

  // Stable client-generated 24-char hex MongoDB ObjectId for new products to route Cloudinary images to Haat/<productId>/...
  const [newProductId] = useState(() =>
    Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
  );
  const activeProductId = isEdit ? id! : newProductId;

  const [serverError, setServerError] = useState<string | null>(null);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
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
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const lastGeneratedTitleRef = useRef<string>('');

  useEffect(() => {
    const product = existing.data;
    if (!product || loadedProductId.current === product.id) return;
    loadedProductId.current = product.id;
    reset(productToFormValues(product));
    lastGeneratedTitleRef.current = product.title || '';
  }, [existing.data, reset]);

  const values = watch();
  const categoryList = categories.data ?? [];
  const descriptionLength = values.description?.trim().length ?? 0;

  // Auto-generate unique SKU according to product name once typed
  const titleValue = values.title;
  useEffect(() => {
    if (isEdit) return;
    const trimmed = (titleValue || '').trim();
    if (!trimmed || trimmed.length < 2) return;

    const timer = setTimeout(() => {
      if (trimmed !== lastGeneratedTitleRef.current) {
        const newSku = generateSkuFromTitle(trimmed);
        lastGeneratedTitleRef.current = trimmed;
        setValue('sku', newSku, { shouldValidate: true, shouldDirty: true });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [titleValue, isEdit, setValue]);

  // Real-time calculation of Discounted Price from Total Price & Discount %
  const totalPriceNum = parseFloat(values.totalPriceRupees) || 0;
  const isReasonablePrice = totalPriceNum > 0 && totalPriceNum <= 100_000_000;
  const discountPercentNum = Math.min(99, Math.max(0, parseInt(values.discountPercent, 10) || 0));

  const calculatedDiscountedPrice =
    isReasonablePrice
      ? (totalPriceNum - (totalPriceNum * discountPercentNum) / 100).toFixed(2)
      : '0.00';

  const savingsAmount =
    isReasonablePrice && discountPercentNum > 0
      ? ((totalPriceNum * discountPercentNum) / 100).toFixed(2)
      : null;

  useEffect(() => {
    if (isReasonablePrice) {
      const discounted = (totalPriceNum - (totalPriceNum * discountPercentNum) / 100).toFixed(2);
      setValue('retailPriceRupees', discounted, { shouldValidate: false });
    }
  }, [totalPriceNum, isReasonablePrice, discountPercentNum, setValue]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || newCatName.trim().length < 2) {
      showToast.error('Category Name', 'Please enter at least 2 characters for category name.');
      return;
    }
    setIsCreatingCategory(true);
    try {
      const created = await createCategory.mutateAsync({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      setValue('categoryId', created._id, { shouldValidate: true, shouldDirty: true });
      showToast.success('Category Option Added', `"${created.name}" is now available and selected.`);
      setNewCatName('');
      setNewCatDesc('');
      setShowCategoryCreator(false);
    } catch (err) {
      showToast.error('Failed to Add Category', errorMessage(err));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const onInvalid = (fieldErrors: typeof errors) => {
    const errorEntries = Object.entries(fieldErrors);
    if (errorEntries.length > 0) {
      const [field, err] = errorEntries[0];
      const msg = (err as any)?.message || `Please check the "${field}" field.`;
      setServerError(msg);
      showToast.error('Please Complete Form', msg);
    }
  };

  const onSubmit = handleSubmit(async (formValues) => {
    setServerError(null);

    // Auto-generate SKU from title if still blank
    if (!formValues.sku?.trim() && formValues.title?.trim()) {
      const generated = generateSkuFromTitle(formValues.title);
      formValues.sku = generated;
      setValue('sku', generated, { shouldValidate: true });
    }

    const finalTotal = parseFloat(formValues.totalPriceRupees) || 0;
    const finalDiscount = Math.min(99, Math.max(0, parseInt(formValues.discountPercent, 10) || 0));
    const finalSellingPrice = (finalTotal - (finalTotal * finalDiscount) / 100).toFixed(2);
    formValues.retailPriceRupees = finalSellingPrice;

    let payload;
    try {
      payload = toProductPayload(formValues, [], isEdit ? undefined : activeProductId);
    } catch (error) {
      const msg = errorMessage(error);
      setServerError(msg);
      showToast.error('Preparation Error', msg);
      return;
    }

    try {
      if (isEdit && id) {
        await updateProduct.mutateAsync(payload);
        showToast.success('Product updated', `"${formValues.title}" changes saved.`);
      } else {
        await createProduct.mutateAsync(payload);
        showToast.success('Product uploaded', `"${formValues.title}" added to your products.`);
      }
      navigate('/products', { replace: true });
    } catch (error) {
      const msg = errorMessage(error);
      setServerError(msg);
      showToast.error('Save failed', msg);
    }
  }, onInvalid);

  if (isEdit && existing.isError) {
    return (
      <div className="w-full">
        <BackLink />
        <div className="mt-4">
          <ErrorState message={errorMessage(existing.error)} onRetry={() => void existing.refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <BackLink />
          <h1 className="mt-2 text-display-md text-ink-900 font-extrabold tracking-tight">
            {isEdit ? 'Edit Product' : 'Product Upload'}
          </h1>
          <p className="mt-1 text-caption text-ink-500">
            Simple product upload with name, description, SKU, pricing, discount, and stock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            form="product-editor-form"
            loading={isSubmitting}
            loadingLabel="Uploading..."
            className="bg-[#16135c] hover:bg-[#12104b] text-white"
          >
            {isEdit ? 'Save Changes' : 'Upload Product'}
          </Button>
        </div>
      </div>

      {serverError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-label font-medium text-rose-800">
          {serverError}
        </div>
      )}

      {isEdit && existing.isLoading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
      ) : (
        <form id="product-editor-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          {/* Left Column (7 of 12 cols): Name, Desc, Category, SKU */}
          <div className="lg:col-span-7 space-y-6">
            <Panel className="p-5 md:p-6 space-y-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <PackagePlus className="h-5 w-5 text-brand-600" />
                <h2 className="text-subtitle font-bold text-ink-900">Product Details</h2>
              </div>

              {/* 1. Product Name */}
              <TextField
                label="1. Product Name *"
                maxLength={160}
                placeholder="e.g. Fresh Darjeeling Whole Leaf Tea (500g)"
                error={errors.title?.message}
                {...register('title')}
                onBlur={(e) => {
                  register('title').onBlur(e);
                  const trimmed = (e.target.value || '').trim();
                  if (!isEdit && trimmed.length >= 2 && trimmed !== lastGeneratedTitleRef.current) {
                    const newSku = generateSkuFromTitle(trimmed);
                    lastGeneratedTitleRef.current = trimmed;
                    setValue('sku', newSku, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              />

              {/* 2. Product Description */}
              <div>
                <TextAreaField
                  label="2. Product Description *"
                  rows={4}
                  maxLength={DESCRIPTION_LIMIT}
                  placeholder="Describe your product: quality standards, ingredients/materials, usage, or pack details..."
                  error={errors.description?.message}
                  {...register('description')}
                />
                <p className="mt-1 text-right text-micro text-ink-400">
                  {descriptionLength} / {DESCRIPTION_LIMIT} characters
                </p>
              </div>

              {/* Category Selection */}
              <div className="rounded-xl border border-line bg-surface-sunken/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="editor-category-select" className="block text-label font-bold text-ink-800">
                    Category Option <span className="text-red-500 font-bold">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryCreator((v) => !v)}
                    className="inline-flex items-center gap-1 text-micro font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>{showCategoryCreator ? 'Close' : '+ Add New Category'}</span>
                  </button>
                </div>

                <CustomSelect
                  id="editor-category-select"
                  value={values.categoryId}
                  onChange={(val) => setValue('categoryId', val, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Select category..."
                  error={errors.categoryId?.message}
                  options={categoryList.map((cat) => ({
                    value: cat._id,
                    label: cat.name,
                    icon: (cat as any).imageUrl ? (
                      <img src={(cat as any).imageUrl} alt="" className="h-5 w-5 rounded object-cover" />
                    ) : undefined,
                  }))}
                />

                {showCategoryCreator && (
                  <div className="rounded-lg border border-brand-200 bg-brand-50/70 p-3 space-y-2 animate-in fade-in duration-100">
                    <span className="text-micro font-bold uppercase tracking-wider text-brand-800">
                      Create Category
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Category Name"
                        className="h-8 rounded-md border border-brand-300 bg-surface px-2.5 text-caption text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <input
                        type="text"
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="h-8 rounded-md border border-brand-300 bg-surface px-2.5 text-caption text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCategoryCreator(false)}
                        className="rounded-md border border-line bg-surface px-2.5 py-0.5 text-micro text-ink-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isCreatingCategory || !newCatName.trim()}
                        onClick={handleCreateCategory}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-0.5 text-micro font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. SKU (Auto Generated from Product Name) */}
              <div className="space-y-1">
                <label className="block text-label font-bold text-ink-800">
                  3. SKU (Auto Generated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={64}
                    placeholder="Auto-generated after typing product name..."
                    className="w-full h-10 rounded-md border border-line-strong bg-surface-sunken px-3 font-mono text-body font-bold text-ink-900 uppercase focus:border-brand-500 focus:bg-surface focus:outline-none"
                    {...register('sku')}
                  />
                  <span className="absolute right-3 top-2.5 text-micro font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full pointer-events-none">
                    Auto Generated
                  </span>
                </div>
                {errors.sku?.message && (
                  <p className="text-micro text-rose-600 font-medium">{errors.sku.message}</p>
                )}
              </div>
            </Panel>
          </div>

          {/* Right Column (5 of 12 cols): Pricing, Discount, Stock, Images */}
          <div className="lg:col-span-5 space-y-6">
            <Panel className="p-5 md:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-line pb-2.5">
                <Tag className="h-4 w-4 text-brand-600" />
                <h2 className="text-subtitle font-bold text-ink-900">Pricing &amp; Inventory</h2>
              </div>

              {/* 4. Total Price & 5. Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label font-bold text-ink-800 mb-1">
                    4. Total Price (₹) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-400 font-bold">
                      ₹
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 1000"
                      className="w-full h-10 rounded-md border border-line-strong bg-surface pl-7 pr-3 text-body font-bold text-ink-900 focus:border-brand-500 focus:outline-none"
                      {...register('totalPriceRupees')}
                    />
                  </div>
                  {errors.totalPriceRupees?.message && (
                    <p className="mt-1 text-micro text-rose-600">{errors.totalPriceRupees.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-label font-bold text-ink-800 mb-1">
                    5. Discount (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="0"
                      className="w-full h-10 rounded-md border border-line-strong bg-surface pl-3 pr-7 text-body font-bold text-ink-900 focus:border-brand-500 focus:outline-none"
                      {...register('discountPercent')}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-ink-400 font-bold">
                      %
                    </div>
                  </div>
                  {errors.discountPercent?.message && (
                    <p className="mt-1 text-micro text-rose-600">{errors.discountPercent.message}</p>
                  )}
                </div>
              </div>

              {/* 6. Discounted Price (Auto Generated Banner) */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-micro font-bold uppercase tracking-wider text-emerald-800">
                    6. Discounted Price (Auto Generated)
                  </span>
                  <span className="text-micro font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Selling Price
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-display-xs font-black text-emerald-900">
                    ₹{calculatedDiscountedPrice}
                  </span>
                  {savingsAmount && (
                    <span className="text-micro font-bold text-emerald-700">
                      (Buyer saves ₹{savingsAmount} • {discountPercentNum}% OFF)
                    </span>
                  )}
                </div>
                <p className="text-micro text-emerald-700/80">
                  This is the final checkout price buyers will pay for this item.
                </p>
              </div>

              {/* 7. Stock Present */}
              <div>
                <label className="block text-label font-bold text-ink-800 mb-1">
                  7. Stock Present (Available Units) <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  className="w-full h-10 rounded-md border border-line-strong bg-surface px-3 text-body font-bold text-ink-900 focus:border-brand-500 focus:outline-none"
                  {...register('stockQuantity')}
                />
                {errors.stockQuantity?.message && (
                  <p className="mt-1 text-micro text-rose-600">{errors.stockQuantity.message}</p>
                )}
                <p className="mt-1 text-micro text-ink-400">
                  Orders automatically decrement from this stock count upon purchase.
                </p>
              </div>
            </Panel>

            {/* Bulk Orders Note */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-micro text-brand-900 flex items-start gap-2.5 shadow-2xs">
              <MessageSquareQuote className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink-900">Bulk &amp; Wholesale Orders: </span>
                If a customer needs to purchase in bulk, they can chat with your store directly to negotiate quantities and wholesale pricing.
              </div>
            </div>

            {/* Product Images Uploader */}
            <Panel className="p-5 space-y-3 shadow-2xs">
              <label className="block text-label font-bold text-ink-800">
                Product Photos (Cloudinary Upload)
              </label>
              <ImagePicker form={form} productId={activeProductId} />
            </Panel>

            {/* Listed Visibility Toggle */}
            <Panel className="p-4 shadow-2xs">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-sm border-line-strong accent-brand-600"
                  {...register('isActive')}
                />
                <span className="text-label font-bold text-ink-900">
                  Active &amp; Listed in Store Products
                </span>
              </label>
            </Panel>

            <Button
              type="submit"
              className="w-full bg-[#16135c] hover:bg-[#12104b] text-white"
              loading={isSubmitting}
              loadingLabel="Uploading..."
            >
              {isEdit ? 'Save Changes' : 'Upload Product'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/products"
      className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand-700 hover:text-brand-900 transition-colors"
    >
      <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
      Back to Products
    </Link>
  );
}
