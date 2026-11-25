import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { getStore, saveStore } from '../store.ts';
import { getUploadsDir } from '../paths.ts';
import {
  type AuthenticatedRequest,
  constantTimeEqualStr,
  getAdminProfile,
  getEnvAdminPassword,
  hashPassword,
  requireAdmin,
  signAdminToken,
  upsertAdminProfile,
  verifyPassword,
} from '../auth.ts';

export const adminRouter = Router();

const ACTIVE_STATUSES = ['Confirmed', 'Vehicle Assigned', 'In Progress'] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Contacted', 'Rejected', 'Cancelled'],
  Contacted: ['Confirmed', 'Rejected', 'Cancelled'],
  Confirmed: ['Vehicle Assigned', 'Cancelled'],
  'Vehicle Assigned': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed'],
  Completed: [],
  Rejected: [],
  Cancelled: [],
};

function computePaymentSummaryFromRows(
  rows: Array<{ amount: number; payment_type: string }>,
  totalAmount: number
) {
  let paid = 0;
  let refunded = 0;
  for (const r of rows) {
    if (r.payment_type === 'Refund') {
      refunded += Number(r.amount || 0);
    } else {
      paid += Number(r.amount || 0);
    }
  }
  const netPaid = Math.max(0, paid - refunded);
  let paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Refunded' = 'Unpaid';
  if (refunded > 0 && netPaid === 0) {
    paymentStatus = 'Refunded';
  } else if (totalAmount > 0 && netPaid >= totalAmount) {
    paymentStatus = 'Paid';
  } else if (netPaid > 0) {
    paymentStatus = 'Partially Paid';
  }
  const balance = Math.max(0, totalAmount - netPaid);
  return { paid: netPaid, refunded, balance, payment_status: paymentStatus };
}

function computePaymentSummary(bookingId: string, totalAmount: number) {
  const store = getStore();
  const rows = store.payments.filter((p) => p.booking_id === bookingId);
  return computePaymentSummaryFromRows(rows, totalAmount);
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
adminRouter.get('/auth/status', async (_req, res) => {
  try {
    const envPass = getEnvAdminPassword();
    const profile = await getAdminProfile();
    const configured = Boolean(envPass) || Boolean(profile?.password_hash);
    res.json({
      configured,
      usingEnv: Boolean(envPass),
      adminEmail: profile?.email || 'admin@travelgo.in',
    });
  } catch (err) {
    console.error('Auth status check failed:', err);
    res.status(500).json({ error: 'Unable to check authentication status' });
  }
});

const bootstrapSchema = z.object({
  full_name: z.string().trim().min(2).max(100).default('TravelGo Admin'),
  email: z.string().trim().email().default('admin@travelgo.in'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

adminRouter.post('/auth/bootstrap', async (req, res) => {
  try {
    const envPass = getEnvAdminPassword();
    if (envPass) {
      res.status(403).json({ error: 'Admin password is already managed by server configuration.' });
      return;
    }
    const existing = await getAdminProfile();
    if (existing && existing.password_hash) {
      res.status(409).json({ error: 'Admin account has already been claimed.' });
      return;
    }

    const parsed = bootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid setup data' });
      return;
    }

    const { full_name, email, password } = parsed.data;
    const saved = upsertAdminProfile({
      id: existing?.id,
      full_name,
      email,
      password_hash: hashPassword(password),
    });

    const token = signAdminToken({ sub: saved.id, email: saved.email, role: 'admin' });
    res.status(201).json({
      token,
      admin: { id: saved.id, full_name: saved.full_name, email: saved.email, role: 'admin' },
    });
  } catch (err) {
    console.error('Admin bootstrap failed:', err);
    res.status(500).json({ error: 'Unable to initialize admin credentials' });
  }
});

const loginSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(1, 'Password is required'),
});

adminRouter.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  try {
    const envPass = getEnvAdminPassword();
    const profile = await getAdminProfile();

    if (envPass) {
      if (!constantTimeEqualStr(parsed.data.password, envPass)) {
        res.status(401).json({ error: 'Invalid admin credentials' });
        return;
      }
      const saved =
        profile ||
        upsertAdminProfile({
          full_name: 'TravelGo Admin',
          email: parsed.data.email || 'admin@travelgo.in',
          password_hash: hashPassword(envPass),
        });
      const token = signAdminToken({ sub: saved.id, email: saved.email, role: 'admin' });
      res.json({
        token,
        admin: { id: saved.id, full_name: saved.full_name, email: saved.email, role: 'admin' },
      });
      return;
    }

    if (!profile || !profile.password_hash) {
      res.status(403).json({ error: 'Admin account not yet initialized. Please claim admin access first.' });
      return;
    }

    if (parsed.data.email && parsed.data.email.toLowerCase() !== profile.email.toLowerCase()) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    if (!verifyPassword(parsed.data.password, profile.password_hash)) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const token = signAdminToken({ sub: profile.id, email: profile.email, role: 'admin' });
    res.json({
      token,
      admin: { id: profile.id, full_name: profile.full_name, email: profile.email, role: 'admin' },
    });
  } catch (err) {
    console.error('Admin login failed:', err);
    res.status(500).json({ error: 'Unable to authenticate right now' });
  }
});

// Protect all routes below
adminRouter.use(requireAdmin);

adminRouter.get('/auth/me', async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getAdminProfile();
    res.json({
      admin: {
        id: req.admin!.sub,
        full_name: profile?.full_name || 'TravelGo Admin',
        email: profile?.email || req.admin!.email,
        role: 'admin',
      },
      usingEnv: Boolean(getEnvAdminPassword()),
    });
  } catch (err) {
    console.error('Auth me failed:', err);
    res.status(500).json({ error: 'Unable to load admin profile' });
  }
});

const updateCredentialsSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional().or(z.literal('')),
});

