import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { db } from '../db.ts';
import { getUploadsDir } from '../paths.ts';
import {
  AuthenticatedRequest,
  constantTimeEqualStr,
  getAdminProfile,
  getEnvAdminPassword,
  hashPassword,
  requireAdmin,
  signAdminToken,
  verifyPassword,
} from '../auth.ts';

export const adminRouter = Router();

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

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function computePaymentSummary(bookingId: string, totalAmount: number) {
  const rows = db
    .prepare('SELECT amount, payment_type FROM payments WHERE booking_id = ?')
    .all(bookingId) as { amount: number; payment_type: string }[];

  let paid = 0;
  let refunded = 0;
  for (const r of rows) {
    if (r.payment_type === 'Refund') {
      refunded += r.amount;
    } else {
      paid += r.amount;
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

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
adminRouter.get('/auth/status', (_req, res) => {
  const envPass = getEnvAdminPassword();
  const profile = getAdminProfile();
  const configured = Boolean(envPass) || Boolean(profile?.password_hash);
  res.json({
    configured,
    usingEnv: Boolean(envPass),
    adminEmail: profile?.email || 'admin@travelgo.in',
  });
});

const bootstrapSchema = z.object({
  full_name: z.string().trim().min(2).max(100).default('TravelGo Admin'),
  email: z.string().trim().email().default('admin@travelgo.in'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

adminRouter.post('/auth/bootstrap', (req, res) => {
  const envPass = getEnvAdminPassword();
  if (envPass) {
    res.status(403).json({ error: 'Admin password is already managed by server configuration.' });
    return;
  }
  const existing = getAdminProfile();
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
  const passwordHash = hashPassword(password);
  const id = existing?.id || crypto.randomUUID();

  if (existing) {
    db.prepare('UPDATE profiles SET full_name = ?, email = ?, password_hash = ? WHERE id = ?').run(
      full_name,
      email,
      passwordHash,
      id
    );
  } else {
    db.prepare("INSERT INTO profiles (id, full_name, email, role, password_hash) VALUES (?, ?, ?, 'admin', ?)").run(
      id,
      full_name,
      email,
      passwordHash
    );
  }

  const token = signAdminToken({ sub: id, email, role: 'admin' });
  res.status(201).json({
    token,
    admin: { id, full_name, email, role: 'admin' },
  });
});

const loginSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(1, 'Password is required'),
});

adminRouter.post('/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const envPass = getEnvAdminPassword();
  const profile = getAdminProfile();

  if (envPass) {
    if (!constantTimeEqualStr(parsed.data.password, envPass)) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }
    let adminId = profile?.id;
    let adminEmail = profile?.email || parsed.data.email || 'admin@travelgo.in';
    let adminName = profile?.full_name || 'TravelGo Admin';
    if (!profile) {
      adminId = crypto.randomUUID();
      db.prepare("INSERT INTO profiles (id, full_name, email, role) VALUES (?, ?, ?, 'admin')").run(
        adminId,
        adminName,
        adminEmail
      );
    }
    const token = signAdminToken({ sub: adminId!, email: adminEmail, role: 'admin' });
    res.json({ token, admin: { id: adminId, full_name: adminName, email: adminEmail, role: 'admin' } });
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
});

// Protect all routes below
adminRouter.use(requireAdmin);

adminRouter.get('/auth/me', (req: AuthenticatedRequest, res) => {
  const profile = getAdminProfile();
  res.json({
    admin: {
      id: req.admin!.sub,
      full_name: profile?.full_name || 'TravelGo Admin',
      email: profile?.email || req.admin!.email,
      role: 'admin',
    },
  });
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

  fs.writeFileSync(targetPath, buffer);
  res.status(201).json({ url: `/uploads/${safeName}` });
});

// ==========================================
// DASHBOARD & REPORTS
// ==========================================
adminRouter.get('/dashboard', (_req, res) => {
  const vehicleStats = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status != 'Available' THEN 1 ELSE 0 END) as unavailable
       FROM vehicles WHERE is_archived = 0`
    )
    .get() as { total: number; available: number; unavailable: number };

  const bookingStats = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('Confirmed', 'Vehicle Assigned', 'In Progress') THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
        COUNT(*) as total
       FROM bookings`
    )
    .get() as { pending: number; confirmed: number; completed: number; total: number };

  const paymentTotals = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_type != 'Refund' THEN amount ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN payment_type = 'Refund' THEN amount ELSE 0 END), 0) as refunded
       FROM payments`
    )
    .get() as { collected: number; refunded: number };

  const totalRevenue = Math.max(0, paymentTotals.collected - paymentTotals.refunded);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingTrips = db
    .prepare(
      `SELECT b.id, b.reference_id, b.travel_date, b.return_date, b.destination, b.status,
              c.name as customer_name, v.name as vehicle_name, d.name as driver_name
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       LEFT JOIN vehicles v ON v.id = b.vehicle_id
       LEFT JOIN drivers d ON d.id = b.driver_id
       WHERE b.travel_date >= ? AND b.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
       ORDER BY b.travel_date ASC LIMIT 6`
    )
    .all(todayStr);

  const recentEnquiries = db
    .prepare(
      `SELECT b.id, b.reference_id, b.booking_type, b.destination, b.travel_date, b.status, b.total_amount, b.created_at,
              c.name as customer_name, c.mobile as customer_mobile,
              v.name as vehicle_name, p.name as package_name
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       LEFT JOIN vehicles v ON v.id = b.vehicle_id
       LEFT JOIN tour_packages p ON p.id = b.package_id
       ORDER BY b.created_at DESC LIMIT 8`
    )
    .all();

  const monthlyBookings = db
    .prepare(
      `SELECT strftime('%Y-%m', travel_date) as month, COUNT(*) as bookings, COALESCE(SUM(total_amount), 0) as value
       FROM bookings
       GROUP BY strftime('%Y-%m', travel_date)
       ORDER BY month ASC LIMIT 12`
    )
    .all();

  const monthlyRevenue = db
    .prepare(
      `SELECT strftime('%Y-%m', payment_date) as month,
              COALESCE(SUM(CASE WHEN payment_type != 'Refund' THEN amount ELSE -amount END), 0) as revenue
       FROM payments
       GROUP BY strftime('%Y-%m', payment_date)
       ORDER BY month ASC LIMIT 12`
    )
    .all();

  res.json({
    stats: {
      totalVehicles: vehicleStats.total || 0,
      availableVehicles: vehicleStats.available || 0,
      unavailableVehicles: vehicleStats.unavailable || 0,
      pendingRequests: bookingStats.pending || 0,
      confirmedBookings: bookingStats.confirmed || 0,
      completedTrips: bookingStats.completed || 0,
      totalBookings: bookingStats.total || 0,
      totalRevenue,
    },
    upcomingTrips,
    recentEnquiries,
    monthlyBookings,
    monthlyRevenue,
  });
});

adminRouter.get('/reports', (_req, res) => {
  const byStatus = db
    .prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount FROM bookings GROUP BY status')
    .all();

  const topVehicles = db
    .prepare(
      `SELECT v.id, v.name, v.brand, COUNT(b.id) as trips, COALESCE(SUM(b.total_amount), 0) as revenue
       FROM vehicles v
       LEFT JOIN bookings b ON b.vehicle_id = v.id AND b.status NOT IN ('Rejected', 'Cancelled')
       WHERE v.is_archived = 0
       GROUP BY v.id
       ORDER BY trips DESC, revenue DESC`
    )
    .all();

  const monthlyRevenue = db
    .prepare(
      `SELECT strftime('%Y-%m', payment_date) as month,
              COALESCE(SUM(CASE WHEN payment_type != 'Refund' THEN amount ELSE -amount END), 0) as revenue,
              COUNT(*) as transactions
       FROM payments
       GROUP BY strftime('%Y-%m', payment_date)
       ORDER BY month ASC`
    )
    .all();

  res.json({ byStatus, topVehicles, monthlyRevenue });
});

// ==========================================
// VEHICLE MANAGEMENT
// ==========================================
adminRouter.get('/vehicles', (req, res) => {
  const includeArchived = req.query.archived === 'true';
  const rows = db
    .prepare(
      `SELECT * FROM vehicles ${includeArchived ? '' : 'WHERE is_archived = 0'} ORDER BY created_at DESC`
    )
    .all() as Record<string, unknown>[];

  const imgs = db.prepare('SELECT vehicle_id, image_url FROM vehicle_images ORDER BY sort_order ASC').all() as {
    vehicle_id: string;
    image_url: string;
  }[];
  const imgMap = new Map<string, string[]>();
  for (const i of imgs) {
    const arr = imgMap.get(i.vehicle_id) || [];
    arr.push(i.image_url);
    imgMap.set(i.vehicle_id, arr);
  }

  res.json(
    rows.map((v) => ({
      ...v,
      is_ac: Boolean(v.is_ac),
      driver_available: Boolean(v.driver_available),
      self_drive_available: Boolean(v.self_drive_available),
      is_archived: Boolean(v.is_archived),
      is_published: Boolean(v.is_published),
      images: imgMap.get(v.id as string) || [],
    }))
  );
});

adminRouter.get('/vehicles/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!v) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  const imgs = (
    db.prepare('SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order ASC').all(req.params.id) as {
      image_url: string;
    }[]
  ).map((i) => i.image_url);

  const bookingHistory = db
    .prepare(
      `SELECT b.id, b.reference_id, b.travel_date, b.return_date, b.destination, b.status, b.total_amount, c.name as customer_name
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       WHERE b.vehicle_id = ?
       ORDER BY b.travel_date DESC`
    )
    .all(req.params.id);

  res.json({
    ...v,
    is_ac: Boolean(v.is_ac),
    driver_available: Boolean(v.driver_available),
    self_drive_available: Boolean(v.self_drive_available),
    is_archived: Boolean(v.is_archived),
    is_published: Boolean(v.is_published),
    images: imgs,
    bookingHistory,
  });
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
    db.exec('BEGIN');
    db.prepare(
      `INSERT INTO vehicles (
        id, name, brand, model, registration_no, seats, luggage_capacity, is_ac, fuel_type, transmission,
        price_per_km, daily_rate, min_km_per_day, driver_allowance, driver_available, self_drive_available,
        status, is_archived, is_published, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      id, d.name, d.brand, d.model, d.registration_no, d.seats, d.luggage_capacity,
      d.is_ac ? 1 : 0, d.fuel_type, d.transmission, d.price_per_km, d.daily_rate,
      d.min_km_per_day, d.driver_allowance, d.driver_available ? 1 : 0, d.self_drive_available ? 1 : 0,
      d.status, d.is_published ? 1 : 0, d.description
    );
    const insImg = db.prepare('INSERT INTO vehicle_images (id, vehicle_id, image_url, sort_order) VALUES (?, ?, ?, ?)');
    d.images.forEach((url, idx) => insImg.run(crypto.randomUUID(), id, url, idx));
    db.exec('COMMIT');
    res.status(201).json({ id });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create vehicle' });
  }
});

