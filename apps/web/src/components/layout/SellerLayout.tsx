import { NavLink, Outlet, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../features/auth/AuthProvider';
import { Badge, toneForKyc } from '../ui/Badge';
import { initials } from '../../lib/format';

function railClass({ isActive }: { isActive: boolean }): string {
  return clsx(
    'flex h-9 items-center rounded-sm px-3 text-label transition-colors duration-120 ease-out',
    isActive ? 'bg-surface text-brand-700 shadow-card' : 'text-ink-600 hover:bg-surface hover:text-ink-900',
  );
}

export function SellerLayout() {
  const { user, seller, logout } = useAuth();

  if (!seller || !user) {
    // Guarded by RequireSeller; this branch only covers a stale render during sign-out.
    return null;
  }

  return (
    <div className="min-h-dvh bg-canvas-admin md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface-sunken px-4 py-5 md:flex md:min-h-dvh md:flex-col md:border-b-0 md:border-r">
        <div>
          <Link to="/" className="flex items-center gap-2" aria-label="HAAT home">
            <img
              src="/brand/haat-mark-128.png"
              alt=""
              width={24}
              height={24}
              decoding="async"
              className="h-6 w-6 shrink-0"
            />
            <span className="text-title font-extrabold tracking-[-0.035em] text-brand-600">HAAT</span>
          </Link>
          <p className="mt-1 text-micro uppercase tracking-[0.08em] text-ink-500">Seller console</p>
        </div>

        <div className="mt-6 rounded-md border border-line bg-surface px-3 py-3">
          <p className="truncate text-label text-ink-900" title={seller.storeName}>
            {seller.storeName}
          </p>
          <p className="mt-0.5 truncate font-mono text-micro text-ink-400">/store/{seller.storeSlug}</p>
          <div className="mt-2">
            <Badge tone={toneForKyc(seller.kycStatus)}>{seller.kycStatus}</Badge>
          </div>
        </div>

        <nav className="mt-6 flex gap-1 md:flex-col" aria-label="Seller">
          <NavLink to="/seller/products" className={railClass}>
            Products
          </NavLink>
        </nav>

        <div className="mt-6 flex items-center gap-2 border-t border-line pt-4 md:mt-auto">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill border border-line bg-surface font-mono text-micro text-ink-600">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption text-ink-800">{user.fullName}</p>
            <p className="truncate font-mono text-micro text-ink-400">{user.phoneNumber}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-sm px-2 py-1 text-caption text-ink-600 transition-colors duration-120 hover:bg-surface hover:text-ink-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
