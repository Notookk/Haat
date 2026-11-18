import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-container px-4 py-16 md:px-6">
      <p className="font-mono text-micro uppercase tracking-[0.1em] text-ink-400">404</p>
      <h1 className="mt-2 text-display-md text-ink-900">This page doesn’t exist.</h1>
      <p className="mt-2 max-w-prose text-body text-ink-600">
        The link may be old, or the listing behind it may have been archived. Nothing else has moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4 text-caption">
        <Link to="/" className="font-semibold text-brand-700 underline underline-offset-2">
          Go to home
        </Link>
        <Link to="/catalogue" className="text-ink-600 underline underline-offset-2">
          Browse the catalogue
        </Link>
      </div>
    </div>
  );
}