adminRouter.put('/vehicles/:id', (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle fields' });
    return;
  }
  const d = parsed.data;
  const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  try {
    db.exec('BEGIN');
    db.prepare(
      `UPDATE vehicles SET
        name = ?, brand = ?, model = ?, registration_no = ?, seats = ?, luggage_capacity = ?,
        is_ac = ?, fuel_type = ?, transmission = ?, price_per_km = ?, daily_rate = ?,
        min_km_per_day = ?, driver_allowance = ?, driver_available = ?, self_drive_available = ?,
        status = ?, is_published = ?, description = ?
       WHERE id = ?`
    ).run(
      d.name, d.brand, d.model, d.registration_no, d.seats, d.luggage_capacity,
      d.is_ac ? 1 : 0, d.fuel_type, d.transmission, d.price_per_km, d.daily_rate,
      d.min_km_per_day, d.driver_allowance, d.driver_available ? 1 : 0, d.self_drive_available ? 1 : 0,
      d.status, d.is_published ? 1 : 0, d.description, req.params.id
    );
    db.prepare('DELETE FROM vehicle_images WHERE vehicle_id = ?').run(req.params.id);
    const insImg = db.prepare('INSERT INTO vehicle_images (id, vehicle_id, image_url, sort_order) VALUES (?, ?, ?, ?)');
    d.images.forEach((url, idx) => insImg.run(crypto.randomUUID(), req.params.id, url, idx));
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update vehicle' });
  }
});

