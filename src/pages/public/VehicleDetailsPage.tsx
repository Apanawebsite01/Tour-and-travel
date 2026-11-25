import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Fuel, Luggage, Settings2, ShieldCheck, Users } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { SafeImage } from '../../components/ui/SafeImage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../utils/format';
import type { Vehicle } from '../../types';

import { useSite } from '../../context/SiteContext';

export function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { vehicles } = useSite();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [estDays, setEstDays] = useState(3);
  const [estMode, setEstMode] = useState<'With Driver' | 'Self-Drive'>('With Driver');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/public/vehicles/${id}`)
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        return res.ok && ct.includes('application/json') ? res.json() : null;
      })
      .then((data) => {
        if (mounted) {
          const resolved = data || vehicles.find((v) => v.id === id) || null;
          setVehicle(resolved);
          if (resolved && !resolved.driver_available && resolved.self_drive_available) {
            setEstMode('Self-Drive');
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setVehicle(vehicles.find((v) => v.id === id) || null);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [id, vehicles]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="h-96 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
        </div>
      </PublicLayout>
    );
  }

  if (!vehicle) {
    return (
      <PublicLayout>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-3">Vehicle Not Found</h1>
          <Link to="/vehicles" className="text-[#0F766E] font-semibold hover:underline">
            Return to Fleet Listing
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const allowanceTotal = estMode === 'With Driver' ? vehicle.driver_allowance * estDays : 0;
  const estTotal = vehicle.daily_rate * estDays + allowanceTotal;

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#0F766E] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Vehicles</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Gallery & Specifications */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="aspect-[16/10] bg-slate-100">
                <SafeImage
                  src={vehicle.images?.[activeImg]}
                  alt={vehicle.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {vehicle.images && vehicle.images.length > 1 && (
                <div className="p-3 flex gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                  {vehicle.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImg(idx)}
                      className={`w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImg === idx ? 'border-[#0F766E]' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <SafeImage src={img} alt={`${vehicle.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-[#0F766E] mb-1">
                    {vehicle.brand} · {vehicle.model}
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{vehicle.name}</h1>
                </div>
                <StatusBadge status={vehicle.status} />
              </div>

              <p className="text-[#475569] leading-relaxed mb-6">{vehicle.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-y border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#0F766E]" />
                  <div>
                    <div className="text-xs text-[#64748B]">Capacity</div>
                    <div className="text-sm font-semibold tabular-nums">{vehicle.seats} Seats</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Fuel className="w-4 h-4 text-[#0F766E]" />
                  <div>
                    <div className="text-xs text-[#64748B]">Fuel</div>
                    <div className="text-sm font-semibold">{vehicle.fuel_type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Settings2 className="w-4 h-4 text-[#0F766E]" />
                  <div>
                    <div className="text-xs text-[#64748B]">Gearbox</div>
                    <div className="text-sm font-semibold">{vehicle.transmission}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Luggage className="w-4 h-4 text-[#0F766E]" />
                  <div>
                    <div className="text-xs text-[#64748B]">Luggage</div>
                    <div className="text-sm font-semibold tabular-nums">{vehicle.luggage_capacity} Suitcases</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#334155]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>All-India Tourist Permit &amp; Active FASTag</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>{vehicle.is_ac ? 'Dual-Zone Climate Control AC' : 'Standard Cabin Ventilation'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>24/7 Highway Roadside Assistance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Sanitized Prior to Every Dispatch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Transparent Tariff & Quick Calculator */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
              <div className="flex items-baseline justify-between pb-5 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-2xl font-bold text-[#0F172A] tabular-nums">{formatINR(vehicle.daily_rate)}</span>
                  <span className="text-sm text-[#64748B]"> / day</span>
                </div>
                <div className="text-sm font-semibold text-[#0F766E] tabular-nums">
                  {formatINR(vehicle.price_per_km)} / km
                </div>
              </div>

              <div className="py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                    Estimated Trip Duration (Days)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={estDays}
                    onChange={(e) => setEstDays(Number(e.target.value))}
                    className="w-full accent-[#0F766E]"
                  />
                  <div className="flex justify-between text-xs text-[#64748B] tabular-nums mt-1">
                    <span>1 day</span>
                    <span className="font-semibold text-[#0F172A]">{estDays} Days</span>
                    <span>15 days</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Driver Preference</label>
                  <div className="grid grid-cols-2 gap-2">
                    {vehicle.driver_available && (
                      <button
                        type="button"
                        onClick={() => setEstMode('With Driver')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                          estMode === 'With Driver'
                            ? 'bg-[#CCFBF1] border-[#0F766E] text-[#0F766E]'
                            : 'border-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        With Driver
                      </button>
                    )}
                    {vehicle.self_drive_available && (
                      <button
                        type="button"
                        onClick={() => setEstMode('Self-Drive')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                          estMode === 'Self-Drive'
                            ? 'bg-[#CCFBF1] border-[#0F766E] text-[#0F766E]'
                            : 'border-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        Self-Drive
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-[#475569]">
                    <span>Base Vehicle Tariff ({estDays}d)</span>
                    <span className="tabular-nums font-medium">{formatINR(vehicle.daily_rate * estDays)}</span>
                  </div>
                  {estMode === 'With Driver' && (
                    <div className="flex justify-between text-[#475569]">
                      <span>Driver Allowance ({formatINR(vehicle.driver_allowance)}/day)</span>
                      <span className="tabular-nums font-medium">{formatINR(allowanceTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#64748B] text-xs">
                    <span>Minimum Outstation Billing</span>
                    <span className="tabular-nums">{vehicle.min_km_per_day} km / day</span>
                  </div>
                  <div className="pt-2 border-t border-[#E2E8F0] flex justify-between font-bold text-[#0F172A]">
                    <span>Indicative Estimate</span>
                    <span className="tabular-nums text-[#F97316]">{formatINR(estTotal)}</span>
                  </div>
                </div>
              </div>

              <Link
                to={`/booking?type=vehicle&id=${vehicle.id}&driver_preference=${encodeURIComponent(estMode)}`}
                className="w-full inline-flex items-center justify-center rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm py-3.5 transition-colors"
              >
                Request Booking for This Vehicle
              </Link>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>No immediate payment required to submit request</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
