import { Outlet, useLocation, Link } from 'react-router-dom';
import { BuyerFooter, BuyerHeader } from './BuyerHeader';

export function BuyerLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f8f9fa]">
        {/* Minimal Auth Header with NO shopping menus, NO search, NO category dropdowns */}
        <header className="border-b border-[#dfe2e1] bg-white py-4 shadow-2xs">
          <div className="mx-auto flex max-w-container items-center justify-between px-4 md:px-8">
            <Link to="/" className="inline-flex items-center gap-3.5" aria-label="HAAT Home">
              <img
                src="/brand/haat-mark-128.png"
                alt="HAAT Logo"
                width={44}
                height={44}
                className="h-10 w-10 md:h-11 md:w-11 shrink-0 object-contain drop-shadow-xs"
              />
              <div className="flex flex-col text-left">
                <span className="text-xl md:text-2xl font-black tracking-tight text-[#16135c] leading-none font-sans">
                  HAAT
                </span>
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c6c75] mt-[2px] leading-tight">
                  India's Marketplace
                </span>
              </div>
            </Link>

            <Link
              to="/"
              className="text-sm font-semibold text-[#16135c] hover:text-[#12104b] hover:underline transition-colors flex items-center gap-1.5"
            >
              <span>← Back to shopping</span>
            </Link>
          </div>
        </header>

        {/* Clean Centered Auth Form Body */}
        <main className="flex-1 flex items-center justify-center">
          <Outlet />
        </main>

        {/* Minimal Auth Footer */}
        <footer className="border-t border-[#dfe2e1] bg-white py-6 text-center text-xs text-[#889397]">
          <div className="mx-auto max-w-container px-4">
            <p>© {new Date().getFullYear()} HAAT India Marketplace. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BuyerHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <BuyerFooter />
    </div>
  );
}
