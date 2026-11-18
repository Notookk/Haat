import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { SkeletonBlock } from '../../components/ui/States';

/** Holds the route while the refresh cookie is being exchanged — no flash of a signed-out screen. */
function BootScreen() {
  return (
    <div className="mx-auto w-full max-w-container px-4 py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Restoring your session…</span>
      <SkeletonBlock className="h-8 w-40" />
      <SkeletonBlock className="mt-6 h-4 w-72" />
      <SkeletonBlock className="mt-10 h-64 w-full" />
    </div>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'booting') return <BootScreen />;
  if (status === 'anonymous') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Seller surfaces require an onboarded store; buyers are sent to onboarding instead of a dead end. */
export function RequireSeller() {
  const { status, user, seller } = useAuth();
  const location = useLocation();

  if (status === 'booting') return <BootScreen />;
  if (status === 'anonymous' || !user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!seller) return <Navigate to="/seller/onboarding" replace />;
  return <Outlet />;
}
