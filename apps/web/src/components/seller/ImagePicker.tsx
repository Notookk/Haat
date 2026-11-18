import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import clsx from 'clsx';
import type { ProductEditorValues } from '../../features/products/editor-schema';
import { uploadProductImage } from '../../features/products/api';
import { errorMessage } from '../../lib/api-client';
import { Button } from '../ui/Button';

interface ImagePickerProps {
  form: UseFormReturn<ProductEditorValues>;
}

type ImageErrors = Array<{ url?: { message?: string }; altText?: { message?: string } }>;

const URL_PATTERN = /^https?:\/\/\S+$/i;

/**
 * Signed direct-to-Cloudinary upload with manual reorder (§9.11).
 * The file never passes through the API server; the browser posts straight to Cloudinary
 * with a short-lived signature.
 */
export function ImagePicker({ form }: ImagePickerProps) {
  const { control, register, watch, setValue, formState } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: 'images' });
  const images = watch('images');
  const imageErrors = formState.errors.images as unknown as ImageErrors | undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const remaining = 10 - fields.length;

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const accepted = Array.from(files).slice(0, Math.max(0, remaining));
      for (const [offset, file] of accepted.entries()) {
        const uploaded = await uploadProductImage(file);
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

  const addByUrl = () => {
    const url = urlDraft.trim();
    if (!URL_PATTERN.test(url)) {
      setUrlError('Paste a full https image URL.');
      return;
    }
    if (images.some((image) => image.url === url)) {
      setUrlError('That image is already in the gallery.');
      return;
    }
    append({ url, publicId: undefined, altText: '', isPrimary: fields.length === 0 });
    setUrlDraft('');
    setUrlError(null);
  };

  const makePrimary = (index: number) => {
    setValue(
      'images',
      images.map((image, position) => ({ ...image, isPrimary: position === index })),
      { shouldDirty: true },
    );
  };

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= fields.length || from === to) return;
    move(from, to);
  };

  return (
    <div>
      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-surface-sunken px-4 py-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink-500">
              <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <p className="text-label text-ink-800">No images yet</p>
              <p className="mt-0.5 max-w-prose text-caption text-ink-500">
                JPG, PNG or WebP up to 5 MB. Until you add one, the card shows the SKU on a hairline texture instead of
                a broken image.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {fields.map((field, index) => {
            const image = images[index];
            const errors = imageErrors?.[index];
            return (
              <li
                key={field.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragFrom !== null) reorder(dragFrom, index);
                  setDragFrom(null);
                }}
                className={clsx(
                  'rounded-md border bg-surface p-2 transition-colors duration-120',
                  dragFrom === index ? 'border-brand-500' : 'border-line',
                )}
              >
                <div className="flex gap-2">
                  <div className="relative h-[84px] w-[112px] shrink-0 overflow-hidden rounded-sm border border-line">
                    {image?.url ? (
                      <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="img-fallback h-full w-full" aria-hidden="true" />
                    )}
                    {image?.isPrimary ? (
                      <span className="absolute left-1 top-1 rounded-pill bg-brand-600 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
                        Primary
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <input
                      aria-label={`Alt text for image ${index + 1}`}
                      className={clsx(
                        'h-8 w-full rounded-sm border border-line-strong bg-surface px-2 text-caption text-ink-900 placeholder:text-ink-300 focus:border-brand-500',
                        errors?.altText && 'border-danger-fg bg-danger-bg',
                      )}
                      placeholder="Alt text, e.g. Box of M10 bolts"
                      maxLength={160}
                      {...register(`images.${index}.altText`)}
                    />
                    {errors?.altText?.message ? (
                      <p className="mt-1 text-micro text-danger-fg">{errors.altText.message}</p>
                    ) : null}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => makePrimary(index)}
                        className={clsx(
                          'inline-flex h-7 items-center gap-1 rounded-sm border px-1.5 text-micro transition-colors duration-120',
                          image?.isPrimary
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-line-strong text-ink-600 hover:bg-surface-sunken',
                        )}
                        aria-pressed={Boolean(image?.isPrimary)}
                      >
                        <Star size={12} strokeWidth={2} aria-hidden="true" />
                        {image?.isPrimary ? 'Primary' : 'Make primary'}
                      </button>

                      <button
                        type="button"
                        onClick={() => reorder(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move image ${index + 1} earlier`}
                        className="grid h-7 w-7 place-items-center rounded-sm text-ink-500 transition-colors duration-120 hover:bg-surface-sunken disabled:opacity-40"
                      >
                        <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorder(index, index + 1)}
                        disabled={index === fields.length - 1}
                        aria-label={`Move image ${index + 1} later`}
                        className="grid h-7 w-7 place-items-center rounded-sm text-ink-500 transition-colors duration-120 hover:bg-surface-sunken disabled:opacity-40"
                      >
                        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        aria-label={`Remove image ${index + 1}`}
                        className="ml-auto grid h-7 w-7 place-items-center rounded-sm text-ink-400 transition-colors duration-120 hover:bg-danger-bg hover:text-danger-fg"
                      >
                        <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>

                    {errors?.url?.message ? <p className="mt-1 text-micro text-danger-fg">{errors.url.message}</p> : null}
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-1 text-micro text-ink-400">
                  <span
                    draggable
                    onDragStart={() => setDragFrom(index)}
                    onDragEnd={() => setDragFrom(null)}
                    aria-hidden="true"
                    className="cursor-grab active:cursor-grabbing"
                    title="Drag onto another image to reorder"
                  >
                    <GripVertical size={14} strokeWidth={2} />
                  </span>
                  <span className="truncate font-mono">{image?.publicId ?? 'external URL'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          id="product-image-upload"
          onChange={(event) => void onFiles(event.target.files)}
        />
        <Button
          variant="secondary"
          size="sm"
          loading={uploading}
          loadingLabel="Uploading…"
          disabled={remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          {remaining > 0 ? 'Upload images' : 'Gallery is full'}
        </Button>
        <span className="tnum text-micro text-ink-500">{fields.length}/10</span>
      </div>

      {uploadError ? (
        <p role="alert" className="mt-2 text-caption text-danger-fg">
          {uploadError}{' '}
          <span className="text-ink-500">You can paste an image URL below instead.</span>
        </p>
      ) : null}

      <div className="mt-3 border-t border-line pt-3">
        <label className="field-label" htmlFor="image-url">
          Or paste an image URL
        </label>
        <div className="flex gap-2">
          <input
            id="image-url"
            value={urlDraft}
            onChange={(event) => {
              setUrlDraft(event.target.value);
              setUrlError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addByUrl();
              }
            }}
            placeholder="https://images.example.com/bolt.jpg"
            className="h-9 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-2 font-mono text-caption text-ink-900 placeholder:text-ink-300 focus:border-brand-500"
            autoComplete="off"
          />
          <Button variant="secondary" size="sm" onClick={addByUrl} disabled={remaining <= 0}>
            Add
          </Button>
        </div>
        {urlError ? (
          <span className="field-error" role="alert">
            {urlError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
