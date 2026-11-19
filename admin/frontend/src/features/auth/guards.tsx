import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';
import { SkeletonBlock } from '@haat/shared-frontend';

export function RequireAdmin() {
  const { status, user } = useAdminAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-4">
          <SkeletonBlock className="h-8 w-full" />
          <SkeletonBlock className="h-6 w-3/4" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function RequireGuestAdmin() {
  const { status } = useAdminAuth();

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