adminRouter.put('/auth/credentials', async (req: AuthenticatedRequest, res) => {
  const parsed = updateCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials payload' });
    return;
  }

  try {
    const profile = await getAdminProfile();
    const { full_name, email, password } = parsed.data;
    const newHash = password ? hashPassword(password) : profile?.password_hash || null;
    const saved = upsertAdminProfile({
      id: profile?.id || req.admin!.sub,
      full_name,
      email,
      password_hash: newHash,
    });

    const token = signAdminToken({ sub: saved.id, email: saved.email, role: 'admin' });
    res.json({
      token,
      admin: { id: saved.id, full_name: saved.full_name, email: saved.email, role: 'admin' },
      usingEnv: Boolean(getEnvAdminPassword()),
    });
  } catch (err) {
    console.error('Update credentials failed:', err);
    res.status(500).json({ error: 'Unable to update admin credentials' });
  }
});

// ==========================================
// SECURE IMAGE UPLOAD
// ==========================================
const uploadsDir = getUploadsDir();

const uploadSchema = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  dataBase64: z.string().min(10),
});

adminRouter.post('/upload', (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Only JPG, PNG, and WEBP images up to 5 MB are allowed.' });
    return;
  }

  const { mimeType, dataBase64 } = parsed.data;
  const cleanB64 = dataBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanB64, 'base64');

  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: 'Image file size must be between 1 byte and 5 MB.' });
    return;
  }

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const safeName = `${crypto.randomUUID()}.${ext}`;
  const targetPath = path.resolve(uploadsDir, safeName);
  if (!targetPath.startsWith(uploadsDir + path.sep)) {
    res.status(400).json({ error: 'Invalid upload path' });
    return;
  }

  try {
    fs.writeFileSync(targetPath, buffer);
    res.status(201).json({ url: `/uploads/${safeName}` });
  } catch {
    res.status(201).json({ url: `data:${mimeType};base64,${cleanB64}` });
  }
});

// ==========================================
// DASHBOARD & REPORTS
// ==========================================
adminRouter.get('/dashboard', (_req, res) => {
  try {
    const store = getStore();
    const allVehicles = store.vehicles.filter((v) => !v.is_archived);
    const allBookings = [...store.bookings].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const allPayments = store.payments;

    const custMap = new Map(store.customers.map((c) => [c.id, c]));
    const vehMap = new Map(allVehicles.map((v) => [v.id, v]));
    const drvMap = new Map(store.drivers.map((d) => [d.id, d]));
    const pkgMap = new Map(store.tour_packages.map((p) => [p.id, p]));

    let availableVehicles = 0;
    let unavailableVehicles = 0;
    for (const v of allVehicles) {
      if (v.status === 'Available') availableVehicles++;
      else unavailableVehicles++;
    }

    let pendingRequests = 0;
    let confirmedBookings = 0;
    let completedTrips = 0;
    for (const b of allBookings) {
      if (b.status === 'Pending') pendingRequests++;
      else if (['Confirmed', 'Vehicle Assigned', 'In Progress'].includes(b.status)) confirmedBookings++;
      else if (b.status === 'Completed') completedTrips++;
    }

    let collected = 0;
    let refunded = 0;
    const revByMonth = new Map<string, number>();
    for (const p of allPayments) {
      const amt = Number(p.amount || 0);
      if (p.payment_type === 'Refund') refunded += amt;
      else collected += amt;

      const m = p.payment_date.slice(0, 7);
      revByMonth.set(m, (revByMonth.get(m) || 0) + (p.payment_type === 'Refund' ? -amt : amt));
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const upcomingTrips = allBookings
      .filter((b) => b.travel_date >= todayStr && ['Confirmed', 'Vehicle Assigned', 'In Progress'].includes(b.status))
      .sort((a, b) => a.travel_date.localeCompare(b.travel_date))
      .slice(0, 6)
      .map((b) => ({
        id: b.id,
        reference_id: b.reference_id,
        travel_date: b.travel_date,
        return_date: b.return_date,
        destination: b.destination,
        status: b.status,
        customer_name: custMap.get(b.customer_id)?.name || 'Guest',
        vehicle_name: b.vehicle_id ? vehMap.get(b.vehicle_id)?.name || null : null,
        driver_name: b.driver_id ? drvMap.get(b.driver_id)?.name || null : null,
      }));

    const recentEnquiries = allBookings.slice(0, 8).map((b) => ({
      id: b.id,
      reference_id: b.reference_id,
      booking_type: b.booking_type,
      destination: b.destination,
      travel_date: b.travel_date,
      status: b.status,
      total_amount: b.total_amount,
      created_at: b.created_at,
      customer_name: custMap.get(b.customer_id)?.name || 'Guest',
      customer_mobile: custMap.get(b.customer_id)?.mobile || '',
      vehicle_name: b.vehicle_id ? vehMap.get(b.vehicle_id)?.name || null : null,
      package_name: b.package_id ? pkgMap.get(b.package_id)?.name || null : null,
    }));

    const bookingsByMonthMap = new Map<string, { bookings: number; value: number }>();
    for (const b of allBookings) {
      const m = b.travel_date.slice(0, 7);
      const cur = bookingsByMonthMap.get(m) || { bookings: 0, value: 0 };
      cur.bookings += 1;
      cur.value += Number(b.total_amount || 0);
      bookingsByMonthMap.set(m, cur);
    }

    const monthlyBookings = Array.from(bookingsByMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12)
      .map(([month, v]) => ({ month, bookings: v.bookings, value: v.value }));

    const monthlyRevenue = Array.from(revByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12)
      .map(([month, revenue]) => ({ month, revenue }));

    res.json({
      stats: {
        totalVehicles: allVehicles.length,
        availableVehicles,
        unavailableVehicles,
        pendingRequests,
        confirmedBookings,
        completedTrips,
        totalBookings: allBookings.length,
        totalRevenue: Math.max(0, collected - refunded),
      },
      upcomingTrips,
      recentEnquiries,
      monthlyBookings,
      monthlyRevenue,
    });
  } catch (err) {
    console.error('Dashboard fetch failed:', err);
    res.status(500).json({ error: 'Unable to load dashboard analytics' });
  }
});

adminRouter.get('/reports', (_req, res) => {
  try {
    const store = getStore();
    const allBookings = store.bookings;
    const allVehicles = store.vehicles.filter((v) => !v.is_archived);
    const allPayments = store.payments;

    const statusMap = new Map<string, { count: number; amount: number }>();
    for (const b of allBookings) {
      const cur = statusMap.get(b.status) || { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += Number(b.total_amount || 0);
      statusMap.set(b.status, cur);
    }
    const byStatus = Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v }));

    const vehTotals = new Map<string, { trips: number; revenue: number }>();
    for (const b of allBookings) {
      if (!b.vehicle_id || b.status === 'Rejected' || b.status === 'Cancelled') continue;
      const cur = vehTotals.get(b.vehicle_id) || { trips: 0, revenue: 0 };
      cur.trips += 1;
      cur.revenue += Number(b.total_amount || 0);
      vehTotals.set(b.vehicle_id, cur);
    }

    const topVehicles = allVehicles
      .map((v) => {
        const stats = vehTotals.get(v.id) || { trips: 0, revenue: 0 };
        return { id: v.id, name: v.name, brand: v.brand, trips: stats.trips, revenue: stats.revenue };
      })
      .sort((a, b) => b.trips - a.trips || b.revenue - a.revenue);

    const revMap = new Map<string, { revenue: number; transactions: number }>();
    for (const p of allPayments) {
      const m = p.payment_date.slice(0, 7);
      const cur = revMap.get(m) || { revenue: 0, transactions: 0 };
      cur.revenue += p.payment_type === 'Refund' ? -Number(p.amount || 0) : Number(p.amount || 0);
      cur.transactions += 1;
      revMap.set(m, cur);
    }
    const monthlyRevenue = Array.from(revMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    res.json({ byStatus, topVehicles, monthlyRevenue });
  } catch (err) {
    console.error('Reports query failed:', err);
    res.status(500).json({ error: 'Unable to load operational reports' });
  }
});

