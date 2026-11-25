import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import type { BookingRecord } from '../../types';
import { formatDateShort, formatINR } from '../../utils/format';

const STATUS_TABS = [
  'All',
  'Pending',
  'Contacted',
  'Confirmed',
  'Vehicle Assigned',
  'In Progress',
  'Completed',
  'Cancelled',
];

export function AdminBookingsPage() {
  const { adminFetch } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    const res = await adminFetch(`/api/admin/bookings?${params.toString()}`);
    if (res.ok) {
      setBookings(await res.json());
    }
    setLoading(false);
  }, [adminFetch, statusFilter, search]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return (
    <AdminLayout title="Booking Management">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference ID, customer, mobile, destination..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-[#64748B]">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#64748B]">No bookings match the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Trip / Dates</th>
                    <th className="px-4 py-3 font-medium">Vehicle / Driver</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-center">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <Link to={`/admin/bookings/${b.id}`} className="font-semibold text-[#0F766E] hover:underline">
                          {b.reference_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#0F172A]">{b.customer_name}</div>
                        <div className="text-xs text-[#64748B] tabular-nums">{b.customer_mobile}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#0F172A]">{b.destination}</div>
                        <div className="text-xs text-[#64748B] tabular-nums">
                          {formatDateShort(b.travel_date)} → {formatDateShort(b.return_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="text-[#0F172A] font-medium">{b.vehicle_name || 'Not assigned'}</div>
                        <div className="text-[#64748B]">
                          {b.driver_preference === 'Self-Drive' ? 'Self-Drive' : b.driver_name || 'Driver pending'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                        {formatINR(b.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={b.payment_status || 'Unpaid'} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link to={`/admin/bookings/${b.id}`}>
                          <StatusBadge status={b.status} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
