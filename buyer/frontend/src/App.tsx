import {
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
  useRouteError,
  isRouteErrorResponse,
  Link,
} from 'react-router-dom';
import { Toaster, Button } from '@haat/shared-frontend';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { buyerRoutes } from './routes/buyer.routes';
import { useCatalogRealtime } from './features/catalog/useCatalogRealtime';

function BuyerErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected application error occurred.';

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-danger-bg p-4 text-danger-fg mb-4">
        <AlertCircle size={36} />
      </div>
      <h1 className="text-display-md font-bold text-ink-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-caption text-ink-500 leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <RefreshCw size={16} className="mr-1.5" />
          Reload Page
        </Button>
        <Button asChild variant="primary">
          <Link to="/">
            <Home size={16} className="mr-1.5" />
            Go to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

function RootLayout() {
  useCatalogRealtime();

  return (
    <>
      <Outlet />
      <ScrollRestoration />
      <Toaster position="top-right" richColors />
    </>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      errorElement: <BuyerErrorBoundary />,
      children: buyerRoutes,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export default router;