// ==========================================
// VEHICLE MANAGEMENT
// ==========================================
adminRouter.get('/vehicles', (req, res) => {
  try {
    const store = getStore();
    const includeArchived = req.query.archived === 'true';
    const rows = store.vehicles
      .filter((v) => includeArchived || !v.is_archived)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const imgMap = new Map<string, string[]>();
    for (const i of [...store.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)) {
      const arr = imgMap.get(i.vehicle_id) || [];
      arr.push(i.image_url);
      imgMap.set(i.vehicle_id, arr);
    }

    res.json(
      rows.map((v) => ({
        ...v,
        images: imgMap.get(v.id) || [],
      }))
    );
  } catch (err) {
    console.error('Admin vehicles list failed:', err);
    res.status(500).json({ error: 'Unable to load vehicles' });
  }
});

adminRouter.get('/vehicles/:id', (req, res) => {
  try {
    const store = getStore();
    const v = store.vehicles.find((veh) => veh.id === req.params.id);
    if (!v) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const custMap = new Map(store.customers.map((c) => [c.id, c.name]));
    const imgs = store.vehicle_images
      .filter((i) => i.vehicle_id === req.params.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.image_url);

    const bookingHistory = store.bookings
      .filter((b) => b.vehicle_id === req.params.id)
      .sort((a, b) => b.travel_date.localeCompare(a.travel_date))
      .map((b) => ({
        id: b.id,
        reference_id: b.reference_id,
        travel_date: b.travel_date,
        return_date: b.return_date,
        destination: b.destination,
        status: b.status,
        total_amount: b.total_amount,
        customer_name: custMap.get(b.customer_id) || 'Guest',
      }));

    res.json({
      ...v,
      images: imgs,
      bookingHistory,
    });
  } catch (err) {
    console.error('Admin vehicle detail failed:', err);
    res.status(500).json({ error: 'Unable to load vehicle details' });
  }
});

const vehicleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  registration_no: z.string().trim().min(3).max(40),
  seats: z.coerce.number().int().min(1).max(60),
  luggage_capacity: z.coerce.number().int().min(0).max(40).default(3),
  is_ac: z.boolean().default(true),
  fuel_type: z.enum(['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG']),
  transmission: z.enum(['Automatic', 'Manual']),
  price_per_km: z.coerce.number().min(0),
  daily_rate: z.coerce.number().min(0),
  min_km_per_day: z.coerce.number().int().min(0).default(250),
  driver_allowance: z.coerce.number().min(0).default(500),
  driver_available: z.boolean().default(true),
  self_drive_available: z.boolean().default(true),
  status: z.enum(['Available', 'Unavailable', 'Under Maintenance']).default('Available'),
  is_published: z.boolean().default(true),
  description: z.string().trim().max(2000).default(''),
  images: z.array(z.string().min(1)).default([]),
});

