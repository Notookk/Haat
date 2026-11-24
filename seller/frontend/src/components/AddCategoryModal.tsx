import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  FolderPlus,
  UploadCloud,
  Check,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { showToast } from '@haat/shared-frontend';
import {
  useCreateCategory,
  uploadProductImage,
  myProductKeys,
} from '../features/products/api';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (category: {
    _id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
  }) => void;
}

export function AddCategoryModal({ isOpen, onClose, onCategoryCreated }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryImage, setCategoryImage] = useState<{ url: string; publicId: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const createCategoryMutation = useCreateCategory();

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.error('Invalid File', 'Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('File Too Large', 'Image must be under 5MB.');
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage(null);

    try {
      const uploaded = await uploadProductImage(file);
      setCategoryImage(uploaded);
      showToast.success('Image Uploaded', 'Category cover photo attached.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      setErrorMessage(msg);
      showToast.error('Upload Failed', msg);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setCategoryImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Category name must be at least 2 characters long.');
      return;
    }

    setErrorMessage(null);

    try {
      const created = await createCategoryMutation.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
        imageUrl: categoryImage?.url || null,
        imagePublicId: categoryImage?.publicId || null,
      });

      // Optimistically inject into categories cache so it's immediately available
      queryClient.setQueryData(myProductKeys.categories, (old: any) => {
        if (!old || !Array.isArray(old)) return [created];
        const exists = old.some((c: any) => c._id === created._id);
        return exists ? old : [...old, created];
      });

      showToast.success('Category Created', `"${created.name}" is now available and selected.`);
      onCategoryCreated(created);

      // Reset state and close modal
      setName('');
      setDescription('');
      setCategoryImage(null);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create category';
      setErrorMessage(msg);
      showToast.error('Creation Failed', msg);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden z-[11010] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-elevated shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="add-category-title" className="text-title font-extrabold text-ink-900">
                Add New Category
              </h2>
              <p className="text-caption text-ink-500">
                Define a taxonomy category to classify your store products
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-sunken hover:text-ink-900 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Body (using div to prevent outer form submit bubbling) */}
        <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto admin-scrollbar">
          {errorMessage && (
            <div className="rounded-lg border border-danger-fg/20 bg-danger-bg p-3 text-caption text-danger-fg">
              {errorMessage}
            </div>
          )}

          {/* 1. Category Name */}
          <div>
            <label htmlFor="modal-cat-name" className="block text-label font-bold text-ink-800 mb-1">
              Category Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              id="modal-cat-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleSubmit(e);
                }
              }}
              placeholder="e.g. Organic & Regional Spices"
              className="w-full h-10 rounded-lg border border-line-strong bg-surface px-3 text-body text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* 2. Category Image (Optional) */}
          <div>
            <label className="block text-label font-bold text-ink-800 mb-1">
              Category Image <span className="text-micro font-normal text-ink-400">(Optional)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
              id="modal-cat-file-input"
            />

            {categoryImage ? (
              <div className="relative flex items-center gap-3 rounded-xl border border-line bg-surface-sunken/40 p-3">
                <img
                  src={categoryImage.url}
                  alt="Category preview"
                  className="h-16 w-16 rounded-lg object-cover border border-line shrink-0 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink-900 truncate">Photo attached</p>
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
                className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-surface p-4 text-center hover:border-brand-500 hover:bg-brand-50/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <div className="flex flex-col items-center py-2">
                    <Loader2 className="h-6 w-6 text-brand-600 animate-spin" />
                    <span className="mt-1.5 text-caption font-semibold text-brand-700">Uploading photo...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-sunken text-ink-500 group-hover:text-brand-600 group-hover:bg-brand-50 transition-colors">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="mt-2 text-caption font-bold text-ink-700 group-hover:text-brand-700">
                      Upload category cover image
                    </span>
                    <span className="text-[11px] text-ink-400">PNG, JPG, WebP up to 5MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 3. Description (Optional) */}
          <div>
            <label htmlFor="modal-cat-desc" className="block text-label font-bold text-ink-800 mb-1">
              Description <span className="text-micro font-normal text-ink-400">(Optional)</span>
            </label>
            <textarea
              id="modal-cat-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of products classified under this category..."
              className="w-full rounded-lg border border-line-strong bg-surface p-3 text-body text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={createCategoryMutation.isPending || isUploadingImage}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-label font-semibold text-ink-700 hover:bg-surface-sunken transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleSubmit(e);
              }}
              disabled={createCategoryMutation.isPending || isUploadingImage || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-label font-bold text-white shadow-card hover:bg-brand-700 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {createCategoryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Create Category</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
