import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { VehicleCard } from '../../components/vehicles/VehicleCard';
import { useSite } from '../../context/SiteContext';

export function VehiclesPage() {
  const { vehicles, loading } = useSite();
  const [query, setQuery] = useState('');
  const [transmission, setTransmission] = useState<'All' | 'Automatic' | 'Manual'>('All');
  const [fuel, setFuel] = useState<string>('All');
  const [driveMode, setDriveMode] = useState<'All' | 'With Driver' | 'Self-Drive'>('All');
  const [minSeats, setMinSeats] = useState<number>(0);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!`${v.name} ${v.brand} ${v.model} ${v.description}`.toLowerCase().includes(q)) return false;
      }
      if (transmission !== 'All' && v.transmission !== transmission) return false;
      if (fuel !== 'All' && v.fuel_type !== fuel) return false;
      if (driveMode === 'With Driver' && !v.driver_available) return false;
      if (driveMode === 'Self-Drive' && !v.self_drive_available) return false;
      if (minSeats > 0 && v.seats < minSeats) return false;
      return true;
    });
  }, [vehicles, query, transmission, fuel, driveMode, minSeats]);

  const hasActiveFilters =
    Boolean(query.trim()) || transmission !== 'All' || fuel !== 'All' || driveMode !== 'All' || minSeats > 0;

  return (
    <PublicLayout>
      <section className="bg-white border-b border-slate-200/80 py-12 lg:py-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-2">
                All-India Tourist Permit Fleet
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight mb-3 text-balance">
                SUVs, 4x4 Expeditions &amp; Luxury MPVs
              </h1>
              <p className="text-[#475569] max-w-2xl leading-relaxed">
                Every vehicle is inspected before dispatch, carries comprehensive passenger cover, and offers transparent per-km and daily rates in INR.
              </p>
            </div>
            <div className="text-xs font-medium text-[#64748B] tabular-nums shrink-0">
              Showing {filtered.length} of {vehicles.length} vehicles
            </div>
          </div>

          {/* Interactive Filter Toolbar */}
          <div className="p-3 bg-[#F7F8FA] rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Innova, Thar, Prado..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value as 'All' | 'Automatic' | 'Manual')}
                aria-label="Filter by transmission"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0F766E]"
              >
                <option value="All">All Transmissions</option>
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                aria-label="Filter by fuel type"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0F766E]"
              >
                <option value="All">All Fuel Types</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={driveMode}
                onChange={(e) => setDriveMode(e.target.value as 'All' | 'With Driver' | 'Self-Drive')}
                aria-label="Filter by drive option"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0F766E]"
              >
                <option value="All">Driver &amp; Self-Drive</option>
                <option value="With Driver">Chauffeur Driven</option>
                <option value="Self-Drive">Self-Drive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={minSeats}
                onChange={(e) => setMinSeats(Number(e.target.value))}
                aria-label="Filter by minimum seats"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0F766E]"
              >
                <option value={0}>Any Seating</option>
                <option value={5}>5+ Seats</option>
                <option value={7}>7+ Seats</option>
                <option value={10}>10+ Seats</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTransmission('All');
                  setFuel('All');
                  setDriveMode('All');
                  setMinSeats(0);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Clear active filters</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <h2 className="font-display text-lg font-semibold text-[#0F172A] mb-2">No matching vehicles found</h2>
            <p className="text-sm text-[#64748B] mb-5">Try clearing one of your transmission, fuel, or seating filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTransmission('All');
                setFuel('All');
                setDriveMode('All');
                setMinSeats(0);
              }}
              className="px-5 py-2.5 rounded-full bg-[#0F766E] text-white text-sm font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
