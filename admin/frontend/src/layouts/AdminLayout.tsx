import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Store,
  FolderTree,
  ShoppingBag,
  CreditCard,
  PackageSearch,
  FileText,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAdminAuth } from '../features/auth/AdminAuthProvider';
import { showToast } from '@haat/shared-frontend';

const navItems: Array<{
  to: string;
  label: string;
  icon: any;
  end: boolean;
  badge?: string;
}> = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/transactions', label: 'Transactions', icon: CreditCard, end: false, badge: 'WIP' },
  { to: '/catalog', label: 'Catalog', icon: PackageSearch, end: false },
  { to: '/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/sellers', label: 'Sellers', icon: Store, end: false },
  { to: '/buyers', label: 'Buyers', icon: Users, end: false },
  { to: '/audit-logs', label: 'Audit Logs', icon: FileText, end: false },
];

export function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await logout();
    showToast.info('Signed out', 'Admin session terminated.');
  };

  const currentRouteName =
    navItems.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
      ?.label || 'Monitoring';

  return (
    <div className="min-h-screen bg-canvas-admin">
      {/* 1. Fixed Left Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface-sunken px-4 py-5 md:flex">
        {/* Brand Header */}
        <div className="pb-4 border-b border-line">
          <Link to="/" className="flex items-center gap-3" aria-label="HAAT Admin Console">
            <img
              src="/brand/haat-mark-128.png"
              alt="HAAT Logo"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain drop-shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-title font-black tracking-tight text-[#16135c] leading-none font-sans">HAAT</span>
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#5c6c75] mt-[2px] leading-tight">
                Marketplace Monitoring
              </span>
            </div>
          </Link>
        </div>

        {/* Primary Read-Only Monitoring Navigation */}
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto admin-scrollbar" aria-label="Admin navigation">
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
              {item.badge && (
                <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer info */}
        <div className="mt-auto pt-3 border-t border-line text-micro text-ink-400 flex items-center justify-between">
          <span>HAAT Monitor v1.0</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Read-Only
          </span>
        </div>
      </aside>

      {/* 2. Fixed Top Navbar */}
      <header className="fixed top-0 left-0 right-0 md:left-64 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-6 backdrop-blur shadow-xs">
        {/* Breadcrumb / Current View */}
        <div className="flex items-center gap-2">
          <span className="text-caption font-semibold text-ink-500">Marketplace Monitoring</span>
          <span className="text-ink-300">/</span>
          <span className="text-caption font-bold text-ink-900">{currentRouteName}</span>
        </div>

        {/* Right Section: Sign Out / Profile */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-1.5 shadow-2xs hover:bg-surface-sunken transition-all cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-xs">
                HA
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-ink-900 leading-tight">
                  {user?.fullName || 'Platform Monitor'}
                </span>
                <span className="text-[10px] text-ink-400 leading-tight">Read-Only Console</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-surface p-1 shadow-elevated z-50">
                <div className="px-3 py-2 border-b border-line text-xs">
                  <p className="font-bold text-ink-900">{user?.fullName || 'Admin Monitor'}</p>
                  <p className="text-micro text-ink-400 truncate">{user?.email || 'admin@haat.com'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="md:pl-64 pt-16 pb-12 min-h-screen">
        <div className="w-full px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* 4. Fixed Bottom Footer */}
      <footer className="fixed bottom-0 left-0 right-0 md:left-64 z-20 flex h-9 items-center justify-between border-t border-line bg-surface/95 px-6 text-micro text-ink-400 backdrop-blur shadow-xs">
        <span>&copy; 2026 HAAT India&apos;s Marketplace &bull; Platform operations logged immutably</span>
        <span className="flex items-center gap-1.5 font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Status: Normal
        </span>
      </footer>
    </div>
  );
}
