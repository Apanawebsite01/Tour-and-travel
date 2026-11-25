import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MapPin, MessageCircle, Phone, Star } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { SafeImage } from '../../components/ui/SafeImage';
import { useSite } from '../../context/SiteContext';
import { buildWhatsAppLink } from '../../utils/format';

export function AboutPage() {
  const { settings } = useSite();
  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-sm font-semibold text-[#0F766E]">About {settings?.business_name || 'TravelGo'}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
              {settings?.about_title || 'Built by road-trippers, engineered for Indian highways.'}
            </h1>
            <p className="text-[#475569] leading-relaxed text-base">{settings?.about_description}</p>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0]">
              <div>
                <div className="font-display text-2xl font-bold text-[#0F766E] tabular-nums">28</div>
                <div className="text-xs text-[#64748B]">Indian States Covered</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-[#0F766E] tabular-nums">40-Pt</div>
                <div className="text-xs text-[#64748B]">Pre-Trip Inspection</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-[#F97316] tabular-nums">4.9 / 5</div>
                <div className="text-xs text-[#64748B]">Verified Guest Rating</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#E2E8F0]">
              <SafeImage src={settings?.hero_image} alt="TravelGo Fleet on Himalayan Highway" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function GalleryPage() {
  const { gallery } = useSite();
  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-sm font-semibold text-[#0F766E] mb-2">Expedition Moments</p>
        <h1 className="font-display text-3xl font-bold text-[#0F172A] tracking-tight mb-8">Travel Gallery</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.map((g) => (
            <figure key={g.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100">
                <SafeImage src={g.image_url} alt={g.caption} className="w-full h-full object-cover" />
              </div>
              <figcaption className="p-4">
                <div className="text-xs font-semibold text-[#0F766E] mb-1">{g.location}</div>
                <p className="text-sm text-[#0F172A]">{g.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function ReviewsPage() {
  const { reviews } = useSite();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [tripType, setTripType] = useState('Tour Package');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittedMsg(null);
    const res = await fetch('/api/public/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: name, location, trip_type: tripType, rating, comment }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not submit review');
      return;
    }
    setSubmittedMsg(json.message);
    setName('');
    setLocation('');
    setComment('');
  };

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-sm font-semibold text-[#0F766E] mb-2">Verified Guest Feedback</p>
        <h1 className="font-display text-3xl font-bold text-[#0F172A] tracking-tight mb-8">Traveller Reviews</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-[#F97316] text-[#F97316]" />
                    ))}
                  </div>
                  <p className="text-sm text-[#334155] leading-relaxed mb-4">“{r.comment}”</p>
                </div>
                <div className="pt-3 border-t border-[#E2E8F0]">
                  <div className="font-semibold text-sm">{r.customer_name}</div>
                  <div className="text-xs text-[#64748B]">
                    {r.location} · {r.trip_type}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Share Your Journey</h2>
            {submittedMsg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs">{submittedMsg}</div>}
            {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">{error}</div>}
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm"
            />
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Your City (e.g., Pune)"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm"
            />
            <input
              type="text"
              required
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              placeholder="Trip or Vehicle"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm"
            />
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm bg-white"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} Stars
                </option>
              ))}
            </select>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the vehicle, chauffeur, or tour itinerary?"
              className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-sm py-3"
            >
              Submit Review
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}

export function FaqsPage() {
  const { faqs } = useSite();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-sm font-semibold text-[#0F766E] mb-2">Help Center</p>
        <h1 className="font-display text-3xl font-bold text-[#0F172A] tracking-tight mb-8">Frequently Asked Questions</h1>
        <div className="space-y-3">
          {faqs.map((f) => {
            const open = openId === f.id;
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : f.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#0F172A]"
                >
                  <span>{f.question}</span>
                  <ChevronDown className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && <div className="px-6 pb-5 text-sm text-[#475569] leading-relaxed">{f.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}

export function ContactPage() {
  const { settings } = useSite();
  const waHref = buildWhatsAppLink(
    settings?.whatsapp_number,
    `Hi ${settings?.business_name || 'TravelGo'}, I have a travel query.`
  );

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-sm font-semibold text-[#0F766E]">24/7 Trip Concierge</p>
            <h1 className="font-display text-3xl font-bold text-[#0F172A] tracking-tight">
              Get in Touch with {settings?.business_name || 'TravelGo'}
            </h1>
            <p className="text-[#475569] leading-relaxed">
              Whether you need an urgent airport SUV pickup, corporate fleet scheduling, or custom Ladakh permits, our dispatchers respond promptly.
            </p>

            <div className="space-y-4 bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#0F766E] mt-0.5" />
                <div>
                  <div className="text-xs text-[#64748B]">Dispatch Phone</div>
                  <div className="font-semibold tabular-nums">{settings?.phone}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#0F766E] mt-0.5" />
                <div>
                  <div className="text-xs text-[#64748B]">Email</div>
                  <div className="font-semibold">{settings?.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#0F766E] mt-0.5" />
                <div>
                  <div className="text-xs text-[#64748B]">Headquarters</div>
                  <div className="font-medium text-sm">{settings?.address}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-6 py-3.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message on WhatsApp</span>
              </a>
              <Link
                to="/booking"
                className="inline-flex items-center rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm px-6 py-3.5"
              >
                Open Booking Request Form
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-xl font-bold">Operating Hubs Across India</h2>
            <p className="text-sm text-[#475569]">{settings?.operating_area}</p>
            <div className="aspect-[16/10] rounded-xl overflow-hidden border border-[#E2E8F0]">
              <SafeImage src={settings?.hero_image} alt="TravelGo Operating Hubs" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PolicyPage({ type }: { type: 'privacy' | 'terms' | 'cancellation' }) {
  const { settings } = useSite();
  const titleMap = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    cancellation: 'Cancellation & Refund Policy',
  };
  const body = settings?.policies?.[type] || '';

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 sm:p-10">
          <p className="text-xs font-semibold text-[#0F766E] mb-2">{settings?.business_name || 'TravelGo'} Legal</p>
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-6">{titleMap[type]}</h1>
          <p className="text-[#334155] leading-relaxed whitespace-pre-line">{body}</p>
        </div>
      </div>
    </PublicLayout>
  );
}