adminRouter.post('/vehicles', (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle fields' });
    return;
  }
  const d = parsed.data;
  const id = `veh-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const store = getStore();
    store.vehicles.push({
      id,
      name: d.name,
      brand: d.brand,
      model: d.model,
      registration_no: d.registration_no,
      seats: d.seats,
      luggage_capacity: d.luggage_capacity,
      is_ac: d.is_ac,
      fuel_type: d.fuel_type,
      transmission: d.transmission,
      price_per_km: d.price_per_km,
      daily_rate: d.daily_rate,
      min_km_per_day: d.min_km_per_day,
      driver_allowance: d.driver_allowance,
      driver_available: d.driver_available,
      self_drive_available: d.self_drive_available,
      status: d.status,
      is_archived: false,
      is_published: d.is_published,
      description: d.description,
      created_at: new Date().toISOString(),
    });
    d.images.forEach((img, idx) => {
      store.vehicle_images.push({
        id: crypto.randomUUID(),
        vehicle_id: id,
        image_url: img,
        sort_order: idx,
      });
    });
    saveStore(store);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create vehicle failed:', err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

adminRouter.put('/vehicles/:id', (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle fields' });
    return;
  }
  const d = parsed.data;

  try {
    const store = getStore();
    const existing = store.vehicles.find((v) => v.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    Object.assign(existing, {
      name: d.name,
      brand: d.brand,
      model: d.model,
      registration_no: d.registration_no,
      seats: d.seats,
      luggage_capacity: d.luggage_capacity,
      is_ac: d.is_ac,
      fuel_type: d.fuel_type,
      transmission: d.transmission,
      price_per_km: d.price_per_km,
      daily_rate: d.daily_rate,
      min_km_per_day: d.min_km_per_day,
      driver_allowance: d.driver_allowance,
      driver_available: d.driver_available,
      self_drive_available: d.self_drive_available,
      status: d.status,
      is_published: d.is_published,
      description: d.description,
    });

    store.vehicle_images = store.vehicle_images.filter((i) => i.vehicle_id !== req.params.id);
    d.images.forEach((img, idx) => {
      store.vehicle_images.push({
        id: crypto.randomUUID(),
        vehicle_id: req.params.id,
        image_url: img,
        sort_order: idx,
      });
    });
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Update vehicle failed:', err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

adminRouter.patch('/vehicles/:id/archive', (req, res) => {
  try {
    const store = getStore();
    const cur = store.vehicles.find((v) => v.id === req.params.id);
    if (!cur) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    const archived = Boolean(req.body?.is_archived ?? true);
    cur.is_archived = archived;
    cur.is_published = archived ? false : cur.is_published;
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Archive vehicle failed:', err);
    res.status(500).json({ error: 'Unable to update vehicle archive state' });
  }
});

// ==========================================
// TOUR PACKAGES MANAGEMENT
// ==========================================
adminRouter.get('/packages', (_req, res) => {
  try {
    const store = getStore();
    const rows = [...store.tour_packages].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(rows);
  } catch (err) {
    console.error('Admin packages list failed:', err);
    res.status(500).json({ error: 'Unable to load tour packages' });
  }
});

adminRouter.get('/packages/:id', (req, res) => {
  try {
    const store = getStore();
    const pkg = store.tour_packages.find((p) => p.id === req.params.id);
    if (!pkg) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    res.json(pkg);
  } catch (err) {
    console.error('Admin package detail failed:', err);
    res.status(500).json({ error: 'Unable to load package details' });
  }
});

const packageSchema = z.object({
  name: z.string().trim().min(2).max(160),
  destination: z.string().trim().min(2).max(200),
  days: z.coerce.number().int().min(1).max(45),
  nights: z.coerce.number().int().min(0).max(45),
  price: z.coerce.number().min(0),
  pickup_location: z.string().trim().min(2).max(200),
  dropoff_location: z.string().trim().min(2).max(200),
  itinerary: z.array(z.object({ day: z.coerce.number().int().min(1), title: z.string(), description: z.string() })).default([]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  suggested_vehicle_id: z.string().nullable().optional(),
  max_passengers: z.coerce.number().int().min(1).max(50).default(6),
  status: z.enum(['Published', 'Inactive', 'Archived']).default('Published'),
  images: z.array(z.string()).default([]),
});

adminRouter.post('/packages', (req, res) => {
  const parsed = packageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid package input' });
    return;
  }
  const d = parsed.data;
  const id = `pkg-${crypto.randomUUID().slice(0, 8)}`;
  try {
    const store = getStore();
    store.tour_packages.push({
      id,
      name: d.name,
      destination: d.destination,
      days: d.days,
      nights: d.nights,
      price: d.price,
      pickup_location: d.pickup_location,
      dropoff_location: d.dropoff_location,
      itinerary: d.itinerary,
      inclusions: d.inclusions,
      exclusions: d.exclusions,
      suggested_vehicle_id: d.suggested_vehicle_id || null,
      max_passengers: d.max_passengers,
      status: d.status,
      images: d.images,
      rating: 4.9,
      review_count: 0,
      created_at: new Date().toISOString(),
    });
    saveStore(store);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create package failed:', err);
    res.status(500).json({ error: 'Unable to create package' });
  }
});

adminRouter.put('/packages/:id', (req, res) => {
  const parsed = packageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid package input' });
    return;
  }
  const d = parsed.data;
  try {
    const store = getStore();
    const existing = store.tour_packages.find((p) => p.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    Object.assign(existing, {
      name: d.name,
      destination: d.destination,
      days: d.days,
      nights: d.nights,
      price: d.price,
      pickup_location: d.pickup_location,
      dropoff_location: d.dropoff_location,
      itinerary: d.itinerary,
      inclusions: d.inclusions,
      exclusions: d.exclusions,
      suggested_vehicle_id: d.suggested_vehicle_id || null,
      max_passengers: d.max_passengers,
      status: d.status,
      images: d.images,
    });
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Update package failed:', err);
    res.status(500).json({ error: 'Unable to update package' });
  }
});

// ==========================================
// BOOKING MANAGEMENT + OVERLAP CHECK + STATE MACHINE
// ==========================================
adminRouter.get('/bookings', (req, res) => {
  try {
    const store = getStore();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const custMap = new Map(store.customers.map((c) => [c.id, c]));
    const vehMap = new Map(store.vehicles.map((v) => [v.id, v]));
    const pkgMap = new Map(store.tour_packages.map((p) => [p.id, p]));
    const drvMap = new Map(store.drivers.map((d) => [d.id, d]));

    const payByBooking = new Map<string, Array<{ amount: number; payment_type: string }>>();
    for (const p of store.payments) {
      const arr = payByBooking.get(p.booking_id) || [];
      arr.push({ amount: p.amount, payment_type: p.payment_type });
      payByBooking.set(p.booking_id, arr);
    }

    const enriched = [...store.bookings]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((b) => {
        const cust = custMap.get(b.customer_id);
        const veh = b.vehicle_id ? vehMap.get(b.vehicle_id) : undefined;
        const pkg = b.package_id ? pkgMap.get(b.package_id) : undefined;
        const drv = b.driver_id ? drvMap.get(b.driver_id) : undefined;
        return {
          ...b,
          customer_name: cust?.name || 'Guest',
          customer_mobile: cust?.mobile || '',
          customer_email: cust?.email || null,
          vehicle_name: veh?.name || null,
          vehicle_reg: veh?.registration_no || null,
          package_name: pkg?.name || null,
          driver_name: drv?.name || null,
          driver_phone: drv?.phone || null,
          ...computePaymentSummaryFromRows(payByBooking.get(b.id) || [], Number(b.total_amount || 0)),
        };
      })
      .filter((r) => {
        if (statusFilter && statusFilter !== 'All' && r.status !== statusFilter) return false;
        if (search) {
          const hay = `${r.reference_id} ${r.customer_name} ${r.customer_mobile} ${r.destination} ${r.vehicle_name || ''} ${r.package_name || ''}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

    res.json(enriched);
  } catch (err) {
    console.error('Admin bookings list failed:', err);
    res.status(500).json({ error: 'Unable to load bookings' });
  }
});

