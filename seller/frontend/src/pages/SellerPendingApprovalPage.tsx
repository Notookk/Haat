import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, CheckCircle2, FileEdit, Store } from 'lucide-react';
import { SOCKET_EVENTS } from '@haat/shared-contracts';
import { getAccessToken, createSocketClient } from '@haat/shared-frontend';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { SellerApplicationForm } from '../features/onboarding/SellerApplicationForm';

export function SellerPendingApprovalPage() {
  const { seller, logout, reloadProfile } = useSellerAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // 1. If seller status becomes ACTIVE, transition immediately to dashboard
  useEffect(() => {
    if (seller?.status === 'ACTIVE') {
      navigate('/', { replace: true });
    }
  }, [seller?.status, navigate]);

  // 2. Real-time Socket.IO listener + Background heartbeat poll
  // NOTE: Disabled while editing so background reloads do not overwrite user keystrokes
  useEffect(() => {
    if (isEditing) return;

    const token = getAccessToken();
    const socket = createSocketClient({
      token,
      onReconnect: () => {
        void reloadProfile();
      },
    });

    const onApproved = () => {
      void reloadProfile().then(() => {
        navigate('/', { replace: true });
      });
    };

    socket.on(SOCKET_EVENTS.SELLER_APPROVED, onApproved);
    socket.on(SOCKET_EVENTS.SELLER_STATUS_CHANGED, (data: { newStatus: string }) => {
      if (data.newStatus === 'ACTIVE') {
        onApproved();
      }
    });

    // Fail-safe background polling every 3 seconds to guarantee zero-refresh update
    const pollTimer = setInterval(() => {
      void reloadProfile();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      socket.disconnect();
    };
  }, [navigate, reloadProfile, isEditing]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/haat-mark-128.png"
            alt="HAAT Logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain drop-shadow-xs"
          />
          <div className="flex flex-col text-left">
            <span className="text-xl font-black tracking-tight text-[#16135c] leading-none">HAAT</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c6c75] mt-[2px] leading-tight">
              Seller Portal
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-sunken hover:text-ink-900 transition-colors shadow-2xs cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-ink-500" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content Area */}
      {isEditing ? (
        <main className="mx-auto w-full max-w-7xl my-auto py-6">
          <SellerApplicationForm
            isEditing={true}
            onCancel={() => setIsEditing(false)}
            onSubmitSuccess={() => {
              setIsEditing(false);
              void reloadProfile();
            }}
          />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-md my-auto py-6">
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-card text-center">
            {/* Ambient Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span>Application Under Review</span>
            </div>

            {/* Icon */}
            <div className="mx-auto mt-4 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 shadow-xs">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>

            {/* Heading */}
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Please Wait for Admin Approval
            </h1>

            {/* Store Name Badge */}
            {seller?.storeName && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-sunken px-3 py-1 text-xs font-semibold text-ink-800">
                <Store className="h-3.5 w-3.5 text-brand-600" />
                <span>{seller.storeName}</span>
              </div>
            )}

            <p className="mt-3 text-caption text-ink-500 leading-relaxed max-w-sm mx-auto">
              Your store details and business identifiers have been submitted and are currently in review by the
              platform administrator.
            </p>

            {/* 3-Step Verification Timeline */}
            <div className="mt-6 rounded-xl border border-line bg-surface-sunken/60 p-4 text-left space-y-3.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink-900">Registration &amp; Profile Submitted</p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  </div>
                  <p className="mt-0.5 text-micro text-ink-500">Store credentials, GSTIN, PAN, and payout recorded.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-50 text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-900">Administrative Verification</p>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                      In Review
                    </span>
                  </div>
                  <p className="mt-0.5 text-micro text-amber-700">Reviewing business details and delivery coverage.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 opacity-60">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken border border-line text-ink-400 text-[10px] font-bold">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink-700">Marketplace Activation</p>
                    <span className="text-[10px] font-semibold text-ink-400 bg-surface-sunken border border-line px-2 py-0.5 rounded-full">
                      Upcoming
                    </span>
                  </div>
                  <p className="mt-0.5 text-micro text-ink-400">Storefront goes live and product publishing is unlocked.</p>
                </div>
              </div>
            </div>

            {/* Live Sync Status Strip */}
            <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-line/60 bg-surface px-3 py-2 text-micro text-ink-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live sync active &bull; Automatically redirects upon approval</span>
            </div>

            {/* Primary Action Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16135c] hover:bg-[#12104b] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition-all hover:shadow-sm cursor-pointer"
              >
                <FileEdit className="h-4 w-4" />
                <span>Edit Application Response</span>
              </button>
            </div>

            {/* Sign Out Link */}
            <div className="mt-5 pt-4 border-t border-line/60 flex items-center justify-center">
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-ink-400" />
                <span>Sign out of merchant account</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Page Footer */}
      <footer className="mx-auto w-full max-w-5xl py-2 text-center text-xs text-ink-400">
        HAAT Marketplace Seller Operations Engine &bull; All platform operations logged immutably
      </footer>
    </div>
  );
}
