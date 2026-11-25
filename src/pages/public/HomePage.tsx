import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  Compass,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { VehicleCard } from '../../components/vehicles/VehicleCard';
import { PackageCard } from '../../components/packages/PackageCard';
import { SafeImage } from '../../components/ui/SafeImage';
import { useSite } from '../../context/SiteContext';
import { buildWhatsAppLink } from '../../utils/format';

export function HomePage() {
  const { settings, vehicles, packages, reviews, gallery, loading } = useSite();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'vehicle' | 'package'>('vehicle');
  const [pickup, setPickup] = useState('New Delhi / Gurugram');
  const [destination, setDestination] = useState('Jaipur · Udaipur');
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 9);
    return d.toISOString().slice(0, 10);
  });
  const [driveMode, setDriveMode] = useState<'With Driver' | 'Self-Drive'>('With Driver');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      type: tab,
      pickup,
      destination,
      travel_date: travelDate,
      return_date: returnDate,
      driver_preference: driveMode,
    });
    navigate(`/booking?${params.toString()}`);
  };

  const featuredVehicles = vehicles.filter((v) => v.status === 'Available').slice(0, 3);
  const featuredPackages = packages.slice(0, 4);
  const waHref = buildWhatsAppLink(
    settings?.whatsapp_number,
    `Hi ${settings?.business_name || 'TravelGo'}, I need assistance planning a trip in India.`
  );

  return (
    <PublicLayout>
      {/* 1. Hero Banner + Dual-Tab Booking Search Widget */}
      <section className="relative bg-[#0F172A] overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage
            src={settings?.hero_image}
            alt="TravelGo Himalayan expedition SUV on mountain pass"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/75 via-[#0F172A]/50 to-[#0F172A]/85" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-semibold text-[#80d5cb] mb-3 tracking-wide">
              {settings?.operating_area || 'Delhi NCR · Jaipur · Leh · Goa · Kochi · Bengaluru'}
            </p>
            <h1
              className="font-display text-white font-bold tracking-tight leading-[1.12] mb-5"
              style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.5rem)', textWrap: 'balance' }}
            >
              {settings?.hero_headline ||
                'Explore India at your own pace, from Himalayan passes to coastal highways.'}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              {settings?.hero_subheadline ||
                'Transparent per-km pricing, sanitized 4x4 SUVs, verified chauffeurs, and hand-crafted tour itineraries.'}
            </p>
          </div>

          {/* Booking Search Engine (Level 2 Elevation) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_14px_34px_-6px_rgba(15,23,42,0.28)] p-4 sm:p-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4 mb-5">
              <button
                type="button"
                onClick={() => setTab('vehicle')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                  tab === 'vehicle'
                    ? 'bg-[#CCFBF1] text-[#0F766E]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Vehicle Rental</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('package')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                  tab === 'package'
                    ? 'bg-[#CCFBF1] text-[#0F766E]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Tour Packages</span>
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Pickup City</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="City or Airport"
                    className="w-full h-12 pl-10 pr-3 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Destination</label>
                <div className="relative">
                  <Compass className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Where are you heading?"
                    className="w-full h-12 pl-10 pr-3 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Travel Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full h-12 pl-10 pr-3 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  {tab === 'vehicle' ? 'Drive Option' : 'Return Date'}
                </label>
                {tab === 'vehicle' ? (
                  <select
                    value={driveMode}
                    onChange={(e) => setDriveMode(e.target.value as 'With Driver' | 'Self-Drive')}
                    className="w-full h-12 px-3.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="With Driver">With Chauffeur</option>
                    <option value="Self-Drive">Self-Drive</option>
                  </select>
                ) : (
                  <input
                    type="date"
                    required
                    value={returnDate}
                    min={travelDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F766E]"
                  />
                )}
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap px-5"
                >
                  <span>{tab === 'vehicle' ? 'Request Vehicle' : 'Plan Package'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Why Choose Us */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#0F766E] mb-2">Built for Indian Road Conditions</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Reliability across every highway, hill pass, and coastal circuit.
            </h2>
          </div>
          <Link
            to="/about"
            className="text-sm font-semibold text-[#0F766E] hover:text-[#115E59] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Our Story &amp; Safety Standards</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              num: '01.',
              title: 'Transparent INR Pricing',
              body: 'Upfront per-km tariffs, clear minimum daily km rules, and itemised FASTag toll receipts with zero hidden surprises.',
            },
            {
              num: '02.',
              title: 'All-India Tourist Permits',
              body: 'Every SUV carries national highway permits, comprehensive passenger insurance, and routine 40-point mechanical checks.',
            },
            {
              num: '03.',
              title: 'Mountain-Trained Chauffeurs',
              body: 'Verified multi-lingual drivers experienced across Ladakh high passes, Rajasthan expressways, and Western Ghats.',
            },
            {
              num: '04.',
              title: 'Self-Drive or Chauffeured',
              body: 'Switch seamlessly between relaxed chauffeur-driven family holidays and independent 4x4 self-drive escapes.',
            },
          ].map((item) => (
            <div key={item.num} className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="font-mono text-sm font-semibold text-[#0F766E] mb-3">{item.num}</div>
              <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">{item.title}</h3>
              <p className="text-sm text-[#475569] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Featured Vehicles */}
      <section className="bg-white border-y border-[#E2E8F0] py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-semibold text-[#0F766E] mb-2">Sanitized SUV &amp; MPV Fleet</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
                Featured Vehicles Ready for Departure
              </h2>
            </div>
            <Link
              to="/vehicles"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#0F766E] text-[#0F766E] hover:bg-[#CCFBF1]/40 text-sm font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <span>View All {vehicles.length} Vehicles</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Popular Tour Packages */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#F97316] mb-2">Curated Regional Circuits</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Popular India Tour Packages
            </h2>
          </div>
          <Link
            to="/packages"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#0F766E] hover:text-[#0F766E] text-sm font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <span>Explore All Packages</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredPackages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>

      {/* 5. How Booking Works (4 Steps) */}
      <section className="bg-[#0F766E] text-white py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-semibold text-[#9cf2e8] mb-2">Zero-Friction Reservations</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              How Booking with {settings?.business_name || 'TravelGo'} Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: 'Step 01',
                title: 'Choose Vehicle or Tour',
                desc: 'Browse real-time fleet specs, per-km tariffs, or multi-day regional tour itineraries.',
              },
              {
                step: 'Step 02',
                title: 'Submit Request Online',
                desc: 'Send your dates, pickup point, and driver preference in under 60 seconds with no upfront card charge.',
              },
              {
                step: 'Step 03',
                title: 'Receive Exact Quotation',
                desc: 'Our trip desk verifies vehicle & driver availability and shares a transparent INR breakdown on WhatsApp.',
              },
              {
                step: 'Step 04',
                title: 'Confirm & Hit the Road',
                desc: 'Lock your reservation with a small advance and track your assigned vehicle and chauffeur details.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl bg-white/10 border border-white/15 p-6">
                <div className="font-mono text-xs text-[#9cf2e8] mb-2">{s.step}</div>
                <h3 className="font-display text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-teal-50/90 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Guest Testimonials */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#0F766E] mb-2">Verified Traveller Stories</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Trusted by Families, Explorers &amp; Corporate Teams
            </h2>
          </div>
          <Link to="/reviews" className="text-sm font-semibold text-[#0F766E] hover:underline whitespace-nowrap">
            Read All Reviews
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.slice(0, 4).map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: r.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-[#F97316] text-[#F97316]" />
                  ))}
                </div>
                <p className="text-sm text-[#334155] leading-relaxed mb-5">“{r.comment}”</p>
              </div>
              <div className="pt-4 border-t border-[#E2E8F0]">
                <div className="font-semibold text-sm text-[#0F172A]">{r.customer_name}</div>
                <div className="text-xs text-[#64748B]">
                  {r.location} · {r.trip_type}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Travel Gallery Preview */}
      <section className="bg-white border-y border-[#E2E8F0] py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-semibold text-[#0F766E] mb-2">On the Road Across India</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
                Recent Expeditions &amp; Fleet Dispatches
              </h2>
            </div>
            <Link to="/gallery" className="text-sm font-semibold text-[#0F766E] hover:underline whitespace-nowrap">
              Open Full Gallery
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {gallery.slice(0, 3).map((g, i) => (
              <figure
                key={g.id}
                className={`rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] ${
                  i === 0 ? 'md:col-span-2 aspect-[16/9]' : 'aspect-[4/3] md:aspect-auto'
                }`}
              >
                <div className="relative h-full min-h-[240px]">
                  <SafeImage src={g.image_url} alt={g.caption} className="w-full h-full object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                    <div className="text-xs font-medium text-[#9cf2e8] mb-0.5">{g.location}</div>
                    <div className="text-sm font-medium">{g.caption}</div>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Contact & Instant WhatsApp Concierge */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#16A34A] mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Instant Response · Daily 06:00 AM – 11:00 PM IST</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-3">
              Need a custom multi-city itinerary or corporate fleet quote?
            </h2>
            <p className="text-[#475569] text-base leading-relaxed">
              Speak directly with our operations desk for bespoke Ladakh permits, wedding convoy rentals, or airport transfers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-6 py-3.5 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F172A] font-semibold text-sm px-6 py-3.5 transition-colors whitespace-nowrap"
            >
              <Phone className="w-4 h-4 text-[#0F766E]" />
              <span>Contact Desk</span>
            </Link>
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm px-6 py-3.5 transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Start Booking Request</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
