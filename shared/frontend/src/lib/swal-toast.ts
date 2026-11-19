import Swal, { type SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import './swal-toast.css';

/**
 * SweetAlert2 Toast with auto-dismiss.
 *
 * Rules:
 * - Positioned at top-end.
 * - Compact top and bottom padding.
 * - Shows smooth timer progress bar.
 * - Auto-dismisses without hover pause.
 */
export const swalToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  scrollbarPadding: false,
  showClass: {
    popup: 'swal2-toast-show',
    backdrop: '',
  },
  hideClass: {
    popup: 'swal2-toast-hide',
    backdrop: '',
  },
});

export const showToast = {
  success: (title: string, text?: string) =>
    swalToast.fire({
      icon: 'success',
      title,
      text,
    }),
  error: (title: string, text?: string) =>
    swalToast.fire({
      icon: 'error',
      title,
      text,
    }),
  warning: (title: string, text?: string) =>
    swalToast.fire({
      icon: 'warning',
      title,
      text,
    }),
  info: (title: string, text?: string) =>
    swalToast.fire({
      icon: 'info',
      title,
      text,
    }),
  custom: (options: SweetAlertOptions) => swalToast.fire(options),
};

export interface SwalConfirmOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  danger?: boolean;
}

/**
 * SweetAlert2 Confirmation Dialog (replaces browser native window.confirm).
 */
export const showConfirm = async (options: SwalConfirmOptions | string): Promise<boolean> => {
  const opts: SwalConfirmOptions = typeof options === 'string' ? { title: options } : options;
  const isDanger = opts.danger ?? true;

  const result = await Swal.fire({
    title: opts.title,
    text: opts.text,
    html: opts.html,
    icon: opts.icon ?? 'warning',
    showCancelButton: true,
    confirmButtonText: opts.confirmButtonText ?? (isDanger ? 'Yes, proceed' : 'Confirm'),
    cancelButtonText: opts.cancelButtonText ?? 'Cancel',
    confirmButtonColor: isDanger ? '#e11d48' : '#16135c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
    scrollbarPadding: false,
  });

  return result.isConfirmed;
};

export interface SwalPromptOptions {
  title: string;
  text?: string;
  inputPlaceholder?: string;
  defaultValue?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  danger?: boolean;
  required?: boolean;
}

/**
 * SweetAlert2 Prompt Dialog (replaces browser native window.prompt).
 */
export const showPrompt = async (options: SwalPromptOptions | string): Promise<string | null> => {
  const opts: SwalPromptOptions = typeof options === 'string' ? { title: options } : options;
  const isDanger = opts.danger ?? false;

  const result = await Swal.fire({
    title: opts.title,
    text: opts.text,
    input: 'text',
    inputValue: opts.defaultValue ?? '',
    inputPlaceholder: opts.inputPlaceholder ?? 'Enter details...',
    showCancelButton: true,
    confirmButtonText: opts.confirmButtonText ?? 'Submit',
    cancelButtonText: opts.cancelButtonText ?? 'Cancel',
    confirmButtonColor: isDanger ? '#e11d48' : '#16135c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    scrollbarPadding: false,
    inputValidator: (value) => {
      if (opts.required && (!value || !value.trim())) {
        return 'This field is required';
      }
      return null;
    },
  });

  if (result.isConfirmed) {
    return result.value || '';
  }
  return null;
};

export { Swal };
