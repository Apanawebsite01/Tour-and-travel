import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SafeImage } from '../ui/SafeImage';
import { formatINR } from '../../utils/format';
import type { Vehicle } from '../../types';

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const heroImg = vehicle.images?.[0];
  const driveModes = [
    vehicle.driver_available ? 'With Driver' : null,
    vehicle.self_drive_available ? 'Self-Drive' : null,
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200 ease-snappy hover:border-slate-300 hover:shadow-[0_16px_36px_-12px_rgba(15,23,42,0.12)]">
      <Link to={`/vehicles/${vehicle.id}`} className="block aspect-[16/10] overflow-hidden bg-slate-100">
        <SafeImage
          src={heroImg}
          alt={vehicle.name}
          fallbackLabel={vehicle.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-snappy group-hover:scale-[1.04]"
        />
      </Link>

      <div className="p-6 flex-1 flex flex-col">
        {/* Clean unboxed metadata line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#64748B] mb-2">
          <span>{vehicle.seats} Seats</span>
          <span aria-hidden="true">·</span>
          <span>{vehicle.fuel_type}</span>
          <span aria-hidden="true">·</span>
          <span>{vehicle.transmission}</span>
          <span aria-hidden="true">·</span>
          <span>{vehicle.is_ac ? 'AC' : 'Non-AC'}</span>
        </div>

        <Link to={`/vehicles/${vehicle.id}`} className="inline-flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-[#0F172A] group-hover:text-[#0F766E] transition-colors tracking-tight">
            {vehicle.name}
          </h3>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F766E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
        </Link>

        <p className="text-xs text-[#64748B] mt-1 mb-3 tabular-nums">
          {driveModes} · Min {vehicle.min_km_per_day} km/day · {vehicle.luggage_capacity} Bags
        </p>

        <p className="text-sm text-[#475569] line-clamp-2 leading-relaxed mb-6 flex-1">
          {vehicle.description}
        </p>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-[#0F172A] tabular-nums tracking-tight">
              {formatINR(vehicle.daily_rate)}
              <span className="text-xs font-normal text-[#64748B]"> / day</span>
            </div>
            <div className="text-xs text-[#0F766E] font-medium tabular-nums">
              {formatINR(vehicle.price_per_km)} / km outstation
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/vehicles/${vehicle.id}`}
              className="px-3.5 py-2 rounded-full border border-slate-200 text-xs font-semibold text-[#0F172A] hover:border-[#0F766E] hover:text-[#0F766E] transition-colors whitespace-nowrap"
            >
              Specs
            </Link>
            <Link
              to={`/booking?type=vehicle&id=${vehicle.id}`}
              className="px-4 py-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] text-white text-xs font-semibold transition-all whitespace-nowrap"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
