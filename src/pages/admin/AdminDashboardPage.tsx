import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { formatDateShort, formatINR } from '../../utils/format';

interface DashboardData {
  stats: {
    totalVehicles: number;
    availableVehicles: number;
    unavailableVehicles: number;
    pendingRequests: number;
    confirmedBookings: number;
    completedTrips: number;
    totalBookings: number;
    totalRevenue: number;
  };
  upcomingTrips: Array<{
    id: string;
    reference_id: string;
    travel_date: string;
    return_date: string;
    destination: string;
    status: string;
    customer_name: string;
    vehicle_name: string | null;
    driver_name: string | null;
  }>;
  recentEnquiries: Array<{
    id: string;
    reference_id: string;
    booking_type: string;
    destination: string;
    travel_date: string;
    status: string;
    total_amount: number;
    customer_name: string;
    customer_mobile: string;
    vehicle_name: string | null;
    package_name: string | null;
  }>;
  monthlyBookings: Array<{ month: string; bookings: number; value: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
}

export function AdminDashboardPage() {
  const { adminFetch } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [adminFetch]);

  return (
    <AdminLayout title="Operations Dashboard">
      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="text-xs font-medium text-[#64748B] mb-1">Total Fleet Vehicles</div>
              <div className="font-display text-2xl font-bold text-[#0F172A] tabular-nums">
                {data.stats.totalVehicles}
              </div>
              <div className="text-xs text-[#0F766E] mt-1 tabular-nums">
                {data.stats.availableVehicles} Available · {data.stats.unavailableVehicles} Maintenance/Busy
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="text-xs font-medium text-[#64748B] mb-1">Pending Requests</div>
              <div className="font-display text-2xl font-bold text-[#F97316] tabular-nums">
                {data.stats.pendingRequests}
              </div>
              <div className="text-xs text-[#64748B] mt-1">Awaiting verification &amp; quote</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="text-xs font-medium text-[#64748B] mb-1">Confirmed &amp; Active Trips</div>
              <div className="font-display text-2xl font-bold text-[#0F766E] tabular-nums">
                {data.stats.confirmedBookings}
              </div>
              <div className="text-xs text-[#64748B] mt-1 tabular-nums">
                {data.stats.completedTrips} Completed total
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="text-xs font-medium text-[#64748B] mb-1">Recorded Revenue</div>
              <div className="font-display text-2xl font-bold text-[#0F172A] tabular-nums">
                {formatINR(data.stats.totalRevenue)}
              </div>
              <div className="text-xs text-[#16A34A] mt-1">Net collected payments</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-display text-base font-semibold text-[#0F172A] mb-4">Monthly Bookings Volume</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyBookings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-display text-base font-semibold text-[#0F172A] mb-4">Monthly Collected Revenue (INR)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip formatter={(val) => formatINR(Number(val ?? 0))} />
                    <Area type="monotone" dataKey="revenue" stroke="#F97316" fill="#FFEDD5" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Upcoming Trips & Recent Enquiries */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-semibold text-[#0F172A]">Upcoming Confirmed Trips</h2>
                <Link to="/admin/calendar" className="text-xs font-semibold text-[#0F766E] hover:underline">
                  Calendar View
                </Link>
              </div>
              {data.upcomingTrips.length === 0 ? (
                <p className="text-sm text-[#64748B]">No upcoming confirmed departures scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingTrips.map((t) => (
                    <Link
                      key={t.id}
                      to={`/admin/bookings/${t.id}`}
                      className="block p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#0F766E] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-[#0F766E]">{t.reference_id}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="font-medium text-sm text-[#0F172A]">{t.customer_name} · {t.destination}</div>
                      <div className="text-xs text-[#64748B] mt-1 tabular-nums">
                        {formatDateShort(t.travel_date)} → {formatDateShort(t.return_date)} · {t.vehicle_name || 'Unassigned'}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-semibold text-[#0F172A]">Recent Enquiries &amp; Bookings</h2>
                <Link to="/admin/bookings" className="text-xs font-semibold text-[#0F766E] hover:underline">
                  Manage All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
                      <th className="pb-2.5 font-medium">Reference</th>
                      <th className="pb-2.5 font-medium">Customer</th>
                      <th className="pb-2.5 font-medium">Trip / Selection</th>
                      <th className="pb-2.5 font-medium text-right">Amount</th>
                      <th className="pb-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {data.recentEnquiries.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-xs">
                          <Link to={`/admin/bookings/${b.id}`} className="text-[#0F766E] font-semibold hover:underline">
                            {b.reference_id}
                          </Link>
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-[#0F172A]">{b.customer_name}</div>
                          <div className="text-xs text-[#64748B] tabular-nums">{b.customer_mobile}</div>
                        </td>
                        <td className="py-3 text-xs text-[#475569]">
                          <div>{b.package_name || b.vehicle_name || b.destination}</div>
                          <div className="text-[#64748B] tabular-nums">{formatDateShort(b.travel_date)}</div>
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums">{formatINR(b.total_amount)}</td>
                        <td className="py-3 text-right">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
