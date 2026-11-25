import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import type { BookingRecord, DriverRecord, PricingRule } from '../../types';
import { formatDateShort, formatINR } from '../../utils/format';

// ==========================================
// 1. DRIVERS MANAGEMENT
// ==========================================
export function AdminDriversPage() {
  const { adminFetch } = useAuth();
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    photo_url: '',
    licence_no: '',
    licence_expiry: '',
    is_active: true,
  });

  const load = useCallback(async () => {
    const res = await adminFetch('/api/admin/drivers');
    if (res.ok) setDrivers(await res.json());
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/admin/drivers/${editingId}` : '/api/admin/drivers';
    const method = editingId ? 'PUT' : 'POST';
    const res = await adminFetch(url, { method, body: JSON.stringify(form) });
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      load();
    }
  };

  return (
    <AdminLayout title="Drivers Management">
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', phone: '', photo_url: '', licence_no: '', licence_expiry: '', is_active: true });
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Driver</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">Driver Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Licence No.</th>
                  <th className="px-4 py-3 font-medium">Licence Expiry</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-semibold text-[#0F172A]">{d.name}</td>
                    <td className="px-4 py-3.5 tabular-nums">{d.phone}</td>
                    <td className="px-4 py-3.5 font-mono text-xs">{d.licence_no}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 tabular-nums">
                        <span>{formatDateShort(d.licence_expiry)}</span>
                        {d.licence_expired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Expired
                          </span>
                        )}
                        {!d.licence_expired && d.licence_expiring_soon && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Expiring &lt;30d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={d.is_active ? 'Available' : 'Inactive'} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(d.id);
                          setForm({
                            name: d.name,
                            phone: d.phone,
                            photo_url: d.photo_url || '',
                            licence_no: d.licence_no,
                            licence_expiry: d.licence_expiry,
                            is_active: d.is_active,
                          });
                          setShowForm(true);
                        }}
                        className="text-xs font-semibold text-[#0F766E] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">{editingId ? 'Edit Driver' : 'Add Driver'}</h2>
            <input required placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            <input required placeholder="Mobile Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            <input required placeholder="Driving Licence Number" value={form.licence_no} onChange={(e) => setForm({ ...form, licence_no: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-mono" />
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Licence Expiry Date</label>
              <input type="date" required value={form.licence_expiry} onChange={(e) => setForm({ ...form, licence_expiry: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums" />
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span>Driver Active for Trip Assignments</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-full bg-[#0F766E] text-white text-xs font-semibold">Save Driver</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

// ==========================================
// 2. CUSTOMERS DIRECTORY
// ==========================================
export function AdminCustomersPage() {
  const { adminFetch } = useAuth();
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; mobile: string; email: string | null; booking_count: number; total_spend: number }>>([]);
  const [selected, setSelected] = useState<{ name: string; bookings: BookingRecord[] } | null>(null);

  useEffect(() => {
    adminFetch('/api/admin/customers')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomers);
  }, [adminFetch]);

  const openHistory = async (id: string) => {
    const res = await adminFetch(`/api/admin/customers/${id}`);
    if (res.ok) setSelected(await res.json());
  };

  return (
    <AdminLayout title="Customers Directory">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium text-right">Trips</th>
                <th className="px-4 py-3 font-medium text-right">Total Quoted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {customers.map((c) => (
                <tr key={c.id} onClick={() => openHistory(c.id)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-[#0F172A]">{c.name}</div>
                    <div className="text-xs text-[#64748B]">{c.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-xs">{c.mobile}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-medium">{c.booking_count}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold">{formatINR(c.total_spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="font-display text-base font-bold mb-4">
            {selected ? `${selected.name} — Booking History` : 'Select a customer to view history'}
          </h2>
          {selected && (
            <div className="space-y-3">
              {selected.bookings.map((b) => (
                <Link
                  key={b.id}
                  to={`/admin/bookings/${b.id}`}
                  className="block p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#0F766E]"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs font-semibold text-[#0F766E]">{b.reference_id}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-sm font-medium">{b.destination}</div>
                  <div className="text-xs text-[#64748B] tabular-nums mt-1">
                    {formatDateShort(b.travel_date)} · {formatINR(b.total_amount)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ==========================================
// 3. PRICING RULES
// ==========================================
export function AdminPricingPage() {
  const { adminFetch } = useAuth();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Outstation' as PricingRule['category'],
    per_km_rate: 22,
    min_km_per_day: 250,
    driver_allowance: 600,
    night_charge: 400,
    waiting_charge_per_hr: 200,
    extra_km_charge: 22,
    seasonal_multiplier: 1.0,
    is_active: true,
  });

  const load = useCallback(async () => {
    const res = await adminFetch('/api/admin/pricing');
    if (res.ok) setRules(await res.json());
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/pricing', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) {
      setShowNew(false);
      load();
    }
  };

  return (
    <AdminLayout title="Pricing Rules & Tariffs">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[#475569]">Configure local, outstation, night, waiting, and seasonal tariff rules.</p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#F97316] text-white text-xs font-semibold px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tariff Rule</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {rules.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0F766E]">{r.category}</span>
                <StatusBadge status={r.is_active ? 'Available' : 'Inactive'} />
              </div>
              <h3 className="font-display font-bold text-[#0F172A]">{r.name}</h3>
              <div className="space-y-1.5 text-xs text-[#475569] tabular-nums pt-2 border-t border-[#E2E8F0]">
                <div className="flex justify-between"><span>Per-Km Rate</span><strong>{formatINR(r.per_km_rate)}</strong></div>
                <div className="flex justify-between"><span>Minimum Km / Day</span><strong>{r.min_km_per_day} km</strong></div>
                <div className="flex justify-between"><span>Driver Allowance</span><strong>{formatINR(r.driver_allowance)}/day</strong></div>
                <div className="flex justify-between"><span>Night Charge</span><strong>{formatINR(r.night_charge)}</strong></div>
                <div className="flex justify-between"><span>Waiting Charge</span><strong>{formatINR(r.waiting_charge_per_hr)}/hr</strong></div>
                <div className="flex justify-between"><span>Extra Km Charge</span><strong>{formatINR(r.extra_km_charge)}</strong></div>
                <div className="flex justify-between"><span>Seasonal Multiplier</span><strong>{r.seasonal_multiplier}×</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-6 space-y-3">
            <h2 className="font-display text-lg font-bold">New Pricing Rule</h2>
            <input required placeholder="Rule Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PricingRule['category'] })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white">
              <option value="Local">Local</option>
              <option value="Outstation">Outstation</option>
              <option value="Seasonal">Seasonal</option>
              <option value="Add-on">Add-on</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-[#64748B]">Per Km (₹)</label><input type="number" value={form.per_km_rate} onChange={(e) => setForm({ ...form, per_km_rate: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm tabular-nums" /></div>
              <div><label className="text-[11px] text-[#64748B]">Min Km/Day</label><input type="number" value={form.min_km_per_day} onChange={(e) => setForm({ ...form, min_km_per_day: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm tabular-nums" /></div>
              <div><label className="text-[11px] text-[#64748B]">Driver Allowance</label><input type="number" value={form.driver_allowance} onChange={(e) => setForm({ ...form, driver_allowance: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm tabular-nums" /></div>
              <div><label className="text-[11px] text-[#64748B]">Night Charge</label><input type="number" value={form.night_charge} onChange={(e) => setForm({ ...form, night_charge: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm tabular-nums" /></div>
              <div><label className="text-[11px] text-[#64748B]">Waiting / Hr</label><input type="number" value={form.waiting_charge_per_hr} onChange={(e) => setForm({ ...form, waiting_charge_per_hr: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm tabular-nums" /></div>
              <div><label className="text-[11px] text-[#64748B]">Multiplier</label><input type="number" step="0.05" value={form.seasonal_multiplier} onChange={(e) => setForm({ ...form, seasonal_multiplier: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm tabular-nums" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-full bg-[#0F766E] text-white text-xs font-semibold">Save Rule</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

// ==========================================
// 4. PAYMENTS LEDGER
// ==========================================
export function AdminPaymentsPage() {
  const { adminFetch } = useAuth();
  const [payments, setPayments] = useState<Array<{ id: string; booking_id: string; reference_id: string; customer_name: string; amount: number; payment_type: string; method: string; payment_date: string; transaction_ref: string }>>([]);

  useEffect(() => {
    adminFetch('/api/admin/payments')
      .then((r) => (r.ok ? r.json() : []))
      .then(setPayments);
  }, [adminFetch]);

  return (
    <AdminLayout title="Payments Ledger">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Booking Ref</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Txn Ref</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3.5 tabular-nums text-xs">{formatDateShort(p.payment_date)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs">
                    <Link to={`/admin/bookings/${p.booking_id}`} className="text-[#0F766E] font-semibold hover:underline">
                      {p.reference_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{p.customer_name}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={p.payment_type === 'Refund' ? 'Refunded' : 'Paid'} /></td>
                  <td className="px-4 py-3.5 text-xs">{p.method}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#64748B]">{p.transaction_ref || '—'}</td>
                  <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                    {p.payment_type === 'Refund' ? `-${formatINR(p.amount)}` : formatINR(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

// ==========================================
// 5. AVAILABILITY CALENDAR
// ==========================================
export function AdminCalendarPage() {
  const { adminFetch } = useAuth();
  const [vehicles, setVehicles] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [bookings, setBookings] = useState<Array<{ id: string; reference_id: string; vehicle_id: string; travel_date: string; return_date: string; status: string; customer_name: string }>>([]);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    adminFetch('/api/admin/calendar')
      .then((r) => (r.ok ? r.json() : { vehicles: [], bookings: [] }))
      .then((d) => {
        setVehicles(d.vehicles || []);
        setBookings(d.bookings || []);
      });
  }, [adminFetch]);

  const { year, monthIndex, label, days } = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const y = target.getFullYear();
    const m = target.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const arr = Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      const mm = String(m + 1).padStart(2, '0');
      return { day: i + 1, iso: `${y}-${mm}-${d}` };
    });
    return {
      year: y,
      monthIndex: m,
      label: target.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      days: arr,
    };
  }, [monthOffset]);

  return (
    <AdminLayout title="Vehicle Availability Calendar">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMonthOffset((v) => v - 1)} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-display font-bold text-base min-w-[160px] text-center" data-year={year} data-month={monthIndex}>
              {label}
            </h2>
            <button type="button" onClick={() => setMonthOffset((v) => v + 1)} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-slate-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#475569]">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0F766E] inline-block" /> Confirmed / Active</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-300 inline-block" /> Pending / Contacted</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="sticky left-0 bg-[#F8FAFC] z-10 px-4 py-3 text-left font-semibold min-w-[200px] border-r border-[#E2E8F0]">
                  Vehicle
                </th>
                {days.map((d) => (
                  <th key={d.iso} className="px-1.5 py-3 text-center font-mono font-medium text-[#64748B] min-w-[32px]">
                    {d.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {vehicles.map((v) => {
                const vBookings = bookings.filter((b) => b.vehicle_id === v.id);
                return (
                  <tr key={v.id}>
                    <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-[#0F172A] border-r border-[#E2E8F0]">
                      {v.name}
                    </td>
                    {days.map((d) => {
                      const match = vBookings.find((b) => b.travel_date <= d.iso && b.return_date >= d.iso);
                      const isConfirmed = match && ['Confirmed', 'Vehicle Assigned', 'In Progress'].includes(match.status);
                      return (
                        <td key={d.iso} className="p-0.5 text-center border-r border-slate-100">
                          {match ? (
                            <Link
                              to={`/admin/bookings/${match.id}`}
                              title={`${match.reference_id} · ${match.customer_name} (${match.status})`}
                              className={`block w-full h-7 rounded ${
                                isConfirmed ? 'bg-[#0F766E] text-white' : 'bg-amber-200 text-amber-900'
                              } leading-7 text-[10px] font-mono`}
                            >
                              •
                            </Link>
                          ) : (
                            <div className="w-full h-7" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
