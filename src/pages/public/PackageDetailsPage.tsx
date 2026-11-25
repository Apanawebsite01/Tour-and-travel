import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPin, Star, Users, X } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { SafeImage } from '../../components/ui/SafeImage';
import { formatINR } from '../../utils/format';
import type { TourPackage } from '../../types';

import { useSite } from '../../context/SiteContext';

export function PackageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { packages, vehicles } = useSite();
  const [pkg, setPkg] = useState<TourPackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/public/packages/${id}`)
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        return res.ok && ct.includes('application/json') ? res.json() : null;
      })
      .then((data) => {
        if (mounted) {
          if (data) {
            setPkg(data);
          } else {
            const fallbackPkg = packages.find((p) => p.id === id) || null;
            setPkg(
              fallbackPkg
                ? {
                    ...fallbackPkg,
                    suggested_vehicle: vehicles.find((v) => v.id === fallbackPkg.suggested_vehicle_id) || null,
                  }
                : null
            );
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          const fallbackPkg = packages.find((p) => p.id === id) || null;
          setPkg(fallbackPkg);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [id, packages, vehicles]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="h-96 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
        </div>
      </PublicLayout>
    );
  }

  if (!pkg) {
    return (
      <PublicLayout>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-3">Tour Package Not Found</h1>
          <Link to="/packages" className="text-[#0F766E] font-semibold hover:underline">
            Browse All Tour Packages
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to="/packages"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#0F766E] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tour Packages</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="aspect-[16/9] bg-slate-100">
                <SafeImage src={pkg.images?.[0]} alt={pkg.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] mb-2">
                  <span className="font-semibold text-[#0F766E] tabular-nums">
                    {pkg.nights} Nights / {pkg.days} Days
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{pkg.destination}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316]" />
                    <strong className="text-[#0F172A]">{pkg.rating.toFixed(1)}</strong> ({pkg.review_count} reviews)
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-4">
                  {pkg.name}
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#0F766E] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-[#64748B]">Pickup</div>
                      <div className="font-medium text-[#0F172A]">{pkg.pickup_location}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#F97316] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-[#64748B]">Drop-off</div>
                      <div className="font-medium text-[#0F172A]">{pkg.dropoff_location}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-[#0F766E] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-[#64748B]">Group Size</div>
                      <div className="font-medium text-[#0F172A] tabular-nums">Up to {pkg.max_passengers} Guests</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day-Wise Itinerary */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-[#0F172A] mb-6">Day-Wise Itinerary</h2>
              <div className="space-y-6">
                {pkg.itinerary.map((day) => (
                  <div key={day.day} className="flex gap-4 pb-6 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                    <div className="w-14 shrink-0">
                      <span className="inline-block font-mono text-xs font-semibold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-1 rounded-lg tabular-nums">
                        Day {String(day.day).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-[#0F172A] mb-1">{day.title}</h3>
                      <p className="text-sm text-[#475569] leading-relaxed">{day.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <h2 className="font-display text-lg font-semibold text-[#0F172A] mb-4">Included in Package</h2>
                <ul className="space-y-2.5 text-sm text-[#334155]">
                  {pkg.inclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#16A34A] mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <h2 className="font-display text-lg font-semibold text-[#0F172A] mb-4">Not Included</h2>
                <ul className="space-y-2.5 text-sm text-[#64748B]">
                  {pkg.exclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-[#DC2626] mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Sticky Booking Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
              <div className="text-xs text-[#64748B] mb-1">Starting Package Rate</div>
              <div className="text-3xl font-bold text-[#F97316] tabular-nums mb-1">
                {formatINR(pkg.price)}
                <span className="text-sm font-normal text-[#64748B]"> / person</span>
              </div>
              <p className="text-xs text-[#64748B] mb-6">Twin-sharing basis · Customizable hotels &amp; vehicle</p>

              <Link
                to={`/booking?type=package&id=${pkg.id}`}
                className="w-full inline-flex items-center justify-center rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm py-3.5 transition-colors mb-3"
              >
                Book This Tour Package
              </Link>

              <Link
                to="/contact"
                className="w-full inline-flex items-center justify-center rounded-full border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F172A] font-semibold text-sm py-3 transition-colors"
              >
                Ask for Custom Itinerary
              </Link>
            </div>

            {pkg.suggested_vehicle && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <div className="text-xs font-semibold text-[#0F766E] mb-3">Recommended Fleet Pairing</div>
                <div className="flex items-center gap-3.5">
                  <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                    <SafeImage
                      src={pkg.suggested_vehicle.images?.[0]}
                      alt={pkg.suggested_vehicle.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/vehicles/${pkg.suggested_vehicle.id}`}
                      className="font-semibold text-sm text-[#0F172A] hover:text-[#0F766E] block truncate"
                    >
                      {pkg.suggested_vehicle.name}
                    </Link>
                    <div className="text-xs text-[#64748B]">
                      {pkg.suggested_vehicle.seats} Seats · {pkg.suggested_vehicle.transmission}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