adminRouter.patch('/vehicles/:id/archive', (req, res) => {
  const archived = Boolean(req.body?.is_archived ?? true);
  db.prepare('UPDATE vehicles SET is_archived = ?, is_published = CASE WHEN ? = 1 THEN 0 ELSE is_published END WHERE id = ?').run(
    archived ? 1 : 0,
    archived ? 1 : 0,
    req.params.id
  );
  res.json({ ok: true });
});

// ==========================================
// TOUR PACKAGES MANAGEMENT
// ==========================================
adminRouter.get('/packages', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tour_packages ORDER BY created_at DESC').all() as Record<string, unknown>[];
  res.json(
    rows.map((p) => ({
      ...p,
      itinerary: safeJsonParse(p.itinerary as string, []),
      inclusions: safeJsonParse(p.inclusions as string, []),
      exclusions: safeJsonParse(p.exclusions as string, []),
      images: safeJsonParse(p.images as string, []),
    }))
  );
});

adminRouter.get('/packages/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM tour_packages WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!p) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.json({
    ...p,
    itinerary: safeJsonParse(p.itinerary as string, []),
    inclusions: safeJsonParse(p.inclusions as string, []),
    exclusions: safeJsonParse(p.exclusions as string, []),
    images: safeJsonParse(p.images as string, []),
  });
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
  db.prepare(
    `INSERT INTO tour_packages (
      id, name, destination, days, nights, price, pickup_location, dropoff_location,
      itinerary, inclusions, exclusions, suggested_vehicle_id, max_passengers, status, images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, d.name, d.destination, d.days, d.nights, d.price, d.pickup_location, d.dropoff_location,
    JSON.stringify(d.itinerary), JSON.stringify(d.inclusions), JSON.stringify(d.exclusions),
    d.suggested_vehicle_id || null, d.max_passengers, d.status, JSON.stringify(d.images)
  );
  res.status(201).json({ id });
});

adminRouter.put('/packages/:id', (req, res) => {
  const parsed = packageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid package input' });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `UPDATE tour_packages SET
      name = ?, destination = ?, days = ?, nights = ?, price = ?, pickup_location = ?, dropoff_location = ?,
      itinerary = ?, inclusions = ?, exclusions = ?, suggested_vehicle_id = ?, max_passengers = ?, status = ?, images = ?
     WHERE id = ?`
  ).run(
    d.name, d.destination, d.days, d.nights, d.price, d.pickup_location, d.dropoff_location,
    JSON.stringify(d.itinerary), JSON.stringify(d.inclusions), JSON.stringify(d.exclusions),
    d.suggested_vehicle_id || null, d.max_passengers, d.status, JSON.stringify(d.images), req.params.id
  );
  res.json({ ok: true });
});

// ==========================================
// BOOKING MANAGEMENT + OVERLAP CHECK + STATE MACHINE
// ==========================================
adminRouter.get('/bookings', (req, res) => {
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  const rows = db
    .prepare(
      `SELECT b.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
              v.name as vehicle_name, v.registration_no as vehicle_reg,
              p.name as package_name, d.name as driver_name, d.phone as driver_phone
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       LEFT JOIN vehicles v ON v.id = b.vehicle_id
       LEFT JOIN tour_packages p ON p.id = b.package_id
       LEFT JOIN drivers d ON d.id = b.driver_id
       ORDER BY b.created_at DESC`
    )
    .all() as Record<string, unknown>[];

  const enriched = rows
    .filter((r) => {
      if (statusFilter && statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (search) {
        const hay = `${r.reference_id} ${r.customer_name} ${r.customer_mobile} ${r.destination} ${r.vehicle_name || ''} ${r.package_name || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .map((r) => ({
      ...r,
      ...computePaymentSummary(r.id as string, Number(r.total_amount || 0)),
    }));

  res.json(enriched);
});

