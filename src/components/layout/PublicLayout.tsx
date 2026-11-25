import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, MessageCircle, X, Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useClientAuth } from '../../context/ClientAuthContext';
import { buildWhatsAppLink, isSafeUrl } from '../../utils/format';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSite();
  const { clientUser } = useClientAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const accountLabel = clientUser
    ? (clientUser.displayName?.trim().split(/\s+/)[0] || 'Account').slice(0, 14)
    : 'Sign In';

  const brandName = settings?.business_name || 'TravelGo';
  const waHref = buildWhatsAppLink(
    settings?.whatsapp_number,
    `Hi ${brandName}, I would like to enquire about a vehicle rental or tour package.`
  );

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative whitespace-nowrap shrink-0 text-sm font-medium transition-colors duration-200 py-1.5 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:transition-transform after:duration-200 ${
      isActive
        ? 'text-[#0F766E] after:bg-[#0F766E] after:scale-x-100'
        : 'text-[#475569] hover:text-[#0F172A] after:bg-[#0F766E]/50 after:scale-x-0 hover:after:scale-x-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ease-snappy border-b ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-[0_1px_12px_-2px_rgba(15,23,42,0.06)]'
            : 'bg-white/95 backdrop-blur-md border-slate-200/70'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean brand wordmark */}
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-[#0F172A] hover:text-[#0F766E] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] rounded"
          >
            {brandName}
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            <NavLink to="/vehicles" className={navLinkClass}>
              Vehicles
            </NavLink>
            <NavLink to="/packages" className={navLinkClass}>
              Packages
            </NavLink>
            <NavLink to="/reviews" className={navLinkClass}>
              Reviews
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
            <NavLink to="/account" className={navLinkClass}>
              {accountLabel}
            </NavLink>
          </nav>

          {/* Zone 3: 1 primary conversion action */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/booking"
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] text-white text-sm font-semibold px-5 py-2.5 shadow-[0_2px_10px_-2px_rgba(249,115,22,0.45)] transition-all duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2"
            >
              Book Now
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-[#0F172A] hover:bg-slate-50 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-1 shadow-lg">
            {[
              { to: '/', label: 'Home' },
              { to: '/vehicles', label: 'Vehicles' },
              { to: '/packages', label: 'Tour Packages' },
              { to: '/about', label: 'About Us' },
              { to: '/gallery', label: 'Gallery' },
              { to: '/reviews', label: 'Reviews' },
              { to: '/faqs', label: 'FAQs' },
              { to: '/contact', label: 'Contact' },
              { to: '/account', label: clientUser ? `Account (${accountLabel})` : 'Sign In / Sign Up' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-slate-100/80 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-100">
              <Link
                to="/booking"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 transition-colors"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet Architectural Footer */}
      <footer className="bg-[#0B1120] text-slate-300 border-t border-slate-800/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
            <div className="lg:col-span-4 pr-4">
              <div className="font-display text-xl font-bold text-white tracking-tight mb-3">{brandName}</div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4 max-w-sm">
                {settings?.tagline || 'Across India, Without Compromise'}. Curated holiday circuits and sanitized SUV rentals across 28 Indian states.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{settings?.operating_area}</p>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Explore</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/vehicles" className="hover:text-white transition-colors">SUV &amp; Car Fleet</Link></li>
                <li><Link to="/packages" className="hover:text-white transition-colors">Tour Packages</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/gallery" className="hover:text-white transition-colors">Travel Gallery</Link></li>
                <li><Link to="/reviews" className="hover:text-white transition-colors">Guest Reviews</Link></li>
                <li><Link to="/faqs" className="hover:text-white transition-colors">FAQs</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Operations &amp; Legal</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link to="/cancellation-policy" className="hover:text-white transition-colors">Cancellation &amp; Refunds</Link></li>
                <li><Link to="/booking" className="hover:text-white transition-colors">Request a Booking</Link></li>
                <li><Link to="/account" className="hover:text-white transition-colors">Traveller Sign In</Link></li>
                <li>
                  <Link to="/admin" className="inline-flex items-center gap-1 text-[#5eead4] hover:text-white transition-colors">
                    <span>Admin Portal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Concierge Desk</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <span className="tabular-nums text-slate-300">{settings?.phone || '+91 98114 20750'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <span className="text-slate-300">{settings?.email || 'concierge@travelgo.in'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <span>{settings?.address}</span>
                </li>
              </ul>
              <div className="flex items-center gap-5 mt-5 text-xs font-medium text-slate-400">
                {isSafeUrl(settings?.social_links?.instagram) && (
                  <a href={settings?.social_links?.instagram} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    Instagram
                  </a>
                )}
                {isSafeUrl(settings?.social_links?.youtube) && (
                  <a href={settings?.social_links?.youtube} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    YouTube
                  </a>
                )}
                {isSafeUrl(settings?.social_links?.facebook) && (
                  <a href={settings?.social_links?.facebook} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    Facebook
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 mt-12 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} {brandName} Mobility &amp; Holidays Pvt. Ltd. All rights reserved.</p>
            <p>All-India Tourist Permit Fleet · Transparent INR Billing</p>
          </div>
        </div>
      </footer>

      {/* Persistent Floating WhatsApp Concierge */}
      <a
        href={waHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with TravelGo expert on WhatsApp"
        className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.97] text-white font-semibold text-sm px-4 py-3 shadow-[0_14px_28px_-6px_rgba(15,23,42,0.28)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">Chat with Expert</span>
      </a>
    </div>
  );
}
