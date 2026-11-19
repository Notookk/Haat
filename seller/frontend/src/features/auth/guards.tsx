import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSellerAuth } from './SellerAuthProvider';

export function RequireSeller() {
  const { status, seller } = useSellerAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-admin">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. If user is authenticated as seller but hasn't created a store yet, redirect to onboarding
  if (!seller && location.pathname !== '/onboard') {
    return <Navigate to="/onboard" replace />;
  }

  // If already created a store, don't allow visiting /onboard again if ACTIVE or BLOCKED
  if (seller && location.pathname === '/onboard') {
    if (seller.status === 'BLOCKED') return <Navigate to="/status/blocked" replace />;
    if (seller.status === 'ACTIVE') return <Navigate to="/" replace />;
    return <Outlet />;
  }

  // 2. Status-aware routing: Blocked accounts must only see the blocked status page
  if (seller?.status === 'BLOCKED') {
    if (location.pathname !== '/status/blocked') {
      return <Navigate to="/status/blocked" replace />;
    }
    return <Outlet />;
  }

  // 3. Status-aware routing: Rejected accounts must only see the rejected status page or onboarding edit page
  if (seller?.status === 'REJECTED') {
    if (location.pathname !== '/status/rejected' && location.pathname !== '/onboard') {
      return <Navigate to="/status/rejected" replace />;
    }
    return <Outlet />;
  }

  // 4. Status-aware routing: Pending approval accounts can see the pending status page or onboarding edit page
  if (seller?.status === 'PENDING_APPROVAL') {
    if (location.pathname !== '/status/pending' && location.pathname !== '/onboard') {
      return <Navigate to="/status/pending" replace />;
    }
    return <Outlet />;
  }

  // 5. Active accounts should not remain on status pages
  if (seller?.status === 'ACTIVE' && location.pathname.startsWith('/status/')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RequireGuestSeller() {
  const { status, seller } = useSellerAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-admin">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (status === 'authenticated') {
    if (!seller) return <Navigate to="/onboard" replace />;
    if (seller.status === 'PENDING_APPROVAL') return <Navigate to="/status/pending" replace />;
    if (seller.status === 'BLOCKED') return <Navigate to="/status/blocked" replace />;
    if (seller.status === 'REJECTED') return <Navigate to="/status/rejected" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
