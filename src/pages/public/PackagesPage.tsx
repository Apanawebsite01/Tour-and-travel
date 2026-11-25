import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { PackageCard } from '../../components/packages/PackageCard';
import { useSite } from '../../context/SiteContext';

export function PackagesPage() {
  const { packages, loading } = useSite();
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState<'all' | 'short' | 'long'>('all');

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!`${p.name} ${p.destination} ${p.pickup_location}`.toLowerCase().includes(q)) return false;
      }
      if (duration === 'short' && p.days > 5) return false;
      if (duration === 'long' && p.days < 6) return false;
      return true;
    });
  }, [packages, query, duration]);

  return (
    <PublicLayout>
      <section className="bg-white border-b border-slate-200/80 py-12 lg:py-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F97316] mb-2">
                Hand-Crafted Itineraries
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight mb-3 text-balance">
                Curated India Tour Packages
              </h1>
              <p className="text-[#475569] max-w-2xl leading-relaxed">
                Private SUV transfers, boutique heritage and mountain stays, and local permits bundled into transparent multi-day circuits.
              </p>
            </div>
            <div className="text-xs font-medium text-[#64748B] tabular-nums shrink-0">
              Showing {filtered.length} curated routes
            </div>
          </div>

          <div className="p-3 bg-[#F7F8FA] rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Ladakh, Rajasthan, Kerala, Goa..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 transition-all"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start sm:self-auto">
              {[
                { key: 'all', label: 'All Durations' },
                { key: 'short', label: 'Up to 5 Days' },
                { key: 'long', label: '6+ Days' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDuration(opt.key as 'all' | 'short' | 'long')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    duration === opt.key ? 'bg-[#CCFBF1]/70 text-[#0F766E]' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <h2 className="font-display text-lg font-semibold mb-2">No packages match your search</h2>
            <p className="text-sm text-[#64748B]">Try another destination or contact us for a custom itinerary.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