adminRouter.get('/bookings/:id', (req, res) => {
  try {
    const store = getStore();
    const b = store.bookings.find((row) => row.id === req.params.id);
    if (!b) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const cust = store.customers.find((c) => c.id === b.customer_id);
    const veh = b.vehicle_id ? store.vehicles.find((v) => v.id === b.vehicle_id) : undefined;
    const pkg = b.package_id ? store.tour_packages.find((p) => p.id === b.package_id) : undefined;
    const drv = b.driver_id ? store.drivers.find((d) => d.id === b.driver_id) : undefined;

    const payRows = store.payments
      .filter((p) => p.booking_id === req.params.id)
      .sort((a, b2) => b2.payment_date.localeCompare(a.payment_date) || b2.created_at.localeCompare(a.created_at));

    const historyRows = store.booking_status_history
      .filter((h) => h.booking_id === req.params.id)
      .sort((a, b2) => b2.changed_at.localeCompare(a.changed_at));

    const activeOverlapBookings = store.bookings.filter(
      (other) =>
        other.id !== req.params.id &&
        (ACTIVE_STATUSES as readonly string[]).includes(other.status) &&
        other.travel_date <= b.return_date &&
        other.return_date >= b.travel_date
    );

    const busyDriverIds = new Set(activeOverlapBookings.map((x) => x.driver_id).filter(Boolean));
    const availableDrivers = store.drivers.filter(
      (d) => d.is_active && d.licence_expiry >= b.return_date && !busyDriverIds.has(d.id)
    );

    const conflicts = b.vehicle_id
      ? activeOverlapBookings
          .filter((x) => x.vehicle_id === b.vehicle_id)
          .map((x) => ({
            id: x.id,
            reference_id: x.reference_id,
            travel_date: x.travel_date,
            return_date: x.return_date,
            status: x.status,
          }))
      : [];

    res.json({
      ...b,
      customer_name: cust?.name || 'Guest',
      customer_mobile: cust?.mobile || '',
      customer_email: cust?.email || null,
      vehicle_name: veh?.name || null,
      vehicle_brand: veh?.brand || null,
      vehicle_model: veh?.model || null,
      vehicle_reg: veh?.registration_no || null,
      price_per_km: veh?.price_per_km ?? null,
      daily_rate: veh?.daily_rate ?? null,
      min_km_per_day: veh?.min_km_per_day ?? null,
      driver_allowance: veh?.driver_allowance ?? null,
      package_name: pkg?.name || null,
      package_days: pkg?.days ?? null,
      package_nights: pkg?.nights ?? null,
      driver_name: drv?.name || null,
      driver_phone: drv?.phone || null,
      driver_licence: drv?.licence_no || null,
      ...computePaymentSummaryFromRows(payRows, Number(b.total_amount || 0)),
      payments: payRows,
      history: historyRows,
      conflicts,
      availableDrivers,
      allowedNextStatuses: VALID_TRANSITIONS[b.status] || [],
    });
  } catch (err) {
    console.error('Admin booking detail failed:', err);
    res.status(500).json({ error: 'Unable to load booking details' });
  }
});

const updateBookingStatusSchema = z.object({
  new_status: z.enum(['Pending', 'Contacted', 'Confirmed', 'Vehicle Assigned', 'In Progress', 'Completed', 'Rejected', 'Cancelled']),
  note: z.string().trim().max(500).optional().default(''),
  driver_id: z.string().nullable().optional(),
  vehicle_id: z.string().nullable().optional(),
});