adminRouter.get('/bookings/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT b.*, c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
              v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model, v.registration_no as vehicle_reg,
              v.price_per_km, v.daily_rate, v.min_km_per_day, v.driver_allowance,
              p.name as package_name, p.days as package_days, p.nights as package_nights,
              d.name as driver_name, d.phone as driver_phone, d.licence_no as driver_licence
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       LEFT JOIN vehicles v ON v.id = b.vehicle_id
       LEFT JOIN tour_packages p ON p.id = b.package_id
       LEFT JOIN drivers d ON d.id = b.driver_id
       WHERE b.id = ?`
    )
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const payments = db
    .prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC, created_at DESC')
    .all(req.params.id);

  const history = db
    .prepare('SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY changed_at DESC')
    .all(req.params.id);

  // Also check if any overlapping bookings exist for the same vehicle
  let conflicts: unknown[] = [];
  if (row.vehicle_id) {
    conflicts = db
      .prepare(
        `SELECT id, reference_id, travel_date, return_date, status
         FROM bookings
         WHERE id != ? AND vehicle_id = ?
           AND status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
           AND travel_date <= ? AND return_date >= ?`
      )
      .all(req.params.id, row.vehicle_id as string, row.return_date as string, row.travel_date as string);
  }

  // Available drivers for these dates (active, licence not expired before return_date, not on overlapping trip)
  const availableDrivers = db
    .prepare(
      `SELECT d.*
       FROM drivers d
       WHERE d.is_active = 1
         AND d.licence_expiry >= ?
         AND NOT EXISTS (
           SELECT 1 FROM bookings b
           WHERE b.driver_id = d.id
             AND b.id != ?
             AND b.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
             AND b.travel_date <= ? AND b.return_date >= ?
         )`
    )
    .all(row.return_date as string, req.params.id, row.return_date as string, row.travel_date as string);

  res.json({
    ...row,
    quotation_breakdown: safeJsonParse(row.quotation_breakdown as string, {}),
    ...computePaymentSummary(req.params.id, Number(row.total_amount || 0)),
    payments,
    history,
    conflicts,
    availableDrivers,
    allowedNextStatuses: VALID_TRANSITIONS[row.status as string] || [],
  });
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

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const currentStatus = booking.status as string;
  const nextStatus = parsed.data.new_status;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    res.status(400).json({ error: `Cannot transition booking from "${currentStatus}" to "${nextStatus}".` });
    return;
  }

  const targetVehicleId = parsed.data.vehicle_id !== undefined ? parsed.data.vehicle_id : (booking.vehicle_id as string | null);
  const targetDriverId = parsed.data.driver_id !== undefined ? parsed.data.driver_id : (booking.driver_id as string | null);

  if (nextStatus === 'Vehicle Assigned' && booking.driver_preference === 'With Driver' && !targetDriverId) {
    res.status(400).json({ error: 'Please assign an available driver before marking as Vehicle Assigned.' });
    return;
  }

  if (targetDriverId) {
    const drv = db.prepare('SELECT id, licence_expiry, is_active FROM drivers WHERE id = ?').get(targetDriverId) as
      | { id: string; licence_expiry: string; is_active: number }
      | undefined;
    if (!drv || !drv.is_active) {
      res.status(400).json({ error: 'Selected driver is inactive or missing.' });
      return;
    }
    if (drv.licence_expiry < (booking.return_date as string)) {
      res.status(400).json({ error: 'Driver licence expires before the trip return date.' });
      return;
    }
    const driverConflict = db
      .prepare(
        `SELECT reference_id FROM bookings
         WHERE id != ? AND driver_id = ?
           AND status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
           AND travel_date <= ? AND return_date >= ?`
      )
      .get(req.params.id, targetDriverId, booking.return_date as string, booking.travel_date as string) as
      | { reference_id: string }
      | undefined;
    if (driverConflict) {
      res.status(409).json({ error: `Selected driver is already assigned to booking ${driverConflict.reference_id} on overlapping dates.` });
      return;
    }
  }

  try {
    db.exec('BEGIN');
    db.prepare('UPDATE bookings SET status = ?, vehicle_id = ?, driver_id = ? WHERE id = ?').run(
      nextStatus,
      targetVehicleId,
      targetDriverId,
      req.params.id
    );
    db.prepare(
      'INSERT INTO booking_status_history (id, booking_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      crypto.randomUUID(),
      req.params.id,
      currentStatus,
      nextStatus,
      req.admin!.sub,
      parsed.data.note || `Status changed to ${nextStatus}`
    );
    db.exec('COMMIT');
    res.json({ ok: true, status: nextStatus });
  } catch (err) {
    db.exec('ROLLBACK');
    const msg = err instanceof Error ? err.message : 'Status update failed';
    if (msg.includes('OVERLAP_CONFLICT')) {
      res.status(409).json({
        error: 'Vehicle overlap conflict: another confirmed/active booking already occupies this vehicle for overlapping dates.',
      });
      return;
    }
    res.status(500).json({ error: msg });
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
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const d = parsed.data;
  try {
    db.prepare(
      `UPDATE bookings SET
        total_amount = COALESCE(?, total_amount),
        quotation_breakdown = COALESCE(?, quotation_breakdown),
        admin_notes = COALESCE(?, admin_notes),
        vehicle_id = ?,
        driver_id = ?
       WHERE id = ?`
    ).run(
      d.total_amount ?? null,
      d.quotation_breakdown ? JSON.stringify(d.quotation_breakdown) : null,
      d.admin_notes ?? null,
      d.vehicle_id !== undefined ? d.vehicle_id : (existing.vehicle_id as string | null),
      d.driver_id !== undefined ? d.driver_id : (existing.driver_id as string | null),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    if (msg.includes('OVERLAP_CONFLICT')) {
      res.status(409).json({ error: 'Vehicle already has an overlapping confirmed booking for these dates.' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

// ==========================================
// PAYMENTS
// ==========================================
adminRouter.get('/payments', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, b.reference_id, b.total_amount, c.name as customer_name
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN customers c ON c.id = b.customer_id
       ORDER BY p.payment_date DESC, p.created_at DESC`
    )
    .all();
  res.json(rows);
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
  const booking = db.prepare('SELECT id, total_amount FROM bookings WHERE id = ?').get(d.booking_id) as
    | { id: string; total_amount: number }
    | undefined;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO payments (id, booking_id, amount, payment_type, method, payment_date, transaction_ref) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, d.booking_id, d.amount, d.payment_type, d.method, d.payment_date, d.transaction_ref);

  res.status(201).json({ id, ...computePaymentSummary(d.booking_id, booking.total_amount) });
});

