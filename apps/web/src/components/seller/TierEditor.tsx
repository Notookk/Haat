import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import clsx from 'clsx';
import { emptyTier, tierIssues, type ProductEditorValues } from '../../features/products/editor-schema';

interface TierEditorProps {
  form: UseFormReturn<ProductEditorValues>;
  disabled?: boolean;
}

const CELL =
  'h-9 w-full rounded-sm border border-line-strong bg-surface px-2 text-caption text-ink-900 placeholder:text-ink-300 transition-colors duration-120 hover:border-ink-300 focus:border-brand-500';
const CELL_BAD = 'border-danger-fg bg-danger-bg';
const GRID = 'grid grid-cols-[minmax(96px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_36px] items-start gap-2';

type TierRowErrors = Array<{
  minQuantity?: { message?: string };
  maxQuantity?: { message?: string };
  unitPriceRupees?: { message?: string };
}>;

/**
 * Tier ladder editor (§9.11): `[min, max, unit price]` rows with overlap/gap validation.
 * A blank maximum means open-ended and is only legal on the final row.
 */
export function TierEditor({ form, disabled = false }: TierEditorProps) {
  const { control, register, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'pricingTiers' });
  const rows = watch('pricingTiers');
  const rowErrors = formState.errors.pricingTiers as unknown as TierRowErrors | undefined;
  const rootMessage = (formState.errors.pricingTiers as { message?: string } | undefined)?.message;
  const issues = tierIssues(rows);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className={clsx(GRID, 'border-b border-line pb-2')}>
            <span className="table-head">Min units</span>
            <span className="table-head">Max units</span>
            <span className="table-head text-right">Unit price ₹</span>
            <span className="table-head text-right">
              <span className="sr-only">Remove</span>
            </span>
          </div>

          {fields.length === 0 ? (
            <p className="border-b border-line py-3 text-caption text-ink-500">
              No quantity tiers. Buyers pay the retail price at every quantity.
            </p>
          ) : null}

          {fields.map((field, index) => {
            const errors = rowErrors?.[index];
            return (
              <div key={field.id} className={clsx(GRID, 'border-b border-line py-2 last:border-b-0')}>
                <div>
                  <input
                    aria-label={`Tier ${index + 1} minimum quantity`}
                    inputMode="numeric"
                    placeholder="100"
                    disabled={disabled}
                    className={clsx(CELL, 'tnum text-right', errors?.minQuantity && CELL_BAD)}
                    {...register(`pricingTiers.${index}.minQuantity`)}
                  />
                  {errors?.minQuantity?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.minQuantity.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    aria-label={`Tier ${index + 1} maximum quantity`}
                    inputMode="numeric"
                    placeholder="499 · blank = no limit"
                    disabled={disabled}
                    className={clsx(CELL, 'tnum text-right', errors?.maxQuantity && CELL_BAD)}
                    {...register(`pricingTiers.${index}.maxQuantity`)}
                  />
                  {errors?.maxQuantity?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.maxQuantity.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    aria-label={`Tier ${index + 1} unit price in rupees`}
                    inputMode="decimal"
                    placeholder="16.50"
                    disabled={disabled}
                    className={clsx(CELL, 'tnum text-right', errors?.unitPriceRupees && CELL_BAD)}
                    {...register(`pricingTiers.${index}.unitPriceRupees`)}
                  />
                  {errors?.unitPriceRupees?.message ? (
                    <p className="mt-1 text-micro text-danger-fg">{errors.unitPriceRupees.message}</p>
                  ) : null}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    aria-label={`Remove tier ${index + 1}`}
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
          onClick={() => append(emptyTier())}
          disabled={disabled || fields.length >= 20}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong bg-surface px-2.5 text-caption text-ink-700 transition-colors duration-120 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          Add tier
        </button>
        <p className="text-caption text-ink-500">Blank maximum = open-ended. Only the last tier may be open-ended.</p>
      </div>

      {issues.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-sm border border-warning-fg bg-warning-bg px-3 py-2">
          {issues.map((issue) => (
            <li key={issue} className="text-caption text-warning-fg">
              {issue}
            </li>
          ))}
        </ul>
      ) : null}

      {rootMessage ? (
        <p role="alert" className="mt-3 text-caption font-semibold text-danger-fg">
          {rootMessage}
        </p>
      ) : null}
    </div>
  );
}
