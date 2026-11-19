import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FolderTree, Trash2, Search, X, Sparkles, FolderPlus } from 'lucide-react';
import {
  api,
  Badge,
  Button,
  CustomSelect,
  Panel,
  TextField,
  TextAreaField,
  SkeletonBlock,
  ErrorState,
  EmptyState,
  showToast,
  showConfirm,
} from '@haat/shared-frontend';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  path: string;
  depth: number;
  productCount: number;
  isActive: boolean;
  parentId?: string | null;
}

const newCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase alphanumeric with single hyphens'),
  parentId: z.string().optional(),
  description: z.string().trim().max(400).optional(),
});

type NewCategoryFormValues = z.infer<typeof newCategorySchema>;

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useQuery<{ categories: CategoryItem[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get<{ categories: CategoryItem[] }>('/api/v1/admin/categories');
      return response.data;
    },
  });

  const form = useForm<NewCategoryFormValues>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: { name: '', slug: '', parentId: '', description: '' },
    mode: 'onBlur',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;

  const categoryNameVal = watch('name');

  // Automatically generate slug when category name changes, if user hasn't explicitly customized it
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val, { shouldValidate: true });
    setValue('slug', slugify(val), { shouldValidate: true });
  };

  const createMutation = useMutation({
    mutationFn: async (values: NewCategoryFormValues) => {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim().toLowerCase(),
        parentId: values.parentId ? values.parentId : null,
        description: values.description?.trim() || undefined,
      };
      await api.post('/api/v1/admin/categories', payload);
    },
    onSuccess: () => {
      reset();
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast.success('Category created', 'The category has been added to taxonomy.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create category';
      setActionError(msg);
      showToast.error('Creation failed', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/admin/categories/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      showToast.success('Category deleted', 'The category has been removed.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete category';
      showToast.error('Delete failed', msg);
    },
  });

  const categories = data?.categories || [];

  // Filter categories by search term
  const filteredCategories = categories.filter((cat) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      cat.name.toLowerCase().includes(term) ||
      cat.slug.toLowerCase().includes(term) ||
      cat.path.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Taxonomy &amp; Categories</h1>
          <p className="mt-1 text-caption text-ink-500">
            Organize catalog hierarchy, manage material categories, and control tree depth across the marketplace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="brand">{categories.length} Categories</Badge>
        </div>
      </header>

      {actionError && (
        <div className="rounded-md border border-danger-fg/20 bg-danger-bg p-3 text-caption text-danger-fg">
          {actionError}
        </div>
      )}

      {/* 40 - 60 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* 40% Column (Left side: 5 of 12 cols, ~41.7% width) */}
        <div className="lg:col-span-5 space-y-6">
          <Panel className="p-5 md:p-6 shadow-2xs border-brand-200 sticky top-20">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <FolderPlus className="h-5 w-5 text-brand-600" />
              <div>
                <h2 className="text-subtitle font-bold text-ink-900">Add Category</h2>
                <p className="text-micro text-ink-500">Write category details to add a new taxonomy node</p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
              noValidate
              className="space-y-4 pt-2"
            >
              {/* Category Name Input Field */}
              <div>
                <label htmlFor="cat-name-input" className="block text-label font-bold text-ink-800 mb-1">
                  Category Name <span className="text-brand-600">*</span>
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  placeholder="e.g. Spices & Seasonings"
                  value={categoryNameVal}
                  onChange={handleNameChange}
                  className={`w-full h-10 rounded-md border px-3 text-body text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-1 ${
                    errors.name
                      ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-line-strong bg-surface focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
                {errors.name?.message && (
                  <p className="mt-1 text-micro text-rose-600 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Slug Input Field */}
              <TextField
                label="Category Slug (URL Key) *"
                placeholder="e.g. spices-seasonings"
                error={errors.slug?.message}
                {...register('slug')}
              />

              {/* Parent Category Dropdown */}
              <div>
                <label htmlFor="parent-cat-select" className="block text-label font-bold text-ink-800 mb-1">
                  Parent Category <span className="text-ink-400 font-normal">(optional)</span>
                </label>
                <CustomSelect
                  id="parent-cat-select"
                  value={watch('parentId') || ''}
                  onChange={(val) => setValue('parentId', val, { shouldValidate: true, shouldDirty: true })}
                  placeholder="None (Top-Level Root Category)"
                  options={[
                    { value: '', label: 'None (Top-Level Root Category)' },
                    ...categories.map((cat) => ({
                      value: cat._id,
                      label: cat.name,
                      sublabel: `${cat.path} — Level ${cat.depth}`,
                    })),
                  ]}
                />
                <p className="mt-1 text-micro text-ink-400">
                  Select a parent to nest this category within an existing hierarchy.
                </p>
              </div>

              {/* Description Field */}
              <div>
                <TextAreaField
                  label="Description"
                  optional
                  rows={2}
                  placeholder="Brief description of products classified under this category"
                  error={errors.description?.message}
                  {...register('description')}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !categoryNameVal?.trim()}
                  loading={createMutation.isPending}
                  loadingLabel="Creating Category..."
                  className="w-full bg-[#16135c] hover:bg-[#12104b] text-white"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Category
                </Button>
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
                  <h2 className="text-subtitle font-bold text-ink-900">Categories Table</h2>
                  <p className="text-micro text-ink-500">View and inspect registered marketplace taxonomy</p>
                </div>
              </div>

              {/* Table Quick Search Filter */}
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

            {isLoading ? (
              <div className="space-y-3 py-2">
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            ) : error ? (
              <ErrorState message="Failed to load categories" onRetry={() => void refetch()} />
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                icon={<FolderTree size={28} className="text-ink-400" />}
                title={searchTerm ? 'No matching categories' : 'No categories found'}
                description={
                  searchTerm
                    ? `No categories match “${searchTerm}”. Clear your search to see all categories.`
                    : 'The product taxonomy tree is currently empty. Use the form on the left to write and add categories.'
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-label">
                  <thead className="border-b border-line bg-surface-sunken text-micro font-bold uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-3">Category Name</th>
                      <th className="px-3 py-3">Slug / Path</th>
                      <th className="px-3 py-3 text-center">Depth</th>
                      <th className="px-3 py-3 text-center">Products</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredCategories.map((cat) => (
                      <tr key={cat._id} className="hover:bg-surface-sunken/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-ink-900">
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${cat.depth * 14}px` }}>
                            <FolderTree className="h-4 w-4 text-brand-600 shrink-0" />
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-caption text-ink-600">
                          {cat.path || cat.slug}
                        </td>
                        <td className="px-3 py-3 text-center text-caption text-ink-600">
                          <span className="inline-block px-2 py-0.5 rounded bg-surface-sunken border border-line text-micro font-bold">
                            L{cat.depth}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-caption font-semibold text-ink-900">
                          {cat.productCount ?? 0}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge tone={cat.isActive ? 'success' : 'neutral'}>
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {cat.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger-fg hover:bg-danger-bg hover:text-danger-fg h-8 w-8 p-0 inline-flex items-center justify-center"
                              disabled={deleteMutation.isPending}
                              title="Delete Category"
                              onClick={async () => {
                                const confirmed = await showConfirm({
                                  title: 'Delete Category?',
                                  text: `Are you sure you want to delete category "${cat.name}"? Products currently assigned to this category will need to be reclassified.`,
                                  confirmButtonText: 'Yes, delete',
                                  danger: true,
                                });
                                if (confirmed) {
                                  deleteMutation.mutate(cat._id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
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
