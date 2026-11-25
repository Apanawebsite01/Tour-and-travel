import React, { useState } from 'react';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Car,
  ClipboardList,
  CreditCard,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquareQuote,
  Tag,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { to: '/admin/packages', label: 'Tour Packages', icon: Map },
  { to: '/admin/drivers', label: 'Drivers', icon: UserCheck },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/pricing', label: 'Pricing Rules', icon: Tag },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { to: '/admin/website', label: 'Website Content', icon: Globe },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { token, admin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-[#CCFBF1] text-[#0F766E] font-semibold'
        : 'text-[#475569] hover:bg-slate-100 hover:text-[#0F172A]'
    }`;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-[#E2E8F0]">
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E8F0]">
          <Link to="/admin" className="font-display text-lg font-bold text-[#0F766E] tracking-tight">
            TravelGo Ops
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E8F0] space-y-2">
          <div className="text-xs text-[#64748B] truncate">{admin?.email}</div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#334155] hover:bg-slate-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 max-w-full bg-white h-full flex flex-col border-r border-[#E2E8F0]">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E8F0]">
              <span className="font-display text-lg font-bold text-[#0F766E]">TravelGo Ops</span>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={linkClass}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#334155]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#0F172A]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-[#64748B] hidden sm:inline">Admin</span>
              <span className="text-[#CBD5E1] hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-[#0F172A] truncate">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="px-3.5 py-2 rounded-full border border-[#E2E8F0] text-xs font-medium text-[#334155] hover:bg-slate-50 whitespace-nowrap"
            >
              View Public Site
            </Link>
            <Link
              to="/admin/bookings"
              className="hidden sm:inline-flex px-4 py-2 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold whitespace-nowrap"
            >
              All Bookings
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
