import { Link } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@haat/shared-frontend';

export function SellerNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Store size={32} />
      </div>
      <h1 className="mt-4 text-display-md text-ink-900">Seller Page Not Found</h1>
      <p className="mt-2 max-w-md text-body text-ink-500">
        The merchant management page or SKU you were looking for does not exist or has been relocated.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button icon={<ArrowLeft size={16} />}>Back to Seller Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
