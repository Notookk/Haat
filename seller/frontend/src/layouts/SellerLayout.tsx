import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Clock,
  Store,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { Badge, showToast } from '@haat/shared-frontend';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/store', label: 'My Store', icon: Store, end: false },
  { to: '/products', label: 'Products', icon: Package, end: false },
  { to: '/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/rfq', label: 'RFQ & Quotes', icon: FileText, end: false },
  { to: '/delivery-slots', label: 'Delivery Slots', icon: Clock, end: false },
  { to: '/chat', label: 'Chat', icon: MessageSquare, end: false },
  { to: '/revenue', label: 'Revenue', icon: TrendingUp, end: false },
  { to: '/settings', label: 'Account Settings', icon: Settings, end: false },
];

export function SellerLayout() {
  const { user, seller, logout } = useSellerAuth();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    await logout();
    showToast.info('Signed out', 'Seller session ended.');
  };

  const currentRouteName =
    navItems.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
      ?.label || 'Seller Console';

  return (
    <div className="min-h-screen bg-canvas-admin">
      {/* 1. Static Sidebar Rail (Desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface-elevated px-4 py-5 md:flex shadow-xs">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pb-4 border-b border-line">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/brand/haat-mark-128.png"
              alt="HAAT"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg shadow-2xs group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-title text-[#16135c] tracking-tight leading-none">HAAT</span>
              <span className="text-micro font-bold uppercase tracking-wider text-brand-600 mt-0.5">Seller Console</span>
            </div>
          </Link>
        </div>

        {/* Primary Navigation Rail */}
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto admin-scrollbar" aria-label="Seller navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-label font-medium transition-colors duration-120',
                  isActive
                    ? 'bg-surface text-brand-700 shadow-card font-semibold'
                    : 'text-ink-600 hover:bg-surface hover:text-ink-900',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0 text-brand-600" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-3 border-t border-line text-micro text-ink-400 flex items-center justify-between">
          <span>HAAT Seller v1.0</span>
          <span className="font-mono text-emerald-600 font-bold">Online</span>
        </div>
      </aside>

      {/* 2. Fixed Top Navbar */}
      <header className="fixed top-0 left-0 right-0 md:left-64 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-6 backdrop-blur shadow-xs">
        {/* Left: Mobile Brand & Page Title */}
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center gap-2 mr-2">
            <img src="/brand/haat-mark-128.png" alt="HAAT" width={28} height={28} className="h-7 w-7 shrink-0" />
            <span className="font-bold text-ink-900">HAAT</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-label font-semibold text-ink-800">
            <span>Seller Hub</span>
            <span className="text-ink-300">/</span>
            <span className="text-brand-700 font-bold">{currentRouteName}</span>
          </div>
        </div>

        {/* Right: Customer Chat & Seller Profile Dropdown */}
        <div className="flex items-center gap-3">
          {/* Chat Icon Button */}
          <Link
            to="/chat"
            className={clsx(
              'relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface transition-colors cursor-pointer shadow-xs',
              location.pathname === '/chat'
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'text-ink-600 hover:text-brand-700 hover:bg-surface-sunken',
            )}
            title="Chat"
            aria-label="Chat"
          >
            <MessageSquare className="h-4.5 w-4.5" />
          </Link>

          {/* Profile Menu Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface p-1.5 sm:px-3 sm:py-1.5 hover:bg-surface-sunken transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer shadow-xs"
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
              aria-label="Seller Profile Menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-caption font-bold text-white shadow-xs">
                {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'SE'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-label font-bold text-ink-900 leading-tight">
                  {seller?.storeName || user?.fullName || 'Seller Store'}
                </p>
                <p className="text-micro text-ink-500 leading-tight">{user?.email || user?.phoneNumber}</p>
              </div>
              <ChevronDown
                className={clsx('h-4 w-4 text-ink-400 transition-transform duration-150', {
                  'rotate-180': profileDropdownOpen,
                })}
              />
            </button>

            {profileDropdownOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-line bg-surface p-2 shadow-modal animate-in fade-in-50 zoom-in-95 z-50"
              >
                <div className="p-3 bg-surface-sunken rounded-lg border border-line mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-600" />
                    <p className="text-label font-bold text-ink-900 truncate">
                      {seller?.storeName || 'Merchant Store'}
                    </p>
                  </div>
                  <p className="text-caption text-ink-500 truncate mt-0.5">{user?.fullName}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-micro text-ink-400">Account Role</span>
                    <Badge tone="brand">SELLER</Badge>
                  </div>
                </div>

                <div className="space-y-0.5 py-1">
                  <Link
                    to="/store"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-label text-ink-700 hover:bg-surface-sunken hover:text-ink-900 transition-colors"
                  >
                    <Store className="h-4 w-4 text-ink-400" />
                    <span>My Store</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-label text-ink-700 hover:bg-surface-sunken hover:text-ink-900 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-ink-400" />
                    <span>Account Settings</span>
                  </Link>
                </div>

                <div className="my-1 border-t border-line" />

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-label font-semibold text-danger-fg hover:bg-danger-bg transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-danger-fg" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* 3. Independent Content Body Scrollbar */}
      <main className="fixed top-16 bottom-10 left-0 right-0 md:left-64 overflow-y-auto bg-canvas-admin px-6 py-5 admin-scrollbar">
        <div className="w-full">
          <Outlet />
        </div>
      </main>

      {/* 4. Fixed Bottom Telemetry Footer */}
      <footer className="fixed bottom-0 left-0 right-0 md:left-64 z-20 flex h-10 items-center justify-between border-t border-line bg-surface/95 px-6 text-micro text-ink-400 backdrop-blur shadow-2xs">
        <div className="flex items-center gap-4">
          <span>HAAT Seller Engine</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Storefront, Scheduled Delivery &amp; Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-700">Real-Time Sync Active</span>
        </div>
      </footer>
    </div>
  );
}
