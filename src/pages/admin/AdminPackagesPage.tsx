import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SafeImage } from '../../components/ui/SafeImage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import type { TourPackage, Vehicle } from '../../types';
import { formatINR } from '../../utils/format';

const EMPTY_PKG = {
  name: '',
  destination: '',
  days: 4,
  nights: 3,
  price: 22000,
  pickup_location: 'Airport / Station',
  dropoff_location: 'Airport / Station',
  max_passengers: 6,
  status: 'Published' as TourPackage['status'],
  suggested_vehicle_id: '',
  inclusionsText: 'Private AC SUV with Chauffeur\nBoutique Stays with Breakfast\nAll Tolls & Parking',
  exclusionsText: 'Airfare\nMonument Entry Tickets',
  itinerary: [{ day: 1, title: 'Arrival & Local Transfer', description: 'Welcome pickup and hotel check-in.' }],
  images: ['/src/assets/images/package_rajasthan_palace_1795623485510.jpg'],
};

export function AdminPackagesPage() {
  const { adminFetch } = useAuth();
  const { refresh: refreshPublic } = useSite();
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_PKG);

  const loadData = useCallback(async () => {
    const [pRes, vRes] = await Promise.all([adminFetch('/api/admin/packages'), adminFetch('/api/admin/vehicles')]);
    if (pRes.ok) setPackages(await pRes.json());
    if (vRes.ok) setVehicles(await vRes.json());
  }, [adminFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_PKG);
    setShowModal(true);
  };

  const openEdit = (p: TourPackage) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      destination: p.destination,
      days: p.days,
      nights: p.nights,
      price: p.price,
      pickup_location: p.pickup_location,
      dropoff_location: p.dropoff_location,
      max_passengers: p.max_passengers,
      status: p.status,
      suggested_vehicle_id: p.suggested_vehicle_id || '',
      inclusionsText: p.inclusions.join('\n'),
      exclusionsText: p.exclusions.join('\n'),
      itinerary: p.itinerary.length ? p.itinerary : [{ day: 1, title: 'Day 1', description: '' }],
      images: p.images.length ? p.images : ['/src/assets/images/package_rajasthan_palace_1795623485510.jpg'],
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      destination: form.destination,
      days: form.days,
      nights: form.nights,
      price: form.price,
      pickup_location: form.pickup_location,
      dropoff_location: form.dropoff_location,
      max_passengers: form.max_passengers,
      status: form.status,
      suggested_vehicle_id: form.suggested_vehicle_id || null,
      inclusions: form.inclusionsText.split('\n').map((s) => s.trim()).filter(Boolean),
      exclusions: form.exclusionsText.split('\n').map((s) => s.trim()).filter(Boolean),
      itinerary: form.itinerary,
      images: form.images,
    };

    const url = editingId ? `/api/admin/packages/${editingId}` : '/api/admin/packages';
    const method = editingId ? 'PUT' : 'POST';
    const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setShowModal(false);
      await loadData();
      await refreshPublic();
    }
  };

  return (
    <AdminLayout title="Tour Packages">
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Package</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packages.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col sm:flex-row">
              <div className="sm:w-44 aspect-[4/3] sm:aspect-auto bg-slate-100 shrink-0">
                <SafeImage src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-[#0F766E] tabular-nums">
                    {p.days}D / {p.nights}N
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <h3 className="font-display font-bold text-[#0F172A]">{p.name}</h3>
                <p className="text-xs text-[#64748B] mb-3">{p.destination}</p>
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                  <span className="font-bold text-[#F97316] tabular-nums">{formatINR(p.price)}</span>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editingId ? 'Edit Package' : 'New Tour Package'}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-xs text-[#64748B]">
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Package Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Destinations *</label>
                  <input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Starting Price (₹)</label>
                  <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Days / Nights</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min={1} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                    <input type="number" min={0} value={form.nights} onChange={(e) => setForm({ ...form, nights: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TourPackage['status'] })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white">
                    <option value="Published">Published</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Pickup</label>
                  <input required value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Suggested Vehicle</label>
                  <select value={form.suggested_vehicle_id} onChange={(e) => setForm({ ...form, suggested_vehicle_id: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white">
                    <option value="">None</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Inclusions (one per line)</label>
                  <textarea rows={3} value={form.inclusionsText} onChange={(e) => setForm({ ...form, inclusionsText: e.target.value })} className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Exclusions (one per line)</label>
                  <textarea rows={3} value={form.exclusionsText} onChange={(e) => setForm({ ...form, exclusionsText: e.target.value })} className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold">Day-Wise Itinerary</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        itinerary: [...form.itinerary, { day: form.itinerary.length + 1, title: '', description: '' }],
                      })
                    }
                    className="text-xs font-semibold text-[#0F766E]"
                  >
                    + Add Day
                  </button>
                </div>
                <div className="space-y-2">
                  {form.itinerary.map((day, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="sm:col-span-4">
                        <input
                          value={day.title}
                          placeholder={`Day ${day.day} Title`}
                          onChange={(e) => {
                            const next = [...form.itinerary];
                            next[idx] = { ...day, title: e.target.value };
                            setForm({ ...form, itinerary: next });
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-8">
                        <input
                          value={day.description}
                          placeholder="Activities & sightseeing..."
                          onChange={(e) => {
                            const next = [...form.itinerary];
                            next[idx] = { ...day, description: e.target.value };
                            setForm({ ...form, itinerary: next });
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-full bg-[#0F766E] text-white text-xs font-semibold">
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
