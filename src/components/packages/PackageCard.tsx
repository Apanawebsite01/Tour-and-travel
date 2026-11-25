import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { SafeImage } from '../ui/SafeImage';
import { formatINR } from '../../utils/format';
import type { TourPackage } from '../../types';

export function PackageCard({ pkg }: { pkg: TourPackage }) {
  const cover = pkg.images?.[0];

  return (
    <article className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] flex flex-col transition-transform duration-200 hover:-translate-y-0.5">
      <Link to={`/packages/${pkg.id}`} className="block aspect-[4/3] overflow-hidden bg-slate-100">
        <SafeImage
          src={cover}
          alt={pkg.name}
          fallbackLabel={pkg.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
        />
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-xs text-[#64748B] mb-1.5">
          <span className="font-medium text-[#0F766E] tabular-nums">
            {pkg.nights} Nights / {pkg.days} Days
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316]" />
            <span className="font-semibold text-[#0F172A]">{pkg.rating.toFixed(1)}</span>
            <span>({pkg.review_count})</span>
          </span>
        </div>

        <Link to={`/packages/${pkg.id}`} className="group">
          <h3 className="font-display text-lg font-semibold text-[#0F172A] group-hover:text-[#0F766E] transition-colors">
            {pkg.name}
          </h3>
        </Link>

        <p className="text-xs text-[#64748B] mt-1 mb-3">{pkg.destination}</p>

        <ul className="text-xs text-[#475569] space-y-1 mb-5 flex-1">
          {pkg.inclusions.slice(0, 3).map((inc, idx) => (
            <li key={idx} className="truncate">
              · {inc}
            </li>
          ))}
        </ul>

        <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#64748B]">Starting from</div>
            <div className="text-lg font-bold text-[#F97316] tabular-nums">
              {formatINR(pkg.price)}
              <span className="text-xs font-normal text-[#64748B]"> / person</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/packages/${pkg.id}`}
              className="px-3.5 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:border-[#0F766E] hover:text-[#0F766E] transition-colors whitespace-nowrap"
            >
              Itinerary
            </Link>
            <Link
              to={`/booking?type=package&id=${pkg.id}`}
              className="px-4 py-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Book Tour
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
