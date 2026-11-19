import { useRef, useState } from 'react';
import { UploadCloud, ImagePlus, Star, Trash2, GripVertical, CheckCircle2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import clsx from 'clsx';
import type { ProductEditorValues } from '../features/products/editor-schema';
import { uploadProductImage } from '../features/products/api';
import { errorMessage, Button } from '@haat/shared-frontend';

interface ImagePickerProps {
  form: UseFormReturn<ProductEditorValues>;
  productId?: string;
}

const MAX_IMAGES = 5;

/**
 * Direct-to-Cloudinary upload with drag-and-drop and select image only.
 * No link paste option, maximum 5 images allowed.
 */
export function ImagePicker({ form, productId }: ImagePickerProps) {
  const { control, watch, setValue } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: 'images' });
  const images = watch('images') || [];

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const remaining = MAX_IMAGES - fields.length;

  const onFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    if (fields.length >= MAX_IMAGES) {
      setUploadError(`Maximum ${MAX_IMAGES} photos allowed.`);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const accepted = Array.from(files).slice(0, Math.max(0, remaining));
      for (const [offset, file] of accepted.entries()) {
        const uploaded = await uploadProductImage(file, productId);
        append({
          url: uploaded.url,
          publicId: uploaded.publicId,
          altText: '',
          isPrimary: fields.length === 0 && offset === 0,
        });
      }
    } catch (error) {
      setUploadError(errorMessage(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void onFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (remaining > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const makePrimary = (index: number) => {
    setValue(
      'images',
      images.map((img, pos) => ({ ...img, isPrimary: pos === index })),
      { shouldDirty: true },
    );
  };

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= fields.length || from === to) return;
    move(from, to);
  };

  return (
    <div className="space-y-3">
      {/* Hidden Native File Input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        id="product-image-upload-input"
        onChange={(e) => void onFiles(e.target.files)}
      />

      {/* Main Drag-and-Drop Area when 0 images are present */}
      {fields.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 text-center',
            isDragOver
              ? 'border-brand-500 bg-brand-50/70 text-brand-700'
              : 'border-line-strong bg-surface-sunken/40 hover:bg-surface-sunken/80 hover:border-brand-400 text-ink-600',
          )}
        >
          <div className="h-10 w-10 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mb-2">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="text-label font-bold text-ink-900">
            {uploading ? 'Uploading to cloud...' : 'Drag & drop product photos here'}
          </p>
          <p className="mt-0.5 text-micro text-ink-500">
            or <span className="text-brand-600 font-semibold underline underline-offset-2">browse files</span> (up to 5 photos)
          </p>
          <span className="mt-2 inline-flex items-center text-[11px] font-mono font-medium text-ink-400 bg-surface px-2 py-0.5 rounded border border-line">
            JPG, PNG or WebP • Max 5MB each
          </span>
        </div>
      ) : (
        /* Image Grid for 1 to 5 images */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-micro font-bold text-ink-600">
            <span>Uploaded Photos ({fields.length}/{MAX_IMAGES})</span>
            {remaining > 0 ? (
              <span className="text-ink-400 font-normal">Drag photos to reorder • Click star for primary</span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Max 5 photos reached
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {fields.map((field, index) => {
              const image = images[index];
              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDragFrom(index)}
                  onDragEnd={() => setDragFrom(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) reorder(dragFrom, index);
                    setDragFrom(null);
                  }}
                  className={clsx(
                    'relative aspect-square rounded-xl border overflow-hidden bg-surface-sunken shadow-2xs group transition-all duration-150',
                    image?.isPrimary ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-line hover:border-line-strong',
                    dragFrom === index && 'opacity-40 scale-95',
                  )}
                >
                  {image?.url ? (
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-ink-300">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}

                  {/* Primary Badge */}
                  {image?.isPrimary && (
                    <span className="absolute top-1 left-1 rounded-md bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs pointer-events-none">
                      Primary
                    </span>
                  )}

                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-ink-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 cursor-grab" title="Drag to reorder">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(index);
                        }}
                        className="h-5 w-5 rounded bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex justify-center pb-0.5">
                      {!image?.isPrimary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            makePrimary(index);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-surface/90 hover:bg-surface text-ink-900 px-1.5 py-0.5 text-[9px] font-bold shadow-xs cursor-pointer"
                          title="Set as primary product photo"
                        >
                          <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                          Set Primary
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Remaining Slots / Add Button */}
            {remaining > 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={clsx(
                  'aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all duration-150',
                  isDragOver
                    ? 'border-brand-500 bg-brand-50/70 text-brand-700'
                    : 'border-line-strong bg-surface-sunken/40 hover:bg-surface-sunken/80 hover:border-brand-400 text-ink-500',
                )}
                title="Drop photo here or click to browse"
              >
                <ImagePlus className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold">
                  {uploading ? 'Adding...' : '+ Add'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uploading Status Indicator */}
      {uploading && (
        <p className="text-micro text-brand-600 font-semibold animate-pulse flex items-center gap-1.5">
          <UploadCloud className="h-3.5 w-3.5 animate-bounce" />
          Uploading image to cloud storage...
        </p>
      )}

      {/* Error Message */}
      {uploadError && (
        <p role="alert" className="text-micro text-rose-600 font-medium">
          {uploadError}
        </p>
      )}
    </div>
  );
}
