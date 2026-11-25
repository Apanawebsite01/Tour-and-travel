import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, MessageCircle, X, Phone, Mail, MapPin } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useClientAuth } from '../../context/ClientAuthContext';
import { buildWhatsAppLink, isSafeUrl } from '../../utils/format';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSite();
  const { clientUser } = useClientAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const accountLabel = clientUser
    ? (clientUser.displayName?.trim().split(/\s+/)[0] || 'Account').slice(0, 14)
    : 'Sign In';

  const brandName = settings?.business_name || 'TravelGo';
  const waHref = buildWhatsAppLink(
    settings?.whatsapp_number,
    `Hi ${brandName}, I would like to enquire about a vehicle rental or tour package.`
  );

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 border-b-2 ${
      isActive
        ? 'text-[#0F766E] border-[#0F766E]'
        : 'text-[#334155] border-transparent hover:text-[#0F766E] hover:border-[#0F766E]/40'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean brand wordmark */}
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-[#0F766E] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] rounded"
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
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold px-5 py-2.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2"
            >
              Book Now
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-2">
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
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <Link
                to="/booking"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center rounded-full bg-[#F97316] text-white text-sm font-semibold py-2.5"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet Footer */}
      <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="font-display text-xl font-bold text-white mb-3">{brandName}</div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {settings?.tagline || 'Across India, Without Compromise'}. Curated holiday circuits and sanitized SUV rentals across 28 Indian states.
              </p>
              <p className="text-xs text-slate-400">{settings?.operating_area}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Explore</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/vehicles" className="hover:text-white transition-colors">SUV &amp; Car Fleet</Link></li>
                <li><Link to="/packages" className="hover:text-white transition-colors">Tour Packages</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/gallery" className="hover:text-white transition-colors">Travel Gallery</Link></li>
                <li><Link to="/reviews" className="hover:text-white transition-colors">Guest Reviews</Link></li>
                <li><Link to="/faqs" className="hover:text-white transition-colors">FAQs</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Policies &amp; Operations</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link to="/cancellation-policy" className="hover:text-white transition-colors">Cancellation &amp; Refunds</Link></li>
                <li><Link to="/booking" className="hover:text-white transition-colors">Request a Booking</Link></li>
                <li><Link to="/account" className="hover:text-white transition-colors">Traveller Sign In</Link></li>
                <li><Link to="/admin" className="text-[#80d5cb] hover:text-white transition-colors">Admin Portal</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Concierge Desk</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <span className="tabular-nums">{settings?.phone || '+91 98114 20750'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <span>{settings?.email || 'concierge@travelgo.in'}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <span>{settings?.address}</span>
                </li>
              </ul>
              <div className="flex items-center gap-4 mt-5 text-xs font-medium">
                {isSafeUrl(settings?.social_links?.instagram) && (
                  <a href={settings?.social_links?.instagram} target="_blank" rel="noreferrer" className="hover:text-white">
                    Instagram
                  </a>
                )}
                {isSafeUrl(settings?.social_links?.youtube) && (
                  <a href={settings?.social_links?.youtube} target="_blank" rel="noreferrer" className="hover:text-white">
                    YouTube
                  </a>
                )}
                {isSafeUrl(settings?.social_links?.facebook) && (
                  <a href={settings?.social_links?.facebook} target="_blank" rel="noreferrer" className="hover:text-white">
                    Facebook
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
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
        className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-4 py-3 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.16)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">Chat with Expert</span>
      </a>
    </div>
  );
}
