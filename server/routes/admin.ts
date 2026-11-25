import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { and, asc, desc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  bookings,
  bookingStatusHistory,
  customers,
  drivers,
  faqs,
  gallery,
  payments,
  pricingRules,
  profiles,
  reviews,
  siteSettings,
  tourPackages,
  vehicleImages,
  vehicles,
} from '../../src/db/schema.ts';
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

async function computePaymentSummary(bookingId: string, totalAmount: number) {
  const rows = await db
    .select({ amount: payments.amount, payment_type: payments.payment_type })
    .from(payments)
    .where(eq(payments.booking_id, bookingId));
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
    const passwordHash = hashPassword(password);
    const id = existing?.id || crypto.randomUUID();

    if (existing) {
      await db
        .update(profiles)
        .set({ full_name, email, password_hash: passwordHash })
        .where(eq(profiles.id, id));
    } else {
      await db.insert(profiles).values({
        id,
        full_name,
        email,
        role: 'admin',
        password_hash: passwordHash,
      });
    }

    const token = signAdminToken({ sub: id, email, role: 'admin' });
    res.status(201).json({
      token,
      admin: { id, full_name, email, role: 'admin' },
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
      let adminId = profile?.id;
      const adminEmail = profile?.email || parsed.data.email || 'admin@travelgo.in';
      const adminName = profile?.full_name || 'TravelGo Admin';
      if (!profile) {
        adminId = crypto.randomUUID();
        await db.insert(profiles).values({
          id: adminId,
          full_name: adminName,
          email: adminEmail,
          role: 'admin',
        });
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
    const id = profile?.id || req.admin!.sub;
    const { full_name, email, password } = parsed.data;
    const newHash = password ? hashPassword(password) : profile?.password_hash || null;

    if (profile) {
      await db
        .update(profiles)
        .set({ full_name, email, password_hash: newHash })
        .where(eq(profiles.id, id));
    } else {
      await db.insert(profiles).values({
        id,
        full_name,
        email,
        role: 'admin',
        password_hash: newHash,
      });
    }

    const token = signAdminToken({ sub: id, email, role: 'admin' });
    res.json({
      token,
      admin: { id, full_name, email, role: 'admin' },
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

  fs.writeFileSync(targetPath, buffer);
  res.status(201).json({ url: `/uploads/${safeName}` });
});

// ==========================================
// DASHBOARD & REPORTS
// ==========================================
adminRouter.get('/dashboard', async (_req, res) => {
  try {
    const [allVehicles, allBookings, allPayments, allCustomers, allDrivers, allPackages] = await Promise.all([
      db.select().from(vehicles).where(eq(vehicles.is_archived, false)),
      db.select().from(bookings).orderBy(desc(bookings.created_at)),
      db.select().from(payments),
      db.select({ id: customers.id, name: customers.name, mobile: customers.mobile }).from(customers),
      db.select({ id: drivers.id, name: drivers.name }).from(drivers),
      db.select({ id: tourPackages.id, name: tourPackages.name }).from(tourPackages),
    ]);

    const custMap = new Map(allCustomers.map((c) => [c.id, c]));
    const vehMap = new Map(allVehicles.map((v) => [v.id, v]));
    const drvMap = new Map(allDrivers.map((d) => [d.id, d]));
    const pkgMap = new Map(allPackages.map((p) => [p.id, p]));

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

adminRouter.get('/reports', async (_req, res) => {
  try {
    const [allBookings, allVehicles, allPayments] = await Promise.all([
      db.select().from(bookings),
      db.select().from(vehicles).where(eq(vehicles.is_archived, false)),
      db.select().from(payments),
    ]);

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
adminRouter.get('/vehicles', async (req, res) => {
  try {
    const includeArchived = req.query.archived === 'true';
    const [rows, imgs] = await Promise.all([
      includeArchived
        ? db.select().from(vehicles).orderBy(desc(vehicles.created_at))
        : db.select().from(vehicles).where(eq(vehicles.is_archived, false)).orderBy(desc(vehicles.created_at)),
      db.select().from(vehicleImages).orderBy(asc(vehicleImages.sort_order)),
    ]);

    const imgMap = new Map<string, string[]>();
    for (const i of imgs) {
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

adminRouter.get('/vehicles/:id', async (req, res) => {
  try {
    const vRows = await db.select().from(vehicles).where(eq(vehicles.id, req.params.id)).limit(1);
    const v = vRows[0];
    if (!v) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const [imgs, bookingHistory] = await Promise.all([
      db
        .select({ image_url: vehicleImages.image_url })
        .from(vehicleImages)
        .where(eq(vehicleImages.vehicle_id, req.params.id))
        .orderBy(asc(vehicleImages.sort_order)),
      db
        .select({
          id: bookings.id,
          reference_id: bookings.reference_id,
          travel_date: bookings.travel_date,
          return_date: bookings.return_date,
          destination: bookings.destination,
          status: bookings.status,
          total_amount: bookings.total_amount,
          customer_name: customers.name,
        })
        .from(bookings)
        .innerJoin(customers, eq(customers.id, bookings.customer_id))
        .where(eq(bookings.vehicle_id, req.params.id))
        .orderBy(desc(bookings.travel_date)),
    ]);

    res.json({
      ...v,
      images: imgs.map((i) => i.image_url),
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

adminRouter.post('/vehicles', async (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle fields' });
    return;
  }
  const d = parsed.data;
  const id = `veh-${crypto.randomUUID().slice(0, 8)}`;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(vehicles).values({
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
      });
      for (let idx = 0; idx < d.images.length; idx++) {
        await tx.insert(vehicleImages).values({
          id: crypto.randomUUID(),
          vehicle_id: id,
          image_url: d.images[idx],
          sort_order: idx,
        });
      }
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create vehicle failed:', err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

adminRouter.put('/vehicles/:id', async (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle fields' });
    return;
  }
  const d = parsed.data;

  try {
    const existing = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, req.params.id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(vehicles)
        .set({
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
        })
        .where(eq(vehicles.id, req.params.id));

      await tx.delete(vehicleImages).where(eq(vehicleImages.vehicle_id, req.params.id));
      for (let idx = 0; idx < d.images.length; idx++) {
        await tx.insert(vehicleImages).values({
          id: crypto.randomUUID(),
          vehicle_id: req.params.id,
          image_url: d.images[idx],
          sort_order: idx,
        });
      }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Update vehicle failed:', err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

adminRouter.patch('/vehicles/:id/archive', async (req, res) => {
  try {
    const archived = Boolean(req.body?.is_archived ?? true);
    const cur = await db.select({ is_published: vehicles.is_published }).from(vehicles).where(eq(vehicles.id, req.params.id)).limit(1);
    if (cur.length === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    await db
      .update(vehicles)
      .set({
        is_archived: archived,
        is_published: archived ? false : cur[0].is_published,
      })
      .where(eq(vehicles.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Archive vehicle failed:', err);
    res.status(500).json({ error: 'Unable to update vehicle archive state' });
  }
});

// ==========================================
// TOUR PACKAGES MANAGEMENT
// ==========================================
adminRouter.get('/packages', async (_req, res) => {
  try {
    const rows = await db.select().from(tourPackages).orderBy(desc(tourPackages.created_at));
    res.json(rows);
  } catch (err) {
    console.error('Admin packages list failed:', err);
    res.status(500).json({ error: 'Unable to load tour packages' });
  }
});

adminRouter.get('/packages/:id', async (req, res) => {
  try {
    const rows = await db.select().from(tourPackages).where(eq(tourPackages.id, req.params.id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    res.json(rows[0]);
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

adminRouter.post('/packages', async (req, res) => {
  const parsed = packageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid package input' });
    return;
  }
  const d = parsed.data;
  const id = `pkg-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await db.insert(tourPackages).values({
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
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create package failed:', err);
    res.status(500).json({ error: 'Unable to create package' });
  }
});

adminRouter.put('/packages/:id', async (req, res) => {
  const parsed = packageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid package input' });
    return;
  }
  const d = parsed.data;
  try {
    await db
      .update(tourPackages)
      .set({
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
      })
      .where(eq(tourPackages.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Update package failed:', err);
    res.status(500).json({ error: 'Unable to update package' });
  }
});

// ==========================================
// BOOKING MANAGEMENT + OVERLAP CHECK + STATE MACHINE
// ==========================================
adminRouter.get('/bookings', async (req, res) => {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const [rows, allPayments] = await Promise.all([
      db
        .select({
          id: bookings.id,
          reference_id: bookings.reference_id,
          booking_type: bookings.booking_type,
          customer_id: bookings.customer_id,
          vehicle_id: bookings.vehicle_id,
          package_id: bookings.package_id,
          driver_id: bookings.driver_id,
          pickup_location: bookings.pickup_location,
          destination: bookings.destination,
          travel_date: bookings.travel_date,
          pickup_time: bookings.pickup_time,
          return_date: bookings.return_date,
          passengers: bookings.passengers,
          driver_preference: bookings.driver_preference,
          notes: bookings.notes,
          status: bookings.status,
          total_amount: bookings.total_amount,
          quotation_breakdown: bookings.quotation_breakdown,
          admin_notes: bookings.admin_notes,
          created_at: bookings.created_at,
          customer_name: customers.name,
          customer_mobile: customers.mobile,
          customer_email: customers.email,
          vehicle_name: vehicles.name,
          vehicle_reg: vehicles.registration_no,
          package_name: tourPackages.name,
          driver_name: drivers.name,
          driver_phone: drivers.phone,
        })
        .from(bookings)
        .innerJoin(customers, eq(customers.id, bookings.customer_id))
        .leftJoin(vehicles, eq(vehicles.id, bookings.vehicle_id))
        .leftJoin(tourPackages, eq(tourPackages.id, bookings.package_id))
        .leftJoin(drivers, eq(drivers.id, bookings.driver_id))
        .orderBy(desc(bookings.created_at)),
      db.select({ booking_id: payments.booking_id, amount: payments.amount, payment_type: payments.payment_type }).from(payments),
    ]);

    const payByBooking = new Map<string, Array<{ amount: number; payment_type: string }>>();
    for (const p of allPayments) {
      const arr = payByBooking.get(p.booking_id) || [];
      arr.push({ amount: p.amount, payment_type: p.payment_type });
      payByBooking.set(p.booking_id, arr);
    }

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
        ...computePaymentSummaryFromRows(payByBooking.get(r.id) || [], Number(r.total_amount || 0)),
      }));

    res.json(enriched);
  } catch (err) {
    console.error('Admin bookings list failed:', err);
    res.status(500).json({ error: 'Unable to load bookings' });
  }
});

adminRouter.get('/bookings/:id', async (req, res) => {
  try {
    const rows = await db
      .select({
        id: bookings.id,
        reference_id: bookings.reference_id,
        booking_type: bookings.booking_type,
        customer_id: bookings.customer_id,
        vehicle_id: bookings.vehicle_id,
        package_id: bookings.package_id,
        driver_id: bookings.driver_id,
        pickup_location: bookings.pickup_location,
        destination: bookings.destination,
        travel_date: bookings.travel_date,
        pickup_time: bookings.pickup_time,
        return_date: bookings.return_date,
        passengers: bookings.passengers,
        driver_preference: bookings.driver_preference,
        notes: bookings.notes,
        status: bookings.status,
        total_amount: bookings.total_amount,
        quotation_breakdown: bookings.quotation_breakdown,
        admin_notes: bookings.admin_notes,
        created_at: bookings.created_at,
        customer_name: customers.name,
        customer_mobile: customers.mobile,
        customer_email: customers.email,
        vehicle_name: vehicles.name,
        vehicle_brand: vehicles.brand,
        vehicle_model: vehicles.model,
        vehicle_reg: vehicles.registration_no,
        price_per_km: vehicles.price_per_km,
        daily_rate: vehicles.daily_rate,
        min_km_per_day: vehicles.min_km_per_day,
        driver_allowance: vehicles.driver_allowance,
        package_name: tourPackages.name,
        package_days: tourPackages.days,
        package_nights: tourPackages.nights,
        driver_name: drivers.name,
        driver_phone: drivers.phone,
        driver_licence: drivers.licence_no,
      })
      .from(bookings)
      .innerJoin(customers, eq(customers.id, bookings.customer_id))
      .leftJoin(vehicles, eq(vehicles.id, bookings.vehicle_id))
      .leftJoin(tourPackages, eq(tourPackages.id, bookings.package_id))
      .leftJoin(drivers, eq(drivers.id, bookings.driver_id))
      .where(eq(bookings.id, req.params.id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const [payRows, historyRows, activeDrivers, busyDriverBookings, conflicts] = await Promise.all([
      db
        .select()
        .from(payments)
        .where(eq(payments.booking_id, req.params.id))
        .orderBy(desc(payments.payment_date), desc(payments.created_at)),
      db
        .select()
        .from(bookingStatusHistory)
        .where(eq(bookingStatusHistory.booking_id, req.params.id))
        .orderBy(desc(bookingStatusHistory.changed_at)),
      db
        .select()
        .from(drivers)
        .where(and(eq(drivers.is_active, true), gte(drivers.licence_expiry, row.return_date))),
      db
        .select({ driver_id: bookings.driver_id })
        .from(bookings)
        .where(
          and(
            ne(bookings.id, req.params.id),
            inArray(bookings.status, [...ACTIVE_STATUSES]),
            lte(bookings.travel_date, row.return_date),
            gte(bookings.return_date, row.travel_date)
          )
        ),
      row.vehicle_id
        ? db
            .select({
              id: bookings.id,
              reference_id: bookings.reference_id,
              travel_date: bookings.travel_date,
              return_date: bookings.return_date,
              status: bookings.status,
            })
            .from(bookings)
            .where(
              and(
                ne(bookings.id, req.params.id),
                eq(bookings.vehicle_id, row.vehicle_id),
                inArray(bookings.status, [...ACTIVE_STATUSES]),
                lte(bookings.travel_date, row.return_date),
                gte(bookings.return_date, row.travel_date)
              )
            )
        : Promise.resolve([]),
    ]);

    const busyDriverIds = new Set(busyDriverBookings.map((b) => b.driver_id).filter(Boolean));
    const availableDrivers = activeDrivers.filter((d) => !busyDriverIds.has(d.id));

    res.json({
      ...row,
      ...computePaymentSummaryFromRows(payRows, Number(row.total_amount || 0)),
      payments: payRows,
      history: historyRows,
      conflicts,
      availableDrivers,
      allowedNextStatuses: VALID_TRANSITIONS[row.status] || [],
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

adminRouter.patch('/bookings/:id/status', async (req: AuthenticatedRequest, res) => {
  const parsed = updateBookingStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status update' });
    return;
  }

  try {
    const bRows = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
    const booking = bRows[0];
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
      const drvRows = await db
        .select({ id: drivers.id, licence_expiry: drivers.licence_expiry, is_active: drivers.is_active })
        .from(drivers)
        .where(eq(drivers.id, targetDriverId))
        .limit(1);
      const drv = drvRows[0];
      if (!drv || !drv.is_active) {
        res.status(400).json({ error: 'Selected driver is inactive or missing.' });
        return;
      }
      if (drv.licence_expiry < booking.return_date) {
        res.status(400).json({ error: 'Driver licence expires before the trip return date.' });
        return;
      }
      const driverConflicts = await db
        .select({ reference_id: bookings.reference_id })
        .from(bookings)
        .where(
          and(
            ne(bookings.id, req.params.id),
            eq(bookings.driver_id, targetDriverId),
            inArray(bookings.status, [...ACTIVE_STATUSES]),
            lte(bookings.travel_date, booking.return_date),
            gte(bookings.return_date, booking.travel_date)
          )
        )
        .limit(1);

      if (driverConflicts.length > 0) {
        res.status(409).json({
          error: `Selected driver is already assigned to booking ${driverConflicts[0].reference_id} on overlapping dates.`,
        });
        return;
      }
    }

    await db.transaction(async (tx) => {
      if (targetVehicleId && (ACTIVE_STATUSES as readonly string[]).includes(nextStatus)) {
        const vehicleConflicts = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              ne(bookings.id, req.params.id),
              eq(bookings.vehicle_id, targetVehicleId),
              inArray(bookings.status, [...ACTIVE_STATUSES]),
              lte(bookings.travel_date, booking.return_date),
              gte(bookings.return_date, booking.travel_date)
            )
          )
          .limit(1);

        if (vehicleConflicts.length > 0) {
          throw new Error('OVERLAP_CONFLICT');
        }
      }

      await tx
        .update(bookings)
        .set({
          status: nextStatus,
          vehicle_id: targetVehicleId,
          driver_id: targetDriverId,
        })
        .where(eq(bookings.id, req.params.id));

      await tx.insert(bookingStatusHistory).values({
        id: crypto.randomUUID(),
        booking_id: req.params.id,
        old_status: currentStatus,
        new_status: nextStatus,
        changed_by: req.admin!.sub,
        note: parsed.data.note || `Status changed to ${nextStatus}`,
      });
    });

    res.json({ ok: true, status: nextStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Status update failed';
    if (msg.includes('OVERLAP_CONFLICT')) {
      res.status(409).json({
        error: 'Vehicle overlap conflict: another confirmed/active booking already occupies this vehicle for overlapping dates.',
      });
      return;
    }
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

adminRouter.patch('/bookings/:id', async (req, res) => {
  const parsed = updateBookingDetailsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid booking update fields' });
    return;
  }

  try {
    const bRows = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
    const existing = bRows[0];
    if (!existing) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const d = parsed.data;
    const nextVehicleId = d.vehicle_id !== undefined ? d.vehicle_id : existing.vehicle_id;
    const nextDriverId = d.driver_id !== undefined ? d.driver_id : existing.driver_id;

    await db.transaction(async (tx) => {
      if (nextVehicleId && (ACTIVE_STATUSES as readonly string[]).includes(existing.status)) {
        const vehicleConflicts = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              ne(bookings.id, req.params.id),
              eq(bookings.vehicle_id, nextVehicleId),
              inArray(bookings.status, [...ACTIVE_STATUSES]),
              lte(bookings.travel_date, existing.return_date),
              gte(bookings.return_date, existing.travel_date)
            )
          )
          .limit(1);

        if (vehicleConflicts.length > 0) {
          throw new Error('OVERLAP_CONFLICT');
        }
      }

      await tx
        .update(bookings)
        .set({
          total_amount: d.total_amount ?? existing.total_amount,
          quotation_breakdown: d.quotation_breakdown ?? existing.quotation_breakdown,
          admin_notes: d.admin_notes ?? existing.admin_notes,
          vehicle_id: nextVehicleId,
          driver_id: nextDriverId,
        })
        .where(eq(bookings.id, req.params.id));
    });

    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    if (msg.includes('OVERLAP_CONFLICT')) {
      res.status(409).json({ error: 'Vehicle already has an overlapping confirmed booking for these dates.' });
      return;
    }
    console.error('Update booking details failed:', err);
    res.status(500).json({ error: 'Unable to update booking details' });
  }
});

// ==========================================
// PAYMENTS
// ==========================================
adminRouter.get('/payments', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: payments.id,
        booking_id: payments.booking_id,
        amount: payments.amount,
        payment_type: payments.payment_type,
        method: payments.method,
        payment_date: payments.payment_date,
        transaction_ref: payments.transaction_ref,
        created_at: payments.created_at,
        reference_id: bookings.reference_id,
        total_amount: bookings.total_amount,
        customer_name: customers.name,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.booking_id))
      .innerJoin(customers, eq(customers.id, bookings.customer_id))
      .orderBy(desc(payments.payment_date), desc(payments.created_at));
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

adminRouter.post('/payments', async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payment payload' });
    return;
  }
  const d = parsed.data;
  try {
    const bRows = await db
      .select({ id: bookings.id, total_amount: bookings.total_amount })
      .from(bookings)
      .where(eq(bookings.id, d.booking_id))
      .limit(1);
    const booking = bRows[0];
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const id = crypto.randomUUID();
    await db.insert(payments).values({
      id,
      booking_id: d.booking_id,
      amount: d.amount,
      payment_type: d.payment_type,
      method: d.method,
      payment_date: d.payment_date,
      transaction_ref: d.transaction_ref,
    });

    const summary = await computePaymentSummary(d.booking_id, booking.total_amount);
    res.status(201).json({ id, ...summary });
  } catch (err) {
    console.error('Create payment failed:', err);
    res.status(500).json({ error: 'Unable to record payment' });
  }
});

// ==========================================
// DRIVERS
// ==========================================
adminRouter.get('/drivers', async (_req, res) => {
  try {
    const rows = await db.select().from(drivers).orderBy(desc(drivers.created_at));
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

adminRouter.post('/drivers', async (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid driver data' });
    return;
  }
  const d = parsed.data;
  const id = `drv-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await db.insert(drivers).values({
      id,
      name: d.name,
      phone: d.phone,
      photo_url: d.photo_url,
      licence_no: d.licence_no,
      licence_expiry: d.licence_expiry,
      is_active: d.is_active,
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create driver failed:', err);
    res.status(500).json({ error: 'Unable to create driver' });
  }
});

adminRouter.put('/drivers/:id', async (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid driver data' });
    return;
  }
  const d = parsed.data;
  try {
    await db
      .update(drivers)
      .set({
        name: d.name,
        phone: d.phone,
        photo_url: d.photo_url,
        licence_no: d.licence_no,
        licence_expiry: d.licence_expiry,
        is_active: d.is_active,
      })
      .where(eq(drivers.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Update driver failed:', err);
    res.status(500).json({ error: 'Unable to update driver' });
  }
});

// ==========================================
// CUSTOMERS
// ==========================================
adminRouter.get('/customers', async (_req, res) => {
  try {
    const [custRows, bookingRows] = await Promise.all([
      db.select().from(customers).orderBy(desc(customers.created_at)),
      db.select({ customer_id: bookings.customer_id, total_amount: bookings.total_amount }).from(bookings),
    ]);

    const agg = new Map<string, { booking_count: number; total_spend: number }>();
    for (const b of bookingRows) {
      const cur = agg.get(b.customer_id) || { booking_count: 0, total_spend: 0 };
      cur.booking_count += 1;
      cur.total_spend += Number(b.total_amount || 0);
      agg.set(b.customer_id, cur);
    }

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

adminRouter.get('/customers/:id', async (req, res) => {
  try {
    const cRows = await db.select().from(customers).where(eq(customers.id, req.params.id)).limit(1);
    const customer = cRows[0];
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const custBookings = await db
      .select({
        id: bookings.id,
        reference_id: bookings.reference_id,
        booking_type: bookings.booking_type,
        destination: bookings.destination,
        travel_date: bookings.travel_date,
        return_date: bookings.return_date,
        status: bookings.status,
        total_amount: bookings.total_amount,
        created_at: bookings.created_at,
        vehicle_name: vehicles.name,
        package_name: tourPackages.name,
      })
      .from(bookings)
      .leftJoin(vehicles, eq(vehicles.id, bookings.vehicle_id))
      .leftJoin(tourPackages, eq(tourPackages.id, bookings.package_id))
      .where(eq(bookings.customer_id, req.params.id))
      .orderBy(desc(bookings.created_at));

    res.json({ ...customer, bookings: custBookings });
  } catch (err) {
    console.error('Admin customer detail failed:', err);
    res.status(500).json({ error: 'Unable to load customer details' });
  }
});

// ==========================================
// PRICING RULES
// ==========================================
adminRouter.get('/pricing', async (_req, res) => {
  try {
    const rules = await db.select().from(pricingRules).orderBy(asc(pricingRules.category));
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

adminRouter.post('/pricing', async (req, res) => {
  const parsed = pricingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid pricing rule' });
    return;
  }
  const d = parsed.data;
  const id = `pr-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await db.insert(pricingRules).values({
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
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create pricing rule failed:', err);
    res.status(500).json({ error: 'Unable to create pricing rule' });
  }
});

adminRouter.put('/pricing/:id', async (req, res) => {
  const parsed = pricingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid pricing rule' });
    return;
  }
  const d = parsed.data;
  try {
    await db
      .update(pricingRules)
      .set({
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
      })
      .where(eq(pricingRules.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Update pricing rule failed:', err);
    res.status(500).json({ error: 'Unable to update pricing rule' });
  }
});

// ==========================================
// AVAILABILITY CALENDAR
// ==========================================
adminRouter.get('/calendar', async (_req, res) => {
  try {
    const [vehRows, bookingRows] = await Promise.all([
      db
        .select({ id: vehicles.id, name: vehicles.name, brand: vehicles.brand, status: vehicles.status })
        .from(vehicles)
        .where(eq(vehicles.is_archived, false))
        .orderBy(asc(vehicles.name)),
      db
        .select({
          id: bookings.id,
          reference_id: bookings.reference_id,
          vehicle_id: bookings.vehicle_id,
          travel_date: bookings.travel_date,
          return_date: bookings.return_date,
          destination: bookings.destination,
          status: bookings.status,
          customer_name: customers.name,
        })
        .from(bookings)
        .innerJoin(customers, eq(customers.id, bookings.customer_id))
        .where(inArray(bookings.status, ['Confirmed', 'Vehicle Assigned', 'In Progress', 'Pending', 'Contacted']))
        .orderBy(asc(bookings.travel_date)),
    ]);

    res.json({
      vehicles: vehRows,
      bookings: bookingRows.filter((b) => Boolean(b.vehicle_id)),
    });
  } catch (err) {
    console.error('Calendar load failed:', err);
    res.status(500).json({ error: 'Unable to load availability calendar' });
  }
});

// ==========================================
// GALLERY, REVIEWS, FAQS & WEBSITE SETTINGS
// ==========================================
adminRouter.get('/gallery', async (_req, res) => {
  try {
    const rows = await db.select().from(gallery).orderBy(asc(gallery.sort_order), desc(gallery.created_at));
    res.json(rows);
  } catch (err) {
    console.error('Gallery list failed:', err);
    res.status(500).json({ error: 'Unable to load gallery' });
  }
});

adminRouter.post('/gallery', async (req, res) => {
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
    await db.insert(gallery).values({
      id,
      image_url: parsed.data.image_url,
      caption: parsed.data.caption,
      location: parsed.data.location,
      sort_order: parsed.data.sort_order,
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Add gallery failed:', err);
    res.status(500).json({ error: 'Unable to add gallery image' });
  }
});

adminRouter.delete('/gallery/:id', async (req, res) => {
  try {
    await db.delete(gallery).where(eq(gallery.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete gallery failed:', err);
    res.status(500).json({ error: 'Unable to delete gallery image' });
  }
});

adminRouter.get('/reviews', async (_req, res) => {
  try {
    const rows = await db.select().from(reviews).orderBy(desc(reviews.created_at));
    res.json(rows);
  } catch (err) {
    console.error('Admin reviews list failed:', err);
    res.status(500).json({ error: 'Unable to load reviews' });
  }
});

adminRouter.patch('/reviews/:id', async (req, res) => {
  try {
    const approved = Boolean(req.body?.is_approved);
    await db.update(reviews).set({ is_approved: approved }).where(eq(reviews.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Toggle review failed:', err);
    res.status(500).json({ error: 'Unable to update review' });
  }
});

adminRouter.delete('/reviews/:id', async (req, res) => {
  try {
    await db.delete(reviews).where(eq(reviews.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete review failed:', err);
    res.status(500).json({ error: 'Unable to delete review' });
  }
});

adminRouter.get('/faqs', async (_req, res) => {
  try {
    const rows = await db.select().from(faqs).orderBy(asc(faqs.sort_order));
    res.json(rows);
  } catch (err) {
    console.error('Admin FAQs list failed:', err);
    res.status(500).json({ error: 'Unable to load FAQs' });
  }
});

adminRouter.post('/faqs', async (req, res) => {
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
    await db.insert(faqs).values({
      id,
      question: parsed.data.question,
      answer: parsed.data.answer,
      sort_order: parsed.data.sort_order,
      is_active: parsed.data.is_active,
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create FAQ failed:', err);
    res.status(500).json({ error: 'Unable to add FAQ' });
  }
});

adminRouter.delete('/faqs/:id', async (req, res) => {
  try {
    await db.delete(faqs).where(eq(faqs.id, req.params.id));
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

adminRouter.get('/settings', async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettings);
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      out[r.key] = STRING_SETTING_KEYS.has(r.key) && r.value !== null && r.value !== undefined ? String(r.value) : r.value;
    }
    res.json(out);
  } catch (err) {
    console.error('Admin settings load failed:', err);
    res.status(500).json({ error: 'Unable to load website settings' });
  }
});

adminRouter.put('/settings', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid settings payload' });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      for (const [k, v] of Object.entries(body)) {
        if (typeof k === 'string' && k.length > 0 && k.length < 80) {
          await tx
            .insert(siteSettings)
            .values({ key: k, value: v })
            .onConflictDoUpdate({ target: siteSettings.key, set: { value: v } });
        }
      }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Save settings failed:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});
