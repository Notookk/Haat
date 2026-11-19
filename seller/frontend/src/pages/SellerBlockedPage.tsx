import { Ban, Mail, Phone, LogOut, ShieldAlert } from 'lucide-react';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { Button, Badge } from '@haat/shared-frontend';

export function SellerBlockedPage() {
  const { user, seller, logout } = useSellerAuth();

  return (
    <div className="min-h-screen bg-canvas-admin flex flex-col justify-between p-4 md:p-8">
      {/* Header bar */}
      <header className="mx-auto w-full max-w-4xl flex items-center justify-between py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <img src="/brand/haat-mark-128.png" alt="HAAT Logo" width={36} height={36} className="h-9 w-9 shrink-0" />
          <div>
            <h1 className="text-h3 font-black text-[#16135c] leading-none">HAAT</h1>
            <p className="text-micro font-semibold text-danger-fg uppercase tracking-wider">Account Action Notice</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-danger-fg hover:bg-danger-bg">
          <LogOut className="h-4 w-4 mr-2" />
          <span>Sign Out</span>
        </Button>
      </header>

      {/* Main card */}
      <main className="mx-auto w-full max-w-2xl my-8 space-y-6">
        <div className="bg-surface rounded-2xl border border-red-200 shadow-card p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-200">
            <Ban className="h-8 w-8 text-red-600" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <Badge tone="danger">MERCHANT ACCOUNT BLOCKED</Badge>
            <h2 className="text-2xl font-black text-ink-900">Seller Operations Suspended</h2>
            <p className="text-body text-ink-600">
              Access to this merchant dashboard and associated seller business operations has been suspended by
              marketplace administration.
            </p>
          </div>

          {/* Admin Provided Reason */}
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-danger-fg font-bold text-label">
              <ShieldAlert className="h-5 w-5" />
              <span>Administrative Action Reason</span>
            </div>
            <p className="text-caption text-ink-800 bg-surface rounded-lg p-3.5 border border-red-200 font-medium">
              {seller?.blockedReason || seller?.statusReason || 'Policy violation or compliance review requirement.'}
            </p>
            <p className="text-micro text-ink-500">
              In accordance with marketplace rules, all product listings associated with{' '}
              <strong>{seller?.storeName || 'your store'}</strong> have been immediately unlisted from customer search,
              categories, and storefront discovery.
            </p>
          </div>

          {/* Contact Support */}
          <div className="border-t border-line pt-6 text-left space-y-3">
            <h3 className="text-label font-bold text-ink-900">Contact Marketplace Governance &amp; Appeals</h3>
            <p className="text-caption text-ink-600">
              If you believe this action was made in error or wish to appeal the suspension, please reach out to our
              Merchant Trust &amp; Safety team with your merchant credentials:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-caption">
              <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-sunken p-3">
                <Mail className="h-4 w-4 text-brand-600 shrink-0" />
                <div>
                  <p className="text-micro text-ink-400 font-medium">Email Support</p>
                  <p className="font-semibold text-ink-900">appeals@haat.com</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-sunken p-3">
                <Phone className="h-4 w-4 text-brand-600 shrink-0" />
                <div>
                  <p className="text-micro text-ink-400 font-medium">Merchant Hotline</p>
                  <p className="font-semibold text-ink-900">1800-4228-HELP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-4xl text-center py-4 text-micro text-ink-400 border-t border-line">
        &copy; {new Date().getFullYear()} HAAT Marketplace Inc. &bull; Store ID: {seller?.id || '—'} &bull; Merchant:{' '}
        {user?.fullName}
      </footer>
    </div>
  );
}
