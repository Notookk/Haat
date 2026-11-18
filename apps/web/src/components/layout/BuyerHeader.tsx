import { NavLink, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../features/auth/AuthProvider';
import { Button } from '../ui/Button';

function navClass({ isActive }: { isActive: boolean }): string {
  return clsx(
    'inline-flex h-8 items-center rounded-sm px-2.5 text-label transition-colors duration-120 ease-out',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-surface-sunken hover:text-ink-900',
  );
}

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="HAAT home">
      <img
        src="/brand/haat-mark-128.png"
        alt=""
        width={28}
        height={28}
        decoding="async"
        className="h-7 w-7 shrink-0"
      />
      <span className="text-title font-extrabold tracking-[-0.035em] text-brand-600">HAAT</span>
      <span className="hidden text-micro uppercase tracking-[0.1em] text-ink-400 sm:inline">Retail &amp; wholesale</span>
    </Link>
  );
}

export function BuyerHeader() {
  const { status, user, seller, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-container items-center gap-3 px-4 md:px-6">
        <Wordmark />

        <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
          <NavLink to="/catalogue" className={navClass}>
            Catalogue
          </NavLink>

          {seller ? (
            <NavLink to="/seller/products" className={navClass}>
              Seller console
            </NavLink>
          ) : null}

          {status === 'authenticated' && user ? (
            <>
              <span className="ml-1 hidden max-w-[140px] truncate text-caption text-ink-500 sm:inline" title={user.fullName}>
                {user.fullName.split(' ')[0]}
              </span>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>
                Sign out
              </Button>
            </>
          ) : status === 'anonymous' ? (
            <>
              <NavLink to="/login" className={navClass}>
                Sign in
              </NavLink>
              <Link
                to="/register"
                className="inline-flex h-8 items-center rounded-md border border-brand-600 bg-brand-600 px-3 text-caption text-white transition-colors duration-120 hover:bg-brand-700"
              >
                Create account
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

export function BuyerFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-container flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 md:px-6">
        <span className="flex items-center gap-2">
          <img
            src="/brand/haat-mark-128.png"
            alt=""
            width={22}
            height={22}
            decoding="async"
            className="h-[22px] w-[22px] shrink-0"
          />
          <span className="text-title font-extrabold tracking-[-0.035em] text-brand-600">HAAT</span>
        </span>
        <span className="text-caption text-ink-500">Retail and wholesale, sold by verified Indian stores.</span>
        <span className="ml-auto font-mono text-micro uppercase tracking-[0.06em] text-ink-400">India · en-IN</span>
      </div>
    </footer>
  );
}
