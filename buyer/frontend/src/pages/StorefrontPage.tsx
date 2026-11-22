import { Navigate } from 'react-router-dom';

/**
 * Individual store pages are disabled across the marketplace.
 * All traffic is routed directly through the unified marketplace catalogue.
 */
export function StorefrontPage() {
  return <Navigate to="/catalogue" replace />;
}