adminRouter.patch('/bookings/:id/status', (req: AuthenticatedRequest, res) => {
  const parsed = updateBookingStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status update' });
    return;
  }

  try {
    const store = getStore();
    const booking = store.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const currentStatus = booking.status;
    const nextStatus = parsed.data.new_status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(nextStatus)) {
      res.status(400).json({ error: `Cannot transition booking from "${currentStatus}" to "${nextStatus}".` });
      return;
    }

    const targetVehicleId = parsed.data.vehicle_id !== undefined ? parsed.data.vehicle_id : booking.vehicle_id;
    const targetDriverId = parsed.data.driver_id !== undefined ? parsed.data.driver_id : booking.driver_id;

    if (nextStatus === 'Vehicle Assigned' && booking.driver_preference === 'With Driver' && !targetDriverId) {
      res.status(400).json({ error: 'Please assign an available driver before marking as Vehicle Assigned.' });
      return;
    }

    if (targetDriverId) {
      const drv = store.drivers.find((d) => d.id === targetDriverId);
      if (!drv || !drv.is_active) {
        res.status(400).json({ error: 'Selected driver is inactive or missing.' });
        return;
      }
      if (drv.licence_expiry < booking.return_date) {
        res.status(400).json({ error: 'Driver licence expires before the trip return date.' });
        return;
      }
      const driverConflict = store.bookings.find(
        (other) =>
          other.id !== req.params.id &&
          other.driver_id === targetDriverId &&
          (ACTIVE_STATUSES as readonly string[]).includes(other.status) &&
          other.travel_date <= booking.return_date &&
          other.return_date >= booking.travel_date
      );
      if (driverConflict) {
        res.status(409).json({
          error: `Selected driver is already assigned to booking ${driverConflict.reference_id} on overlapping dates.`,
        });
        return;
      }
    }

    if (targetVehicleId && (ACTIVE_STATUSES as readonly string[]).includes(nextStatus)) {
      const vehicleConflict = store.bookings.find(
        (other) =>
          other.id !== req.params.id &&
          other.vehicle_id === targetVehicleId &&
          (ACTIVE_STATUSES as readonly string[]).includes(other.status) &&
          other.travel_date <= booking.return_date &&
          other.return_date >= booking.travel_date
      );
      if (vehicleConflict) {
        res.status(409).json({
          error: 'Vehicle overlap conflict: another confirmed/active booking already occupies this vehicle for overlapping dates.',
        });
        return;
      }
    }

    booking.status = nextStatus;
    booking.vehicle_id = targetVehicleId;
    booking.driver_id = targetDriverId;

    store.booking_status_history.push({
      id: crypto.randomUUID(),
      booking_id: req.params.id,
      old_status: currentStatus,
      new_status: nextStatus,
      changed_by: req.admin!.sub,
      note: parsed.data.note || `Status changed to ${nextStatus}`,
      changed_at: new Date().toISOString(),
    });
    saveStore(store);

    res.json({ ok: true, status: nextStatus });
  } catch (err) {
    console.error('Booking status update failed:', err);
    res.status(500).json({ error: 'Unable to update booking status' });
  }
});

const updateBookingDetailsSchema = z.object({
  total_amount: z.coerce.number().min(0).optional(),
  quotation_breakdown: z.record(z.string(), z.unknown()).optional(),
  admin_notes: z.string().max(2000).optional(),
  vehicle_id: z.string().nullable().optional(),
  driver_id: z.string().nullable().optional(),
});

adminRouter.patch('/bookings/:id', (req, res) => {
  const parsed = updateBookingDetailsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid booking update fields' });
    return;
  }

  try {
    const store = getStore();
    const existing = store.bookings.find((b) => b.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const d = parsed.data;
    const nextVehicleId = d.vehicle_id !== undefined ? d.vehicle_id : existing.vehicle_id;
    const nextDriverId = d.driver_id !== undefined ? d.driver_id : existing.driver_id;

    if (nextVehicleId && (ACTIVE_STATUSES as readonly string[]).includes(existing.status)) {
      const vehicleConflict = store.bookings.find(
        (other) =>
          other.id !== req.params.id &&
          other.vehicle_id === nextVehicleId &&
          (ACTIVE_STATUSES as readonly string[]).includes(other.status) &&
          other.travel_date <= existing.return_date &&
          other.return_date >= existing.travel_date
      );
      if (vehicleConflict) {
        res.status(409).json({ error: 'Vehicle already has an overlapping confirmed booking for these dates.' });
        return;
      }
    }

    existing.total_amount = d.total_amount ?? existing.total_amount;
    existing.quotation_breakdown = d.quotation_breakdown ?? existing.quotation_breakdown;
    existing.admin_notes = d.admin_notes ?? existing.admin_notes;
    existing.vehicle_id = nextVehicleId;
    existing.driver_id = nextDriverId;
    saveStore(store);

    res.json({ ok: true });
  } catch (err) {
    console.error('Update booking details failed:', err);
    res.status(500).json({ error: 'Unable to update booking details' });
  }
});

// ==========================================
// PAYMENTS
// ==========================================
adminRouter.get('/payments', (_req, res) => {
  try {
    const store = getStore();
    const bMap = new Map(store.bookings.map((b) => [b.id, b]));
    const cMap = new Map(store.customers.map((c) => [c.id, c]));

    const rows = [...store.payments]
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at))
      .map((p) => {
        const booking = bMap.get(p.booking_id);
        const cust = booking ? cMap.get(booking.customer_id) : undefined;
        return {
          ...p,
          reference_id: booking?.reference_id || '',
          total_amount: booking?.total_amount || 0,
          customer_name: cust?.name || 'Guest',
        };
      });

    res.json(rows);
  } catch (err) {
    console.error('Admin payments list failed:', err);
    res.status(500).json({ error: 'Unable to load payments' });
  }
});

const paymentSchema = z.object({
  booking_id: z.string().min(1),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  payment_type: z.enum(['Advance', 'Balance', 'Full', 'Refund']),
  method: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Card']),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transaction_ref: z.string().trim().max(120).optional().default(''),
});

adminRouter.post('/payments', (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payment payload' });
    return;
  }
  const d = parsed.data;
  try {
    const store = getStore();
    const booking = store.bookings.find((b) => b.id === d.booking_id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const id = crypto.randomUUID();
    store.payments.push({
      id,
      booking_id: d.booking_id,
      amount: d.amount,
      payment_type: d.payment_type,
      method: d.method,
      payment_date: d.payment_date,
      transaction_ref: d.transaction_ref,
      created_at: new Date().toISOString(),
    });
    saveStore(store);

    const summary = computePaymentSummary(d.booking_id, booking.total_amount);
    res.status(201).json({ id, ...summary });
  } catch (err) {
    console.error('Create payment failed:', err);
    res.status(500).json({ error: 'Unable to record payment' });
  }
});

// ==========================================
// DRIVERS
// ==========================================
adminRouter.get('/drivers', (_req, res) => {
  try {
    const store = getStore();
    const rows = [...store.drivers].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    res.json(
      rows.map((d) => ({
        ...d,
        licence_expiring_soon: d.licence_expiry <= in30Days && d.licence_expiry >= todayStr,
        licence_expired: d.licence_expiry < todayStr,
      }))
    );
  } catch (err) {
    console.error('Admin drivers list failed:', err);
    res.status(500).json({ error: 'Unable to load drivers' });
  }
});

const driverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(24),
  photo_url: z.string().optional().default(''),
  licence_no: z.string().trim().min(4).max(60),
  licence_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_active: z.boolean().default(true),
});

adminRouter.post('/drivers', (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid driver data' });
    return;
  }
  const d = parsed.data;
  const id = `drv-${crypto.randomUUID().slice(0, 8)}`;
  try {
    const store = getStore();
    store.drivers.push({
      id,
      name: d.name,
      phone: d.phone,
      photo_url: d.photo_url,
      licence_no: d.licence_no,
      licence_expiry: d.licence_expiry,
      is_active: d.is_active,
      created_at: new Date().toISOString(),
    });
    saveStore(store);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create driver failed:', err);
    res.status(500).json({ error: 'Unable to create driver' });
  }
});

adminRouter.put('/drivers/:id', (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid driver data' });
    return;
  }
  const d = parsed.data;
  try {
    const store = getStore();
    const existing = store.drivers.find((drv) => drv.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    Object.assign(existing, {
      name: d.name,
      phone: d.phone,
      photo_url: d.photo_url,
      licence_no: d.licence_no,
      licence_expiry: d.licence_expiry,
      is_active: d.is_active,
    });
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Update driver failed:', err);
    res.status(500).json({ error: 'Unable to update driver' });
  }
});

// ==========================================
// CUSTOMERS
// ==========================================
adminRouter.get('/customers', (_req, res) => {
  try {
    const store = getStore();
    const agg = new Map<string, { booking_count: number; total_spend: number }>();
    for (const b of store.bookings) {
      const cur = agg.get(b.customer_id) || { booking_count: 0, total_spend: 0 };
      cur.booking_count += 1;
      cur.total_spend += Number(b.total_amount || 0);
      agg.set(b.customer_id, cur);
    }

    const custRows = [...store.customers].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(
      custRows.map((c) => {
        const s = agg.get(c.id) || { booking_count: 0, total_spend: 0 };
        return { ...c, ...s };
      })
    );
  } catch (err) {
    console.error('Admin customers list failed:', err);
    res.status(500).json({ error: 'Unable to load customers' });
  }
});

adminRouter.get('/customers/:id', (req, res) => {
  try {
    const store = getStore();
    const customer = store.customers.find((c) => c.id === req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const vehMap = new Map(store.vehicles.map((v) => [v.id, v.name]));
    const pkgMap = new Map(store.tour_packages.map((p) => [p.id, p.name]));

    const custBookings = store.bookings
      .filter((b) => b.customer_id === req.params.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((b) => ({
        id: b.id,
        reference_id: b.reference_id,
        booking_type: b.booking_type,
        destination: b.destination,
        travel_date: b.travel_date,
        return_date: b.return_date,
        status: b.status,
        total_amount: b.total_amount,
        created_at: b.created_at,
        vehicle_name: b.vehicle_id ? vehMap.get(b.vehicle_id) || null : null,
        package_name: b.package_id ? pkgMap.get(b.package_id) || null : null,
      }));

    res.json({ ...customer, bookings: custBookings });
  } catch (err) {
    console.error('Admin customer detail failed:', err);
    res.status(500).json({ error: 'Unable to load customer details' });
  }
});

// ==========================================
// PRICING RULES
// ==========================================
adminRouter.get('/pricing', (_req, res) => {
  try {
    const store = getStore();
    const rules = [...store.pricing_rules].sort((a, b) => a.category.localeCompare(b.category));
    res.json(rules);
  } catch (err) {
    console.error('Pricing rules list failed:', err);
    res.status(500).json({ error: 'Unable to load pricing rules' });
  }
});

const pricingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(['Local', 'Outstation', 'Seasonal', 'Add-on']),
  per_km_rate: z.coerce.number().min(0),
  min_km_per_day: z.coerce.number().int().min(0),
  driver_allowance: z.coerce.number().min(0),
  night_charge: z.coerce.number().min(0),
  waiting_charge_per_hr: z.coerce.number().min(0),
  extra_km_charge: z.coerce.number().min(0),
  seasonal_multiplier: z.coerce.number().min(0.5).max(5),
  is_active: z.boolean().default(true),
});

adminRouter.post('/pricing', (req, res) => {
  const parsed = pricingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid pricing rule' });
    return;
  }
  const d = parsed.data;
  const id = `pr-${crypto.randomUUID().slice(0, 8)}`;
  try {
    const store = getStore();
    store.pricing_rules.push({
      id,
      name: d.name,
      category: d.category,
      per_km_rate: d.per_km_rate,
      min_km_per_day: d.min_km_per_day,
      driver_allowance: d.driver_allowance,
      night_charge: d.night_charge,
      waiting_charge_per_hr: d.waiting_charge_per_hr,
      extra_km_charge: d.extra_km_charge,
      seasonal_multiplier: d.seasonal_multiplier,
      is_active: d.is_active,
    });
    saveStore(store);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create pricing rule failed:', err);
    res.status(500).json({ error: 'Unable to create pricing rule' });
  }
});

adminRouter.put('/pricing/:id', (req, res) => {
  const parsed = pricingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid pricing rule' });
    return;
  }
  const d = parsed.data;
  try {
    const store = getStore();
    const existing = store.pricing_rules.find((r) => r.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Pricing rule not found' });
      return;
    }
    Object.assign(existing, {
      name: d.name,
      category: d.category,
      per_km_rate: d.per_km_rate,
      min_km_per_day: d.min_km_per_day,
      driver_allowance: d.driver_allowance,
      night_charge: d.night_charge,
      waiting_charge_per_hr: d.waiting_charge_per_hr,
      extra_km_charge: d.extra_km_charge,
      seasonal_multiplier: d.seasonal_multiplier,
      is_active: d.is_active,
    });
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Update pricing rule failed:', err);
    res.status(500).json({ error: 'Unable to update pricing rule' });
  }
});

