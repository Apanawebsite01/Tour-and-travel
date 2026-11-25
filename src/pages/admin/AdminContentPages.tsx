import React, { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Download, Plus, Trash2, Upload } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SafeImage } from '../../components/ui/SafeImage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import type { FaqItem, GalleryItem, ReviewItem, SiteSettings } from '../../types';
import { formatINR } from '../../utils/format';

// ==========================================
// 1. GALLERY MANAGEMENT
// ==========================================
export function AdminGalleryPage() {
  const { adminFetch } = useAuth();
  const { refresh: refreshPublic } = useSite();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');

  const load = useCallback(async () => {
    const res = await adminFetch('/api/admin/gallery');
    if (res.ok) setItems(await res.json());
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, mimeType: file.type, dataBase64: String(reader.result) }),
      });
      if (res.ok) {
        const j = await res.json();
        setImageUrl(j.url);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/gallery', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl, caption, location, sort_order: items.length + 1 }),
    });
    if (res.ok) {
      setImageUrl('');
      setCaption('');
      setLocation('');
      await load();
      await refreshPublic();
    }
  };

  const handleDelete = async (id: string) => {
    await adminFetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    await load();
    await refreshPublic();
  };

  return (
    <AdminLayout title="Travel Gallery Management">
      <div className="space-y-6">
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold mb-1">Image URL or Upload</label>
            <div className="flex gap-2">
              <input required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/src/assets/..." className="flex-1 h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
              <label className="inline-flex items-center px-3 rounded-xl border border-[#E2E8F0] text-xs cursor-pointer hover:bg-slate-50">
                <Upload className="w-3.5 h-3.5" />
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold mb-1">Caption</label>
            <input required value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Evening convoy in Nubra Valley" className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Location</label>
            <input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ladakh" className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full h-10 rounded-full bg-[#0F766E] text-white text-xs font-semibold">
              Add Photo
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100">
                <SafeImage src={g.image_url} alt={g.caption} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0F766E]">{g.location}</div>
                  <div className="text-sm truncate">{g.caption}</div>
                </div>
                <button type="button" onClick={() => handleDelete(g.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// ==========================================
// 2. REVIEWS MODERATION
// ==========================================
export function AdminReviewsPage() {
  const { adminFetch } = useAuth();
  const { refresh: refreshPublic } = useSite();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const load = useCallback(async () => {
    const res = await adminFetch('/api/admin/reviews');
    if (res.ok) setReviews(await res.json());
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleApprove = async (r: ReviewItem) => {
    await adminFetch(`/api/admin/reviews/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_approved: !r.is_approved }),
    });
    await load();
    await refreshPublic();
  };

  const remove = async (id: string) => {
    await adminFetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    await load();
    await refreshPublic();
  };

  return (
    <AdminLayout title="Customer Reviews Moderation">
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#0F172A]">{r.customer_name}</span>
                <span className="text-xs text-[#64748B]">{r.location} · {r.trip_type} · {r.rating}/5 ★</span>
                <StatusBadge status={r.is_approved ? 'Published' : 'Pending'} />
              </div>
              <p className="text-sm text-[#475569]">{r.comment}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleApprove(r)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#0F766E] text-white text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{r.is_approved ? 'Hide' : 'Approve'}</span>
              </button>
              <button type="button" onClick={() => remove(r.id)} className="px-3 py-2 rounded-full border border-red-200 text-red-600 text-xs font-semibold">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

// ==========================================
// 3. WEBSITE CONTENT MANAGEMENT
// ==========================================
export function AdminWebsitePage() {
  const { adminFetch } = useAuth();
  const { refresh: refreshPublic } = useSite();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sRes, fRes] = await Promise.all([adminFetch('/api/admin/settings'), adminFetch('/api/admin/faqs')]);
    if (sRes.ok) setSettings(await sRes.json());
    if (fRes.ok) setFaqs(await fRes.json());
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavedMsg(null);
    const res = await adminFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
    if (res.ok) {
      setSavedMsg('Website content updated live.');
      await refreshPublic();
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/faqs', {
      method: 'POST',
      body: JSON.stringify({ question: newFaqQ, answer: newFaqA, sort_order: faqs.length + 1, is_active: true }),
    });
    if (res.ok) {
      setNewFaqQ('');
      setNewFaqA('');
      await load();
      await refreshPublic();
    }
  };

  if (!settings) return <AdminLayout title="Website Content Management"><div className="p-8 text-sm">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Website Content Management">
      <div className="space-y-8">
        {savedMsg && <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{savedMsg}</div>}

        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold">Brand, Hero, Contact &amp; Legal Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Business Name</label>
              <input value={settings.business_name} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tagline</label>
              <input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Hero Headline</label>
              <input value={settings.hero_headline} onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Hero Subheadline</label>
              <textarea rows={2} value={settings.hero_subheadline} onChange={(e) => setSettings({ ...settings, hero_subheadline: e.target.value })} className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone</label>
              <input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">WhatsApp Number (digits with country code)</label>
              <input value={settings.whatsapp_number} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Contact Email</label>
              <input value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Operating Hubs</label>
              <input value={settings.operating_area} onChange={(e) => setSettings({ ...settings, operating_area: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">About Us Content</label>
              <textarea rows={3} value={settings.about_description} onChange={(e) => setSettings({ ...settings, about_description: e.target.value })} className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Cancellation Policy</label>
              <textarea
                rows={2}
                value={settings.policies?.cancellation || ''}
                onChange={(e) => setSettings({ ...settings, policies: { ...settings.policies, cancellation: e.target.value } })}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm"
              />
            </div>
          </div>
          <button type="submit" className="px-6 py-2.5 rounded-full bg-[#0F766E] text-white text-xs font-semibold">
            Publish Website Changes
          </button>
        </form>

        {/* FAQs Editor */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">Manage FAQs</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm">{f.question}</div>
                  <div className="text-xs text-[#475569] mt-1">{f.answer}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await adminFetch(`/api/admin/faqs/${f.id}`, { method: 'DELETE' });
                    await load();
                    await refreshPublic();
                  }}
                  className="text-red-600 text-xs font-semibold shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddFaq} className="pt-3 border-t border-[#E2E8F0] space-y-3">
            <input required value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="New FAQ question..." className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm" />
            <textarea required rows={2} value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="Answer..." className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm" />
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F97316] text-white text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

// ==========================================
// 4. REPORTS & ANALYTICS
// ==========================================
export function AdminReportsPage() {
  const { adminFetch } = useAuth();
  const [report, setReport] = useState<{
    byStatus: Array<{ status: string; count: number; amount: number }>;
    topVehicles: Array<{ id: string; name: string; brand: string; trips: number; revenue: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number; transactions: number }>;
  } | null>(null);

  useEffect(() => {
    adminFetch('/api/admin/reports')
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport);
  }, [adminFetch]);

  const downloadCsv = () => {
    if (!report) return;
    const rows = [
      ['Vehicle', 'Brand', 'Trips', 'Quoted Revenue (INR)'],
      ...report.topVehicles.map((v) => [v.name, v.brand, String(v.trips), String(v.revenue)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travelgo-fleet-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Business Reports & Revenue">
      {!report ? (
        <div className="p-8 text-sm text-[#64748B]">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold hover:border-[#0F766E]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Fleet CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-display text-base font-bold mb-4">Monthly Collected Revenue</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(val) => formatINR(Number(val ?? 0))} />
                    <Bar dataKey="revenue" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-display text-base font-bold mb-4">Bookings by Status</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Count</th>
                    <th className="py-2 text-right">Quoted Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {report.byStatus.map((s) => (
                    <tr key={s.status}>
                      <td className="py-2.5"><StatusBadge status={s.status} /></td>
                      <td className="py-2.5 text-right tabular-nums font-medium">{s.count}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold">{formatINR(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <h2 className="font-display text-base font-bold mb-4">Top Performing Fleet Vehicles</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
                  <th className="py-2">Vehicle</th>
                  <th className="py-2">Brand</th>
                  <th className="py-2 text-right">Active / Completed Trips</th>
                  <th className="py-2 text-right">Total Quoted Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {report.topVehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3 font-semibold">{v.name}</td>
                    <td className="py-3 text-[#64748B]">{v.brand}</td>
                    <td className="py-3 text-right tabular-nums">{v.trips}</td>
                    <td className="py-3 text-right tabular-nums font-semibold text-[#0F766E]">{formatINR(v.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
