import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { useSite } from '../../context/SiteContext';
import { buildWhatsAppLink, formatDateShort, formatINR } from '../../utils/format';

interface PublicBookingSummary {
  reference_id: string;
  booking_type: string;
  pickup_location: string;
  destination: string;
  travel_date: string;
  pickup_time: string;
  return_date: string;
  passengers: number;
  driver_preference: string;
  status: string;
  total_amount: number;
  vehicle_name?: string;
  package_name?: string;
}

export function BookingSuccessPage() {
  const { refId } = useParams<{ refId: string }>();
  const { settings } = useSite();
  const [booking, setBooking] = useState<PublicBookingSummary | null>(null);

  useEffect(() => {
    fetch(`/api/public/bookings/${refId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setBooking)
      .catch(() => {});
  }, [refId]);

  const waMessage = booking
    ? `Hi ${settings?.business_name || 'TravelGo'}, I just submitted booking request ${booking.reference_id} for ${booking.destination} (${formatDateShort(booking.travel_date)} to ${formatDateShort(booking.return_date)}).`
    : `Hi ${settings?.business_name || 'TravelGo'}, checking on my booking reference ${refId}.`;

  const waHref = buildWhatsAppLink(settings?.whatsapp_number, waMessage);

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_16px_40px_-14px_rgba(15,23,42,0.08)] p-8 sm:p-11 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0F766E] flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider mb-2">
            Booking Request Received
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-3">
            Reference ID: <span className="font-mono text-[#0F766E]">{refId}</span>
          </h1>
          <p className="text-sm text-[#475569] leading-relaxed mb-8 max-w-md mx-auto">
            Your enquiry has been logged as <strong className="text-[#0F172A]">Pending</strong>. Our operations desk will confirm vehicle &amp; chauffeur availability shortly.
          </p>

          {booking && (
            <div className="text-left rounded-2xl bg-[#F7F8FA] border border-slate-200/80 p-5 sm:p-6 space-y-3 text-sm mb-8">
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B]">Trip</span>
                <span className="font-semibold text-right text-[#0F172A]">
                  {booking.package_name || booking.vehicle_name}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B]">Route</span>
                <span className="font-medium text-right text-[#0F172A]">
                  {booking.pickup_location} → {booking.destination}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B]">Dates</span>
                <span className="font-medium tabular-nums text-[#0F172A]">
                  {formatDateShort(booking.travel_date)} – {formatDateShort(booking.return_date)} ({booking.pickup_time})
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-200 flex justify-between gap-4">
                <span className="font-medium text-[#475569]">Indicative Amount</span>
                <span className="font-bold text-[#F97316] tabular-nums">{formatINR(booking.total_amount)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-6 py-3.5 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Fast-Track on WhatsApp</span>
            </a>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-slate-200 hover:border-[#0F766E] text-[#0F172A] font-semibold text-sm px-6 py-3.5 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