// ==========================================
// DRIVERS
// ==========================================
adminRouter.get('/drivers', (_req, res) => {
  const rows = db.prepare('SELECT * FROM drivers ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  res.json(
    rows.map((d) => ({
      ...d,
      is_active: Boolean(d.is_active),
      licence_expiring_soon: (d.licence_expiry as string) <= in30Days && (d.licence_expiry as string) >= todayStr,
      licence_expired: (d.licence_expiry as string) < todayStr,
    }))
  );
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
  db.prepare(
    'INSERT INTO drivers (id, name, phone, photo_url, licence_no, licence_expiry, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, d.name, d.phone, d.photo_url, d.licence_no, d.licence_expiry, d.is_active ? 1 : 0);
  res.status(201).json({ id });
});

adminRouter.put('/drivers/:id', (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid driver data' });
    return;
  }
  const d = parsed.data;
  db.prepare(
    'UPDATE drivers SET name = ?, phone = ?, photo_url = ?, licence_no = ?, licence_expiry = ?, is_active = ? WHERE id = ?'
  ).run(d.name, d.phone, d.photo_url, d.licence_no, d.licence_expiry, d.is_active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// ==========================================
// CUSTOMERS
// ==========================================
adminRouter.get('/customers', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(b.id) as booking_count, COALESCE(SUM(b.total_amount), 0) as total_spend
       FROM customers c
       LEFT JOIN bookings b ON b.customer_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    )
    .all();
  res.json(rows);
});

adminRouter.get('/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  const bookings = db
    .prepare(
      `SELECT b.*, v.name as vehicle_name, p.name as package_name
       FROM bookings b
       LEFT JOIN vehicles v ON v.id = b.vehicle_id
       LEFT JOIN tour_packages p ON p.id = b.package_id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.params.id);
  res.json({ ...customer, bookings });
});

// ==========================================
// PRICING RULES
// ==========================================
adminRouter.get('/pricing', (_req, res) => {
  const rules = db.prepare('SELECT * FROM pricing_rules ORDER BY category ASC').all() as Record<string, unknown>[];
  res.json(rules.map((r) => ({ ...r, is_active: Boolean(r.is_active) })));
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
  db.prepare(
    `INSERT INTO pricing_rules (
      id, name, category, per_km_rate, min_km_per_day, driver_allowance, night_charge,
      waiting_charge_per_hr, extra_km_charge, seasonal_multiplier, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, d.name, d.category, d.per_km_rate, d.min_km_per_day, d.driver_allowance,
    d.night_charge, d.waiting_charge_per_hr, d.extra_km_charge, d.seasonal_multiplier, d.is_active ? 1 : 0
  );
  res.status(201).json({ id });
});

adminRouter.put('/pricing/:id', (req, res) => {
  const parsed = pricingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid pricing rule' });
    return;
  }
  const d = parsed.data;
  db.prepare(
    `UPDATE pricing_rules SET
      name = ?, category = ?, per_km_rate = ?, min_km_per_day = ?, driver_allowance = ?, night_charge = ?,
      waiting_charge_per_hr = ?, extra_km_charge = ?, seasonal_multiplier = ?, is_active = ?
     WHERE id = ?`
  ).run(
    d.name, d.category, d.per_km_rate, d.min_km_per_day, d.driver_allowance,
    d.night_charge, d.waiting_charge_per_hr, d.extra_km_charge, d.seasonal_multiplier, d.is_active ? 1 : 0, req.params.id
  );
  res.json({ ok: true });
});

