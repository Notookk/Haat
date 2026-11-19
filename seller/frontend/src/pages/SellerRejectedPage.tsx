import { useNavigate } from 'react-router-dom';
import { XCircle, HelpCircle, LogOut, ArrowRight, RotateCcw } from 'lucide-react';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { Button, Badge } from '@haat/shared-frontend';

export function SellerRejectedPage() {
  const { user, seller, logout } = useSellerAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas-admin flex flex-col justify-between p-4 md:p-8">
      {/* Header bar */}
      <header className="mx-auto w-full max-w-4xl flex items-center justify-between py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <img src="/brand/haat-mark-128.png" alt="HAAT Logo" width={36} height={36} className="h-9 w-9 shrink-0" />
          <div>
            <h1 className="text-h3 font-black text-[#16135c] leading-none">HAAT</h1>
            <p className="text-micro font-semibold text-danger-fg uppercase tracking-wider">Application Notice</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-danger-fg hover:bg-danger-bg">
          <LogOut className="h-4 w-4 mr-2" />
          <span>Sign Out</span>
        </Button>
      </header>

      {/* Main card */}
      <main className="mx-auto w-full max-w-2xl my-8 space-y-6">
        <div className="bg-surface rounded-2xl border border-line shadow-card p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
            <XCircle className="h-8 w-8 text-slate-600" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <Badge tone="neutral">APPLICATION NOT APPROVED</Badge>
            <h2 className="text-2xl font-black text-ink-900">Seller Application Declined</h2>
            <p className="text-body text-ink-600">
              Following review of your submitted store details and tax credentials, your seller onboarding request could
              not be approved at this time.
            </p>
          </div>

          {/* Rejection Reason */}
          <div className="bg-surface-sunken border border-line rounded-xl p-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-ink-900 font-bold text-label">
              <HelpCircle className="h-5 w-5 text-ink-500" />
              <span>Review Feedback &amp; Reason</span>
            </div>
            <p className="text-caption text-ink-800 bg-surface rounded-lg p-3.5 border border-line font-medium">
              {seller?.statusReason || 'Incomplete business registration or mismatched tax identification documents.'}
            </p>
          </div>

          <div className="border-t border-line pt-6 text-left space-y-3 text-caption text-ink-600">
            <h3 className="text-label font-bold text-ink-900">Next Steps</h3>
            <p>
              Please verify your business GSTIN and PAN match the legal name on your business documentation. For further
              inquiries or document verification assistance, email <strong>compliance@haat.com</strong> quoting Store
              ID: <span className="font-mono">{seller?.id || '—'}</span>.
            </p>
          </div>

          {/* Action to Edit Application Response */}
          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/onboard')}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span>Edit Application &amp; Resubmit</span>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-4xl text-center py-4 text-micro text-ink-400 border-t border-line">
        &copy; {new Date().getFullYear()} HAAT Marketplace Inc. &bull; Registered Merchant: {user?.fullName}
      </footer>
    </div>
  );
}
