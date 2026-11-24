import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  FolderTree,
  Search,
  X,
  FolderPlus,
  Edit3,
  Trash2,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  api,
  Badge,
  Button,
  Panel,
  TextField,
  TextAreaField,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  showToast,
  showConfirm,
} from '@haat/shared-frontend';
import {
  useSellerCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  uploadProductImage,
} from '../features/products/api';

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

const newCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters'),
  description: z.string().trim().max(400).optional(),
});

type NewCategoryFormValues = z.infer<typeof newCategorySchema>;

export function SellerCategoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  // Edit category in left-hand form panel
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Category image upload state
  const [categoryImage, setCategoryImage] = useState<{ url: string; publicId: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadImageError, setUploadImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = useSellerCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const form = useForm<NewCategoryFormValues>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: { name: '', description: '' },
    mode: 'onBlur',
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const categoryNameVal = watch('name') || '';

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadImageError(null);
    setIsUploadingImage(true);
    try {
      const uploaded = await uploadProductImage(file);
      setCategoryImage(uploaded);
      showToast.success('Category Image Uploaded', 'Photo attached successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      setUploadImageError(msg);
      showToast.error('Upload Failed', msg);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setCategoryImage(null);
    setUploadImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryImage(cat.imageUrl ? { url: cat.imageUrl, publicId: cat.imagePublicId || '' } : null);
    setUploadImageError(null);
    reset({ name: cat.name, description: cat.description || '' });
    setServerError(null);
    document.getElementById('cat-name-input')?.focus();
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setCategoryImage(null);
    setUploadImageError(null);
    reset({ name: '', description: '' });
    setServerError(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory._id,
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          imageUrl: categoryImage?.url || null,
          imagePublicId: categoryImage?.publicId || null,
        });
        showToast.success('Category Updated', `"${values.name.trim()}" has been updated.`);
        cancelEdit();
      } else {
        const created = await createCategoryMutation.mutateAsync({
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          imageUrl: categoryImage?.url || null,
          imagePublicId: categoryImage?.publicId || null,
        });
        showToast.success('Category Created', `"${created.name}" is now available for your store products.`);
        reset({ name: '', description: '' });
        setCategoryImage(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setServerError(msg);
      showToast.error(editingCategory ? 'Update Failed' : 'Creation Failed', msg);
    }
  });

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (editingCategory?._id === cat._id) {
      cancelEdit();
    }
    const confirmed = await showConfirm({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${cat.name}"? Products assigned to this category will need to be re-categorized.`,
      confirmButtonText: 'Yes, delete',
      danger: true,
    });
    if (confirmed) {
      try {
        await deleteCategoryMutation.mutateAsync(cat._id);
        showToast.success('Category Deleted', `"${cat.name}" was successfully removed.`);
      } catch (err) {
        showToast.error('Delete Failed', err instanceof Error ? err.message : 'Could not delete category');
      }
    }
  };

  const categories = categoriesQuery.data || [];

  const filteredCategories = [...categories]
    .filter((cat) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return cat.name.toLowerCase().includes(term) || cat.slug.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return String(a._id).localeCompare(String(b._id));
    });

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Categories</h1>
          <p className="mt-1 text-caption text-ink-500">
            View catalog categories and create new categories for your products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="brand">{categories.length} Categories</Badge>
        </div>
      </header>

      {serverError && (
        <div className="rounded-md border border-danger-fg/20 bg-danger-bg p-3 text-caption text-danger-fg">
          {serverError}
        </div>
      )}

      {/* 40 - 60 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* 40% Column (Left side: 5 of 12 cols, ~41.7% width) */}
        <div className="lg:col-span-5 space-y-6">
          <Panel
            className={`p-5 md:p-6 shadow-2xs border-brand-200 sticky top-20 transition-all ${
              editingCategory ? 'ring-2 ring-brand-500/40 bg-brand-50/20' : ''
            }`}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                {editingCategory ? (
                  <Edit3 className="h-5 w-5 text-brand-600" />
                ) : (
                  <FolderPlus className="h-5 w-5 text-brand-600" />
                )}
                <div>
                  <h2 className="text-subtitle font-bold text-ink-900">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h2>
                  <p className="text-micro text-ink-500">
                    {editingCategory
                      ? `Updating details for "${editingCategory.name}"`
                      : 'Define a new category to classify your products'}
                  </p>
                </div>
              </div>
              {editingCategory && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1 text-caption font-semibold text-ink-500 hover:text-ink-800 transition-colors cursor-pointer"
                  title="Cancel editing"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-4 pt-2">
              {/* Category Name Input Field */}
              <div>
                <label htmlFor="cat-name-input" className="block text-label font-bold text-ink-800 mb-1">
                  Category Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  placeholder="e.g. Organic & Regional Spices"
                  className={`w-full h-10 rounded-md border px-3 text-body text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-1 ${
                    errors.name
                      ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-line-strong bg-surface focus:border-brand-500 focus:ring-brand-500'
                  }`}
                  {...register('name')}
                />
                {errors.name?.message && (
                  <p className="mt-1 text-micro text-rose-600 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Category Image Upload Option */}
              <div>
                <label className="block text-label font-bold text-ink-800 mb-1">
                  Category Image <span className="text-micro font-normal text-ink-400">(Optional)</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="category-image-file-input"
                />

                {categoryImage ? (
                  <div className="relative flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
                    <img
                      src={categoryImage.url}
                      alt="Category preview"
                      className="h-16 w-16 rounded-md object-cover border border-line shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink-900 truncate">Image attached</p>
                      <p className="text-[11px] text-ink-500">Stored on Cloudinary</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="mt-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Change photo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Remove image"
                      className="grid h-7 w-7 place-items-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-line-strong p-4 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingImage ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading image to Cloudinary...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-1.5">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold text-ink-800">
                          Click to upload category photo
                        </span>
                        <span className="text-[10px] text-ink-400 mt-0.5">
                          PNG, JPG or WebP (max 5 MB)
                        </span>
                      </>
                    )}
                  </button>
                )}

                {uploadImageError && (
                  <p className="mt-1 text-micro text-rose-600 font-medium">{uploadImageError}</p>
                )}
              </div>

              {/* Description Field */}
              <div>
                <TextAreaField
                  label="Description"
                  optional
                  rows={3}
                  placeholder="Short description of products falling under this category"
                  error={errors.description?.message}
                  {...register('description')}
                />
              </div>

              <div className="pt-2">
                {editingCategory ? (
                  <div className="flex items-center gap-2.5">
                    <Button
                      type="submit"
                      disabled={isSubmitting || updateCategoryMutation.isPending || !categoryNameVal.trim() || isUploadingImage}
                      loading={isSubmitting || updateCategoryMutation.isPending}
                      loadingLabel="Saving..."
                      className="flex-1 bg-[#16135c] hover:bg-[#12104b] text-white"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button type="button" variant="secondary" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || createCategoryMutation.isPending || !categoryNameVal.trim() || isUploadingImage}
                    loading={isSubmitting || createCategoryMutation.isPending}
                    loadingLabel="Saving..."
                    className="w-full bg-[#16135c] hover:bg-[#12104b] text-white"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Category
                  </Button>
                )}
              </div>
            </form>
          </Panel>
        </div>

        {/* 60% Column (Right side: 7 of 12 cols, ~58.3% width) */}
        <div className="lg:col-span-7 space-y-6">
          <Panel className="overflow-hidden shadow-2xs space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-brand-600" />
                <div>
                  <h2 className="text-subtitle font-bold text-ink-900">All Categories</h2>
                  <p className="text-micro text-ink-500">View all categories available for your store products</p>
                </div>
              </div>

              {/* Quick Search Filter */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full h-9 rounded-md border border-line pl-9 pr-8 text-caption text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-ink-400 hover:text-ink-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {categoriesQuery.isLoading ? (
              <div className="space-y-3 py-2">
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            ) : categoriesQuery.error ? (
              <ErrorState message="Failed to load categories" onRetry={() => void categoriesQuery.refetch()} />
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                icon={<FolderTree size={28} className="text-ink-400" />}
                title={searchTerm ? 'No matching categories' : 'No categories found'}
                description={
                  searchTerm
                    ? `No categories match “${searchTerm}”.`
                    : 'No categories have been created yet. Use the form on the left to write and add one.'
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-label">
                  <thead className="border-b border-line bg-surface-sunken text-micro font-bold uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-3">Category Name</th>
                      <th className="px-4 py-3">Slug Identifier</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredCategories.map((cat) => {
                      const isEditingThis = editingCategory?._id === cat._id;
                      return (
                        <tr
                          key={cat._id}
                          className={`transition-colors ${
                            isEditingThis ? 'bg-brand-50/50' : 'hover:bg-surface-sunken/50'
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-ink-900">
                            <div className="flex items-center gap-3">
                              {cat.imageUrl ? (
                                <img
                                  src={cat.imageUrl}
                                  alt={cat.name}
                                  className="h-10 w-10 rounded-lg border border-line object-cover shrink-0 bg-surface-sunken"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg border border-line bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                                  <FolderTree className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-ink-900 leading-tight">{cat.name}</p>
                                {cat.description ? (
                                  <p className="text-micro text-ink-500 line-clamp-1 mt-0.5">{cat.description}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-caption text-ink-600">
                            {cat.slug}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="success">Available</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditCategory(cat)}
                                title="Edit category in left panel"
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                  isEditingThis
                                    ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
                                    : 'border-line hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 text-ink-500'
                                }`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteCategory(cat)}
                                title="Delete category"
                                disabled={deleteCategoryMutation.isPending}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 text-ink-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