// ==========================================
// AVAILABILITY CALENDAR
// ==========================================
adminRouter.get('/calendar', (_req, res) => {
  const vehicles = db
    .prepare('SELECT id, name, brand, status FROM vehicles WHERE is_archived = 0 ORDER BY name ASC')
    .all();

  const bookings = db
    .prepare(
      `SELECT b.id, b.reference_id, b.vehicle_id, b.travel_date, b.return_date, b.destination, b.status,
              c.name as customer_name
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       WHERE b.vehicle_id IS NOT NULL AND b.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress', 'Pending', 'Contacted')
       ORDER BY b.travel_date ASC`
    )
    .all();

  res.json({ vehicles, bookings });
});

// ==========================================
// GALLERY, REVIEWS, FAQS & WEBSITE SETTINGS
// ==========================================
adminRouter.get('/gallery', (_req, res) => {
  res.json(db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC').all());
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
  db.prepare('INSERT INTO gallery (id, image_url, caption, location, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    id, parsed.data.image_url, parsed.data.caption, parsed.data.location, parsed.data.sort_order
  );
  res.status(201).json({ id });
});

adminRouter.delete('/gallery/:id', (req, res) => {
  db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

adminRouter.get('/reviews', (_req, res) => {
  const rows = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() as Record<string, unknown>[];
  res.json(rows.map((r) => ({ ...r, is_approved: Boolean(r.is_approved) })));
});

adminRouter.patch('/reviews/:id', (req, res) => {
  const approved = Boolean(req.body?.is_approved);
  db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?').run(approved ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

adminRouter.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

adminRouter.get('/faqs', (_req, res) => {
  const rows = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all() as Record<string, unknown>[];
  res.json(rows.map((f) => ({ ...f, is_active: Boolean(f.is_active) })));
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
  db.prepare('INSERT INTO faqs (id, question, answer, sort_order, is_active) VALUES (?, ?, ?, ?, ?)').run(
    id, parsed.data.question, parsed.data.answer, parsed.data.sort_order, parsed.data.is_active ? 1 : 0
  );
  res.status(201).json({ id });
});

adminRouter.delete('/faqs/:id', (req, res) => {
  db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

adminRouter.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    out[r.key] = safeJsonParse(r.value, r.value);
  }
  res.json(out);
});

adminRouter.put('/settings', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid settings payload' });
    return;
  }
  const upsert = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  try {
    db.exec('BEGIN');
    for (const [k, v] of Object.entries(body)) {
      if (typeof k === 'string' && k.length > 0 && k.length < 80) {
        upsert.run(k, JSON.stringify(v));
      }
    }
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
  }
});
