import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  MapPin,
  Heart,
  User as UserIcon,
  ShoppingBag,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  LogOut,
  X,
  Check,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useCategoryTree } from '../features/catalog/api';
import { useWishlistCount, useCartCount } from '../features/chat/chatStore';

const POPULAR_LOCATIONS = [
  'All India',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Kolkata',
  'Chennai',
  'Hyderabad',
  'Ahmedabad',
  'Pune',
  'Jaipur',
];

export function BuyerHeader() {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');
  const { status, user, logout } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const navigate = useNavigate();
  const categories = useCategoryTree();
  const wishlistCount = useWishlistCount();
  const cartCount = useCartCount();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Location');
  const [selectedLang, setSelectedLang] = useState<'English' | 'Deutsch'>('English');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const departmentsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setLocationOpen(false);
      }
      if (departmentsRef.current && !departmentsRef.current.contains(event.target as Node)) {
        setDepartmentsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue');
  };

  const roots = categories.data ?? [];

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* 1. Top Utility Announcement Bar matching screenshot */}
      <div className="border-b border-[#dfe2e1] bg-[#f8f9fa] py-1 text-xs text-[#5c6c75]">
        <div className="mx-auto flex h-7 max-w-container items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <span className="font-normal text-[#5c6c75]">Super Value Deals - Save more with coupons</span>
          </div>
          <div className="relative flex items-center" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                langDropdownOpen
                  ? 'bg-blue-50 text-[#16135c] font-semibold ring-2 ring-[#16135c] ring-offset-1'
                  : 'text-[#5c6c75] hover:text-[#16135c]'
              }`}
            >
              <span className="flex items-center">
                {selectedLang === 'English' ? (
                  <svg
                    width="16"
                    height="13"
                    viewBox="0 0 16 13"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0 rounded-[2px] overflow-hidden"
                  >
                    <path d="M0 0.5H16V12.5H0V0.5Z" fill="#012169" />
                    <path
                      d="M1.875 0.5L7.975 5.025L14.05 0.5H16V2.05L10 6.525L16 10.975V12.5H14L8 8.025L2.025 12.5H0V11L5.975 6.55L0 2.1V0.5H1.875Z"
                      fill="white"
                    />
                    <path
                      d="M10.6 7.525L16 11.5V12.5L9.225 7.525H10.6ZM6 8.025L6.15 8.9L1.35 12.5H0L6 8.025ZM16 0.5V0.575L9.775 5.275L9.825 4.175L14.75 0.5H16ZM0 0.5L5.975 4.9H4.475L0 1.55V0.5Z"
                      fill="#C8102E"
                    />
                    <path d="M6.025 0.5V12.5H10.025V0.5H6.025ZM0 4.5V8.5H16V4.5H0Z" fill="white" />
                    <path d="M0 5.325V7.725H16V5.325H0ZM6.825 0.5V12.5H9.225V0.5H6.825Z" fill="#C8102E" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="13"
                    viewBox="0 0 16 13"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0 rounded-[2px] overflow-hidden"
                  >
                    <path d="M0 8.5H16V12.5H0V8.5Z" fill="#FFCE00" />
                    <path d="M0 0.5H16V4.5H0V0.5Z" fill="black" />
                    <path d="M0 4.5H16V8.5H0V4.5Z" fill="#DD0000" />
                  </svg>
                )}
              </span>
              <span>{selectedLang}</span>
              {langDropdownOpen ? (
                <ChevronUp size={12} className="text-[#16135c]" />
              ) : (
                <ChevronDown size={12} className="text-[#889397] transition-transform duration-150" />
              )}
            </button>

            {langDropdownOpen ? (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#889397]">
                  LANGUAGE
                </div>
                <div className="mt-0.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLang('English');
                      setLangDropdownOpen(false);
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm transition-colors cursor-pointer ${
                      selectedLang === 'English'
                        ? 'bg-[#f0f4ff] font-semibold text-[#16135c]'
                        : 'font-medium text-[#21313c] hover:bg-[#f0f4ff] hover:text-[#16135c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        width="16"
                        height="13"
                        viewBox="0 0 16 13"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="shrink-0 rounded-[2px] overflow-hidden"
                      >
                        <path d="M0 0.5H16V12.5H0V0.5Z" fill="#012169" />
                        <path
                          d="M1.875 0.5L7.975 5.025L14.05 0.5H16V2.05L10 6.525L16 10.975V12.5H14L8 8.025L2.025 12.5H0V11L5.975 6.55L0 2.1V0.5H1.875Z"
                          fill="white"
                        />
                        <path
                          d="M10.6 7.525L16 11.5V12.5L9.225 7.525H10.6ZM6 8.025L6.15 8.9L1.35 12.5H0L6 8.025ZM16 0.5V0.575L9.775 5.275L9.825 4.175L14.75 0.5H16ZM0 0.5L5.975 4.9H4.475L0 1.55V0.5Z"
                          fill="#C8102E"
                        />
                        <path d="M6.025 0.5V12.5H10.025V0.5H6.025ZM0 4.5V8.5H16V4.5H0Z" fill="white" />
                        <path d="M0 5.325V7.725H16V5.325H0ZM6.825 0.5V12.5H9.225V0.5H6.825Z" fill="#C8102E" />
                      </svg>
                      <span>English</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 transition-colors ${
                        selectedLang === 'English' ? 'text-[#16135c]/70' : 'text-gray-300 group-hover:text-[#16135c]'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLang('Deutsch');
                      setLangDropdownOpen(false);
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm transition-colors cursor-pointer ${
                      selectedLang === 'Deutsch'
                        ? 'bg-[#f0f4ff] font-semibold text-[#16135c]'
                        : 'font-medium text-[#21313c] hover:bg-[#f0f4ff] hover:text-[#16135c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        width="16"
                        height="13"
                        viewBox="0 0 16 13"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="shrink-0 rounded-[2px] overflow-hidden"
                      >
                        <path d="M0 8.5H16V12.5H0V8.5Z" fill="#FFCE00" />
                        <path d="M0 0.5H16V4.5H0V0.5Z" fill="black" />
                        <path d="M0 4.5H16V8.5H0V4.5Z" fill="#DD0000" />
                      </svg>
                      <span>Deutsch</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 transition-colors ${
                        selectedLang === 'Deutsch' ? 'text-[#16135c]/70' : 'text-gray-300 group-hover:text-[#16135c]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Main Middle Header: Brand Logo, Search, Location & Actions */}
      <div className="bg-white py-3.5">
        <div className="mx-auto flex max-w-container items-center justify-between gap-6 px-4 md:px-8">
          {/* HAAT Official Brand Logo: <logo> <name> <tagline below name> */}
          <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="HAAT Home">
            <img
              src="/brand/haat-mark-128.png"
              alt="HAAT Logo"
              width={40}
              height={40}
              className="h-9 w-9 md:h-10 md:w-10 shrink-0 object-contain drop-shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black tracking-tight text-[#16135c] leading-none font-sans">
                HAAT
              </span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c6c75] mt-[2px] leading-tight">
                India's Marketplace
              </span>
            </div>
          </Link>

          {/* Center Search Bar with Location Selector */}
          <div className="hidden flex-1 max-w-[620px] items-center gap-2.5 md:flex">
            <form onSubmit={handleSearch} className="relative flex-1" role="search">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products"
                className="h-11 w-full rounded-lg border border-[#dfe2e1] bg-white pl-4 pr-10 text-sm text-[#21313c] placeholder:text-[#889397] transition-colors focus:border-[#16135c] focus:outline-none focus:ring-1 focus:ring-[#16135c]"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#889397] hover:text-[#16135c] transition-colors cursor-pointer"
                aria-label="Search products"
              >
                <Search size={18} />
              </button>
            </form>

            {/* Location Button with Custom Dropdown Styling */}
            <div className="relative" ref={locationRef}>
              <button
                type="button"
                onClick={() => setLocationOpen(!locationOpen)}
                className={`h-11 shrink-0 inline-flex items-center gap-1.5 rounded-xl border bg-white px-3.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                  locationOpen
                    ? 'border-[#16135c] text-[#16135c] ring-2 ring-[#16135c] ring-offset-2'
                    : 'border-[#dfe2e1] text-[#5c6c75] hover:border-[#16135c] hover:bg-[#f8f9fa]'
                }`}
                aria-haspopup="listbox"
                aria-expanded={locationOpen}
              >
                <MapPin size={15} className={locationOpen ? 'text-[#16135c]' : 'text-[#889397]'} />
                <span>{selectedLocation}</span>
                {locationOpen ? (
                  <ChevronUp size={13} className="text-[#16135c]" />
                ) : (
                  <ChevronDown size={13} className="text-[#889397]" />
                )}
              </button>

              {locationOpen ? (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#889397]">
                    <span>SELECT LOCATION</span>
                    <button
                      type="button"
                      onClick={() => setLocationOpen(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="mt-1 max-h-64 overflow-y-auto space-y-0.5 admin-scrollbar">
                    {POPULAR_LOCATIONS.map((loc) => {
                      const isSelected = selectedLocation === loc;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setSelectedLocation(loc);
                            setLocationOpen(false);
                          }}
                          className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'bg-[#f0f4ff] font-semibold text-[#16135c]'
                              : 'font-medium text-[#21313c] hover:bg-[#f0f4ff] hover:text-[#16135c]'
                          }`}
                        >
                          <span>{loc}</span>
                          <ChevronRight
                            size={14}
                            className={`shrink-0 transition-colors ${
                              isSelected
                                ? 'text-[#16135c]/70'
                                : 'text-gray-300 group-hover:text-[#16135c]'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Action Icons (Wishlist, Account, Chat, Cart) */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Wishlist Icon with dynamic count badge */}
            <Link
              to="/wishlist"
              className="relative grid h-10 w-10 place-items-center rounded-full text-[#21313c] hover:bg-[#f8f9fa] hover:text-[#16135c] transition-colors"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart
                size={21}
                strokeWidth={1.8}
                className={wishlistCount > 0 ? 'text-red-600 fill-red-600/20' : ''}
              />
              {wishlistCount > 0 ? (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>

            {/* Account / User Menu */}
            <div className="relative" ref={userMenuRef}>
              {status === 'authenticated' && user ? (
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 rounded-full p-1 text-[#21313c] hover:bg-gray-100 transition-colors cursor-pointer"
                  title={user.fullName}
                  aria-label="User account"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 font-bold text-[#16135c] text-xs">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#21313c] hover:bg-[#f8f9fa] hover:text-[#16135c] transition-colors cursor-pointer"
                  title="Account"
                  aria-label="Account"
                >
                  <UserIcon size={21} strokeWidth={1.8} />
                </button>
              )}

              {userMenuOpen ? (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#889397]">
                    MY ACCOUNT
                  </div>
                  {status === 'authenticated' && user ? (
                    <div className="mt-0.5 space-y-0.5">
                      <div className="rounded-xl bg-[#f8f9fa] border border-gray-100 px-3.5 py-2.5 mb-1.5">
                        <p className="text-xs font-bold text-[#16135c] truncate">{user.fullName}</p>
                        <p className="text-[11px] text-[#5c6c75] truncate">{user.phoneNumber || user.email}</p>
                      </div>
                      <Link
                        to="/catalogue"
                        onClick={() => setUserMenuOpen(false)}
                        className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-[#21313c] hover:bg-[#f0f4ff] hover:text-[#16135c] transition-colors"
                      >
                        <span>My Orders</span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#16135c] transition-colors" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          void logout();
                        }}
                        className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <LogOut size={14} />
                          <span>Sign out</span>
                        </div>
                        <ChevronRight size={14} className="text-red-300 group-hover:text-red-600 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1.5 px-1 py-1">
                      <div className="px-2.5 py-1 text-xs text-[#5c6c75]">Welcome to HAAT</div>
                      <Link
                        to="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="block rounded-xl bg-[#16135c] px-3.5 py-2 text-center text-xs font-semibold text-white shadow-xs hover:bg-[#12104b] transition-colors"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setUserMenuOpen(false)}
                        className="block rounded-xl border border-[#dfe2e1] px-3.5 py-2 text-center text-xs font-semibold text-[#21313c] hover:bg-gray-50 transition-colors"
                      >
                        Create an account
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Customer Chat with Seller Button (disabled if user is not logged in) */}
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) return;
                navigate('/chat');
              }}
              disabled={!isAuthenticated}
              className={`relative grid h-10 w-10 place-items-center rounded-full transition-colors ${
                isAuthenticated
                  ? 'text-[#21313c] hover:bg-[#f8f9fa] hover:text-[#16135c] cursor-pointer'
                  : 'text-gray-300 bg-gray-50 cursor-not-allowed opacity-40'
              }`}
              title={isAuthenticated ? 'All Chats & Seller Inquiries' : 'Sign in to chat with sellers'}
              aria-label="All Chats & Seller Inquiries"
            >
              <MessageSquare size={21} strokeWidth={1.8} />
            </button>

            {/* Shopping Cart Icon with dynamic count badge */}
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-full text-[#21313c] hover:bg-[#f8f9fa] hover:text-[#16135c] transition-colors"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={21} strokeWidth={1.8} />
              {cartCount > 0 ? (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16135c] px-1 text-[10px] font-bold text-white leading-none">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mt-3 px-4 md:hidden">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products"
              className="h-10 w-full rounded-lg border border-[#dfe2e1] bg-white pl-3 pr-10 text-sm text-[#21313c] placeholder:text-[#889397] focus:border-[#16135c] focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#889397] hover:text-[#16135c]"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Bottom Department Button & Navigation Menu Bar (hidden on chat page, just like signup/signin) */}
      {!isChatPage && (
        <div className="border-b border-[#dfe2e1] bg-white shadow-2xs">
          <div className="mx-auto flex h-14 max-w-container items-center gap-8 px-4 md:px-8">
            {/* HAAT Navy "All Categories" Button with Custom Dropdown */}
            <div className="relative" ref={departmentsRef}>
              <button
                type="button"
                onClick={() => setDepartmentsOpen(!departmentsOpen)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl bg-[#16135c] px-4 text-sm font-semibold text-white shadow-xs transition-all cursor-pointer ${
                  departmentsOpen ? 'ring-2 ring-[#16135c] ring-offset-2' : 'hover:bg-[#12104b]'
                }`}
                aria-haspopup="listbox"
                aria-expanded={departmentsOpen}
              >
                <LayoutGrid size={16} />
                <span>All Categories</span>
                {departmentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {/* All Categories Dropdown Menu */}
              {departmentsOpen ? (
                <div className="absolute left-0 top-full mt-2 w-60 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#889397]">
                    ALL CATEGORIES
                  </div>
                  <div className="mt-0.5 space-y-0.5 max-h-72 overflow-y-auto admin-scrollbar">
                    {roots.length > 0 ? (
                      roots.map((root) => {
                        const isSelected = window.location.search.includes(encodeURIComponent(root.slug));
                        return (
                          <Link
                            key={root.id}
                            to={`/catalogue?category=${encodeURIComponent(root.slug)}`}
                            onClick={() => setDepartmentsOpen(false)}
                            className={`group flex items-center justify-between rounded-xl px-3.5 py-2 text-sm transition-colors ${
                              isSelected
                                ? 'bg-[#f0f4ff] font-semibold text-[#16135c]'
                                : 'font-medium text-[#21313c] hover:bg-[#f0f4ff] hover:text-[#16135c]'
                            }`}
                          >
                            <span>{root.name}</span>
                            <ChevronRight
                              size={14}
                              className={`shrink-0 transition-colors ${
                                isSelected ? 'text-[#16135c]/70' : 'text-gray-300 group-hover:text-[#16135c]'
                              }`}
                            />
                          </Link>
                        );
                      })
                    ) : (
                      <div className="px-3.5 py-3 text-xs text-gray-500">
                        <Link
                          to="/catalogue"
                          onClick={() => setDepartmentsOpen(false)}
                          className="text-[#16135c] font-semibold hover:underline"
                        >
                          Browse full catalogue →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Navigation Menu Links: Home, Shop Catalogue */}
            <nav
              className="flex items-center gap-7 text-sm font-semibold text-[#21313c] overflow-x-auto"
              aria-label="Main navigation"
            >
              <NavLink
                to="/"
                className={({ isActive }) => (isActive ? 'text-[#16135c]' : 'hover:text-[#16135c] transition-colors')}
              >
                Home
              </NavLink>

              <NavLink
                to="/catalogue"
                className={({ isActive }) => (isActive ? 'text-[#16135c]' : 'hover:text-[#16135c] transition-colors')}
              >
                Shop Catalogue
              </NavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

export function BuyerFooter() {
  return (
    <footer className="border-t border-[#dfe2e1] bg-[#f8f9fa] mt-16">
      <div className="mx-auto max-w-container px-4 py-12 md:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-3.5" aria-label="HAAT Home">
              <img
                src="/brand/haat-mark-128.png"
                alt="HAAT Logo"
                width={48}
                height={48}
                className="h-11 w-11 md:h-12 md:w-12 shrink-0 object-contain drop-shadow-xs"
              />
              <div className="flex flex-col">
                <span className="text-2xl md:text-[26px] font-black tracking-tight text-[#16135c] leading-none font-sans">
                  HAAT
                </span>
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] text-[#5c6c75] mt-[2px] leading-tight">
                  India's Marketplace
                </span>
              </div>
            </Link>
            <p className="mt-3.5 text-xs text-[#5c6c75] leading-relaxed max-w-xs">
              India's Marketplace for fresh groceries, daily essentials, and wholesale supplies with verified local
              merchants.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#21313c]">Categories</h4>
            <ul className="mt-3 space-y-2 text-xs text-[#5c6c75]">
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Vegetables &amp; Fruits
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Breakfast &amp; Instant Food
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Bakery &amp; Biscuits
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#21313c]">Customer Service</h4>
            <ul className="mt-3 space-y-2 text-xs text-[#5c6c75]">
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Help Center &amp; FAQ
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Delivery Slots &amp; Timings
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#21313c]">Get to Know Us</h4>
            <ul className="mt-3 space-y-2 text-xs text-[#5c6c75]">
              <li>
                <Link to="/" className="hover:text-[#16135c]">
                  About HAAT
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-[#16135c]">
                  Super Value Deals
                </Link>
              </li>
              <li>
                <span className="text-gray-400">Convenient Delivery</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#dfe2e1] pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#5c6c75]">
          <p>© 2026 HAAT Marketplace. All rights reserved.</p>
          <p className="font-mono text-gray-400">HAAT · en-IN</p>
        </div>
      </div>
    </footer>
  );
}
