import React, { useCallback, useEffect, useState } from 'react';
import { Archive, Edit3, Plus, Upload } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SafeImage } from '../../components/ui/SafeImage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import type { Vehicle } from '../../types';
import { formatINR } from '../../utils/format';

const EMPTY_FORM = {
  name: '',
  brand: '',
  model: '',
  registration_no: '',
  seats: 7,
  luggage_capacity: 4,
  is_ac: true,
  fuel_type: 'Diesel' as Vehicle['fuel_type'],
  transmission: 'Automatic' as Vehicle['transmission'],
  price_per_km: 22,
  daily_rate: 3800,
  min_km_per_day: 250,
  driver_allowance: 550,
  driver_available: true,
  self_drive_available: true,
  status: 'Available' as Vehicle['status'],
  is_published: true,
  description: '',
  images: ['/src/assets/images/vehicle_suv_hycross_1795623485346.jpg'],
};

export function AdminVehiclesPage() {
  const { adminFetch } = useAuth();
  const { refresh: refreshPublic } = useSite();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newImgUrl, setNewImgUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    const res = await adminFetch(`/api/admin/vehicles?archived=${showArchived}`);
    if (res.ok) setVehicles(await res.json());
  }, [adminFetch, showArchived]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      brand: v.brand,
      model: v.model,
      registration_no: v.registration_no || '',
      seats: v.seats,
      luggage_capacity: v.luggage_capacity,
      is_ac: v.is_ac,
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      price_per_km: v.price_per_km,
      daily_rate: v.daily_rate,
      min_km_per_day: v.min_km_per_day,
      driver_allowance: v.driver_allowance,
      driver_available: v.driver_available,
      self_drive_available: v.self_drive_available,
      status: v.status,
      is_published: v.is_published ?? true,
      description: v.description,
      images: v.images.length ? v.images : ['/src/assets/images/vehicle_suv_hycross_1795623485346.jpg'],
    });
    setError(null);
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG, PNG, and WEBP files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          dataBase64: String(reader.result),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, images: [...prev.images, json.url] }));
      } else {
        setError(json.error || 'Upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const url = editingId ? `/api/admin/vehicles/${editingId}` : '/api/admin/vehicles';
    const method = editingId ? 'PUT' : 'POST';
    const res = await adminFetch(url, { method, body: JSON.stringify(form) });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Failed to save vehicle');
      return;
    }
    setShowModal(false);
    await loadVehicles();
    await refreshPublic();
  };

  const toggleArchive = async (v: Vehicle) => {
    await adminFetch(`/api/admin/vehicles/${v.id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: !v.is_archived }),
    });
    await loadVehicles();
    await refreshPublic();
  };

  return (
    <AdminLayout title="Vehicle Fleet Management">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#475569]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-[#E2E8F0]"
            />
            <span>Show Archived Vehicles</span>
          </label>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
              <div className="aspect-[16/10] bg-slate-100">
                <SafeImage src={v.images?.[0]} alt={v.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs text-[#0F766E] font-semibold">{v.registration_no}</span>
                  <StatusBadge status={v.is_archived ? 'Archived' : v.status} />
                </div>
                <h3 className="font-display font-bold text-[#0F172A]">{v.name}</h3>
                <p className="text-xs text-[#64748B] mt-0.5 mb-3">
                  {v.seats} Seats · {v.fuel_type} · {v.transmission} · {v.is_published ? 'Published' : 'Draft'}
                </p>
                <div className="text-sm font-semibold tabular-nums mb-4">
                  {formatINR(v.daily_rate)}/day · {formatINR(v.price_per_km)}/km
                </div>
                <div className="mt-auto pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleArchive(v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-red-600"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{v.is_archived ? 'Restore' : 'Archive'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-xs text-[#64748B] hover:text-[#0F172A]">
                Close
              </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs">{error}</div>}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Display Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Registration No (Admin Only) *</label>
                  <input required value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Brand *</label>
                  <input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Model *</label>
                  <input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Seats</label>
                  <input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value as Vehicle['fuel_type'] })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white">
                    <option value="Hybrid">Hybrid</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Transmission</label>
                  <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value as Vehicle['transmission'] })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white">
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Availability Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle['status'] })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white">
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Daily Rate (₹)</label>
                  <input type="number" min={0} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Per-Km Rate (₹)</label>
                  <input type="number" min={0} value={form.price_per_km} onChange={(e) => setForm({ ...form, price_per_km: Number(e.target.value) })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Min Km / Day</label>
                  <input type="number" min={0} value={form.min_km_per_day} onChange={(e) => setForm({ ...form, min_km_per_day: Number(e.target.value) })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Driver Allowance (₹/day)</label>
                  <input type="number" min={0} value={form.driver_allowance} onChange={(e) => setForm({ ...form, driver_allowance: Number(e.target.value) })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-medium">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_ac} onChange={(e) => setForm({ ...form, is_ac: e.target.checked })} /> AC Equipped</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.driver_available} onChange={(e) => setForm({ ...form, driver_available: e.target.checked })} /> With Driver</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.self_drive_available} onChange={(e) => setForm({ ...form, self_drive_available: e.target.checked })} /> Self-Drive</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published on Website</label>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Vehicle Photos (Upload JPG/PNG/WEBP ≤ 5MB or paste URL)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-14 rounded-lg overflow-hidden border border-[#E2E8F0]">
                      <SafeImage src={url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium cursor-pointer hover:bg-slate-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <input
                    type="text"
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    placeholder="Or paste /src/assets/... image URL"
                    className="flex-1 h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newImgUrl.trim()) {
                        setForm({ ...form, images: [...form.images, newImgUrl.trim()] });
                        setNewImgUrl('');
                      }
                    }}
                    className="px-3 rounded-xl bg-slate-100 text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-full bg-[#0F766E] text-white text-xs font-semibold">
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