// ==========================================
// AVAILABILITY CALENDAR
// ==========================================
adminRouter.get('/calendar', (_req, res) => {
  try {
    const store = getStore();
    const custMap = new Map(store.customers.map((c) => [c.id, c.name]));

    const vehRows = store.vehicles
      .filter((v) => !v.is_archived)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((v) => ({ id: v.id, name: v.name, brand: v.brand, status: v.status }));

    const calendarStatuses = new Set(['Confirmed', 'Vehicle Assigned', 'In Progress', 'Pending', 'Contacted']);
    const bookingRows = store.bookings
      .filter((b) => Boolean(b.vehicle_id) && calendarStatuses.has(b.status))
      .sort((a, b) => a.travel_date.localeCompare(b.travel_date))
      .map((b) => ({
        id: b.id,
        reference_id: b.reference_id,
        vehicle_id: b.vehicle_id,
        travel_date: b.travel_date,
        return_date: b.return_date,
        destination: b.destination,
        status: b.status,
        customer_name: custMap.get(b.customer_id) || 'Guest',
      }));

    res.json({
      vehicles: vehRows,
      bookings: bookingRows,
    });
  } catch (err) {
    console.error('Calendar load failed:', err);
    res.status(500).json({ error: 'Unable to load availability calendar' });
  }
});

// ==========================================
// GALLERY, REVIEWS, FAQS & WEBSITE SETTINGS
// ==========================================
adminRouter.get('/gallery', (_req, res) => {
  try {
    const store = getStore();
    const rows = [...store.gallery].sort(
      (a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)
    );
    res.json(rows);
  } catch (err) {
    console.error('Gallery list failed:', err);
    res.status(500).json({ error: 'Unable to load gallery' });
  }
});

adminRouter.post('/gallery', (req, res) => {
  const schema = z.object({
    image_url: z.string().min(1),
    caption: z.string().trim().min(2).max(200),
    location: z.string().trim().max(120).default('India'),
    sort_order: z.coerce.number().int().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid image URL and caption are required' });
    return;
  }
  const id = crypto.randomUUID();
  try {
    const store = getStore();
    store.gallery.push({
      id,
      image_url: parsed.data.image_url,
      caption: parsed.data.caption,
      location: parsed.data.location,
      sort_order: parsed.data.sort_order,
      created_at: new Date().toISOString(),
    });
    saveStore(store);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Add gallery failed:', err);
    res.status(500).json({ error: 'Unable to add gallery image' });
  }
});

adminRouter.delete('/gallery/:id', (req, res) => {
  try {
    const store = getStore();
    store.gallery = store.gallery.filter((g) => g.id !== req.params.id);
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete gallery failed:', err);
    res.status(500).json({ error: 'Unable to delete gallery image' });
  }
});

adminRouter.get('/reviews', (_req, res) => {
  try {
    const store = getStore();
    const rows = [...store.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(rows);
  } catch (err) {
    console.error('Admin reviews list failed:', err);
    res.status(500).json({ error: 'Unable to load reviews' });
  }
});

adminRouter.patch('/reviews/:id', (req, res) => {
  try {
    const store = getStore();
    const rev = store.reviews.find((r) => r.id === req.params.id);
    if (rev) {
      rev.is_approved = Boolean(req.body?.is_approved);
      saveStore(store);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Toggle review failed:', err);
    res.status(500).json({ error: 'Unable to update review' });
  }
});

adminRouter.delete('/reviews/:id', (req, res) => {
  try {
    const store = getStore();
    store.reviews = store.reviews.filter((r) => r.id !== req.params.id);
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete review failed:', err);
    res.status(500).json({ error: 'Unable to delete review' });
  }
});

adminRouter.get('/faqs', (_req, res) => {
  try {
    const store = getStore();
    const rows = [...store.faqs].sort((a, b) => a.sort_order - b.sort_order);
    res.json(rows);
  } catch (err) {
    console.error('Admin FAQs list failed:', err);
    res.status(500).json({ error: 'Unable to load FAQs' });
  }
});

adminRouter.post('/faqs', (req, res) => {
  const schema = z.object({
    question: z.string().trim().min(4).max(300),
    answer: z.string().trim().min(4).max(1500),
    sort_order: z.coerce.number().int().default(0),
    is_active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Question and answer are required' });
    return;
  }
  const id = crypto.randomUUID();
  try {
    const store = getStore();
    store.faqs.push({
      id,
      question: parsed.data.question,
      answer: parsed.data.answer,
      sort_order: parsed.data.sort_order,
      is_active: parsed.data.is_active,
    });
    saveStore(store);
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create FAQ failed:', err);
    res.status(500).json({ error: 'Unable to add FAQ' });
  }
});

adminRouter.delete('/faqs/:id', (req, res) => {
  try {
    const store = getStore();
    store.faqs = store.faqs.filter((f) => f.id !== req.params.id);
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete FAQ failed:', err);
    res.status(500).json({ error: 'Unable to delete FAQ' });
  }
});

const STRING_SETTING_KEYS = new Set([
  'business_name',
  'tagline',
  'hero_headline',
  'hero_subheadline',
  'hero_image',
  'phone',
  'whatsapp_number',
  'email',
  'address',
  'operating_area',
  'about_title',
  'about_description',
]);

adminRouter.get('/settings', (_req, res) => {
  try {
    const store = getStore();
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(store.site_settings || {})) {
      out[k] = STRING_SETTING_KEYS.has(k) && v !== null && v !== undefined ? String(v) : v;
    }
    res.json(out);
  } catch (err) {
    console.error('Admin settings load failed:', err);
    res.status(500).json({ error: 'Unable to load website settings' });
  }
});

adminRouter.put('/settings', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid settings payload' });
    return;
  }
  try {
    const store = getStore();
    for (const [k, v] of Object.entries(body)) {
      if (typeof k === 'string' && k.length > 0 && k.length < 80) {
        store.site_settings[k] = v;
      }
    }
    saveStore(store);
    res.json({ ok: true });
  } catch (err) {
    console.error('Save settings failed:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});
