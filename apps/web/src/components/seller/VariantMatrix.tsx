import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import clsx from 'clsx';
import { emptyVariant, type ProductEditorValues } from '../../features/products/editor-schema';

interface VariantMatrixProps {
  form: UseFormReturn<ProductEditorValues>;
}

const CELL =
  'h-9 w-full rounded-sm border border-line-strong bg-surface px-2 text-caption text-ink-900 placeholder:text-ink-300 transition-colors duration-120 hover:border-ink-300 focus:border-brand-500';
const CELL_BAD = 'border-danger-fg bg-danger-bg';

const GRID = 'grid grid-cols-[150px_minmax(180px,1fr)_110px_100px_minmax(160px,1fr)_36px] items-start gap-2';

type RowErrors = Array<{
  sku?: { message?: string };
  title?: { message?: string };
  priceModifierRupees?: { message?: string };
  stockQuantity?: { message?: string };
  attributes?: { message?: string };
}>;

/**
 * Editable variant grid (§9.11). Variants own stock and a price modifier; the SKU is the
 * identity buyers and carts will point at, so it is never derived silently.
 */
export function VariantMatrix({ form }: VariantMatrixProps) {
  const { control, register, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const variants = watch('variants');
  const rowErrors = formState.errors.variants as unknown as RowErrors | undefined;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className={clsx(GRID, 'border-b border-line pb-2')}>
            <span className="table-head">SKU</span>
            <span className="table-head">Variant title</span>
            <span className="table-head text-right">Price +₹</span>
            <span className="table-head text-right">Stock</span>
            <span className="table-head">Attributes</span>
            <span className="table-head text-right">
              <span className="sr-only">Remove</span>
            </span>
          </div>

          {fields.map((field, index) => {
            const errors = rowErrors?.[index];
            return (
              <div key={field.id} className={clsx(GRID, 'border-b border-line py-2 last:border-b-0')}>
                <div>
                  <input
                    aria-label={`Variant ${index + 1} SKU`}
                    className={clsx(CELL, 'font-mono uppercase', errors?.sku && CELL_BAD)}
                    placeholder="HAAT-IND-0001"
                    maxLength={64}
                    {...register(`variants.${index}.sku`)}
                  />
                  {errors?.sku?.message ? <p className="mt-1 text-micro text-danger-fg">{errors.sku.message}</p> : null}
                </div>

                <div>
                  <input
                    aria-label={`Variant ${index + 1} title`}
                    className={clsx(CELL, errors?.title && CELL_BAD)}
                    placeholder="Grade 8.8 · 50 mm"
                    maxLength={120}
                    {...register(`variants.${index}.title`)}
                  />
                  {errors?.title?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.title.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    aria-label={`Variant ${index + 1} price modifier in rupees`}
                    inputMode="decimal"
                    className={clsx(CELL, 'tnum text-right', errors?.priceModifierRupees && CELL_BAD)}
                    placeholder="0.00"
                    {...register(`variants.${index}.priceModifierRupees`)}
                  />
                  {errors?.priceModifierRupees?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.priceModifierRupees.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    aria-label={`Variant ${index + 1} stock quantity`}
                    inputMode="numeric"
                    className={clsx(CELL, 'tnum text-right', errors?.stockQuantity && CELL_BAD)}
                    placeholder="0"
                    {...register(`variants.${index}.stockQuantity`)}
                  />
                  {errors?.stockQuantity?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.stockQuantity.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    aria-label={`Variant ${index + 1} attributes`}
                    className={clsx(CELL, errors?.attributes && CELL_BAD)}
                    placeholder="grade=8.8, length=50 mm"
                    {...register(`variants.${index}.attributes`)}
                  />
                  {errors?.attributes?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.attributes.message}</p>
                  ) : (
                    <p className="mt-1 truncate text-micro text-ink-400" title="key=value pairs, separated by commas">
                      key=value pairs
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove variant ${index + 1}`}
                    className="grid h-7 w-7 place-items-center rounded-sm text-ink-400 transition-colors duration-120 hover:bg-danger-bg hover:text-danger-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => append(emptyVariant())}
          disabled={fields.length >= 30}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong bg-surface px-2.5 text-caption text-ink-700 transition-colors duration-120 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          Add variant
        </button>
        <p className="tnum text-caption text-ink-500">
          {variants.reduce((total, variant) => total + (Number(variant.stockQuantity) || 0), 0)} units across{' '}
          {fields.length} {fields.length === 1 ? 'variant' : 'variants'}
        </p>
      </div>
    </div>
  );
}
