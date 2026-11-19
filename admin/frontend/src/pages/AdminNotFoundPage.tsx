import { Link } from 'react-router-dom';
import { Button } from '@haat/shared-frontend';

export function AdminNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-display-lg font-extrabold text-ink-900">404</h1>
      <p className="mt-2 text-subtitle text-ink-600">The requested administrative view does not exist.</p>
      <div className="mt-6">
        <Button asChild variant="primary">
          <Link to="/">Return to Admin Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
