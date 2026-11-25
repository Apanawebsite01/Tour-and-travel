import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Printer } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import type { BookingRecord, DriverRecord, Vehicle } from '../../types';
import { formatDateShort, formatINR } from '../../utils/format';

interface BookingDetail extends BookingRecord {
  price_per_km?: number;
  daily_rate?: number;
  min_km_per_day?: number;
  driver_allowance?: number;
  package_days?: number;
  payments: Array<{
    id: string;
    amount: number;
    payment_type: string;
    method: string;
    payment_date: string;
    transaction_ref: string;
  }>;
  history: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    note: string;
    changed_at: string;
  }>;
  conflicts: Array<{
    id: string;
    reference_id: string;
    travel_date: string;
    return_date: string;
    status: string;
  }>;
  availableDrivers: DriverRecord[];
  allowedNextStatuses: string[];
}

export function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { adminFetch } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [adminNotes, setAdminNotes] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<'Advance' | 'Balance' | 'Full' | 'Refund'>('Advance');
  const [payMethod, setPayMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Card'>('UPI');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bRes, vRes] = await Promise.all([
      adminFetch(`/api/admin/bookings/${id}`),
      adminFetch('/api/admin/vehicles'),
    ]);
    if (bRes.ok) {
      const bData: BookingDetail = await bRes.json();
      setBooking(bData);
      setSelectedVehicleId(bData.vehicle_id || '');
      setSelectedDriverId(bData.driver_id || '');
      setTotalAmount(bData.total_amount);
      setAdminNotes(bData.admin_notes || '');
    }
    if (vRes.ok) {
      setVehicles(await vRes.json());
    }
    setLoading(false);
  }, [adminFetch, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (nextStatus: string) => {
    setError(null);
    setSuccessMsg(null);
    const res = await adminFetch(`/api/admin/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        new_status: nextStatus,
        note: statusNote,
        vehicle_id: selectedVehicleId || null,
        driver_id: selectedDriverId || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not update booking status');
      return;
    }
    setStatusNote('');
    setSuccessMsg(`Booking moved to "${nextStatus}".`);
    await loadData();
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const res = await adminFetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        total_amount: Number(totalAmount),
        admin_notes: adminNotes,
        vehicle_id: selectedVehicleId || null,
        driver_id: selectedDriverId || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not save quotation');
      return;
    }
    setSuccessMsg('Quotation & assignments saved.');
    await loadData();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const res = await adminFetch('/api/admin/payments', {
      method: 'POST',
      body: JSON.stringify({
        booking_id: id,
        amount: Number(payAmount),
        payment_type: payType,
        method: payMethod,
        payment_date: payDate,
        transaction_ref: payRef,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Failed to record payment');
      return;
    }
    setPayAmount('');
    setPayRef('');
    setSuccessMsg('Payment recorded successfully.');
    await loadData();
  };

  if (loading) {
    return (
      <AdminLayout title="Booking Detail">
        <div className="p-8 text-sm text-[#64748B]">Loading booking dossier...</div>
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout title="Booking Not Found">
        <Link to="/admin/bookings" className="text-[#0F766E] font-semibold">
          ← Back to Bookings
        </Link>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Booking ${booking.reference_id}`}>
      <div className="space-y-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/bookings" className="inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#0F766E]">
            <ArrowLeft className="w-4 h-4" />
            <span>All Bookings</span>
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:border-[#0F766E]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>

        {error && (
          <div className="no-print p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            {successMsg}
          </div>
        )}

        {booking.conflicts.length > 0 && (
          <div className="no-print p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <strong>Overlap Conflict Detected:</strong> This vehicle already has confirmed booking{' '}
              {booking.conflicts.map((c) => `${c.reference_id} (${c.travel_date} to ${c.return_date})`).join(', ')}.
              Assign an alternate vehicle before confirming.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 columns: Summary + Quotation & Assignment + Payments */}
          <div className="lg:col-span-7 space-y-6">
            {/* Printable Invoice Header */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="font-mono text-sm font-bold text-[#0F766E]">{booking.reference_id}</div>
                  <h2 className="font-display text-xl font-bold text-[#0F172A] mt-0.5">
                    {booking.package_name || booking.vehicle_name || booking.destination}
                  </h2>
                  <p className="text-xs text-[#64748B] capitalize">{booking.booking_type} Booking · {booking.driver_preference}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={booking.payment_status || 'Unpaid'} />
                  <StatusBadge status={booking.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-sm">
                <div>
                  <div className="text-xs text-[#64748B]">Customer</div>
                  <div className="font-semibold">{booking.customer_name}</div>
                  <div className="text-xs text-[#475569] tabular-nums">{booking.customer_mobile}</div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Pickup &amp; Route</div>
                  <div className="font-medium">{booking.pickup_location}</div>
                  <div className="text-xs text-[#475569]">→ {booking.destination}</div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Schedule</div>
                  <div className="font-medium tabular-nums">
                    {formatDateShort(booking.travel_date)} – {formatDateShort(booking.return_date)}
                  </div>
                  <div className="text-xs text-[#475569] tabular-nums">
                    Pickup {booking.pickup_time} · {booking.passengers} Guests
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-xs text-[#475569]">
                  <strong>Customer Notes:</strong> {booking.notes}
                </div>
              )}
            </div>

            {/* Quotation & Fleet/Driver Assignment */}
            <form onSubmit={handleSaveDetails} className="no-print bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-[#0F172A]">Quotation &amp; Resource Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Assigned Vehicle</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white"
                  >
                    <option value="">-- Unassigned --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registration_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Assigned Driver {booking.driver_preference === 'Self-Drive' ? '(Not required for Self-Drive)' : ''}
                  </label>
                  <select
                    disabled={booking.driver_preference === 'Self-Drive'}
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white disabled:bg-slate-100"
                  >
                    <option value="">-- Select Available Driver --</option>
                    {booking.availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Total Quoted Amount (INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Internal Admin Notes</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Permit status, toll notes..."
                    className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold"
              >
                Save Quotation &amp; Assignment
              </button>
            </form>

            {/* Payments Ledger */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#0F172A]">Payments &amp; Balance</h3>
                <div className="text-xs space-x-3 tabular-nums">
                  <span>Paid: <strong className="text-[#16A34A]">{formatINR(booking.paid || 0)}</strong></span>
                  <span>Balance: <strong className="text-[#F97316]">{formatINR(booking.balance || 0)}</strong></span>
                </div>
              </div>

              {booking.payments.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-left text-[#64748B]">
                      <th className="py-2">Date</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Ref</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {booking.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 tabular-nums">{formatDateShort(p.payment_date)}</td>
                        <td className="py-2">{p.payment_type}</td>
                        <td className="py-2">{p.method}</td>
                        <td className="py-2 font-mono">{p.transaction_ref || '—'}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">{formatINR(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form onSubmit={handleRecordPayment} className="no-print pt-3 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full h-10 px-2.5 rounded-lg border border-[#E2E8F0] text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">Type</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as 'Advance' | 'Balance' | 'Full' | 'Refund')}
                    className="w-full h-10 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white"
                  >
                    <option value="Advance">Advance</option>
                    <option value="Balance">Balance</option>
                    <option value="Full">Full</option>
                    <option value="Refund">Refund</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as 'UPI' | 'Cash' | 'Bank Transfer' | 'Card')}
                    className="w-full h-10 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">Reference</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="UTR / Txn ID"
                    className="w-full h-10 px-2.5 rounded-lg border border-[#E2E8F0] text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold px-3"
                >
                  Record Pay
                </button>
              </form>
            </div>
          </div>

          {/* Right 5 columns: State Machine Actions + Audit History */}
          <div className="no-print lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-[#0F172A]">Workflow Status Transition</h3>
              <p className="text-xs text-[#64748B]">
                Current status: <strong>{booking.status}</strong>. Confirming runs a database overlap check for the assigned vehicle.
              </p>

              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Optional note for status log..."
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm"
              />

              {booking.allowedNextStatuses.length === 0 ? (
                <div className="text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  This booking is in a terminal state ({booking.status}).
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {booking.allowedNextStatuses.map((next) => {
                    const isDanger = next === 'Rejected' || next === 'Cancelled';
                    return (
                      <button
                        key={next}
                        type="button"
                        onClick={() => handleStatusChange(next)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                          isDanger
                            ? 'border border-red-200 text-red-700 hover:bg-red-50'
                            : 'bg-[#0F766E] hover:bg-[#115E59] text-white'
                        }`}
                      >
                        Mark as {next}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h3 className="font-display text-base font-bold text-[#0F172A] mb-4">Status Audit Trail</h3>
              <div className="space-y-4">
                {booking.history.map((h) => (
                  <div key={h.id} className="pb-3 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <StatusBadge status={h.new_status} />
                      <span className="text-[11px] text-[#64748B] tabular-nums">{h.changed_at}</span>
                    </div>
                    <p className="text-xs text-[#475569]">{h.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
