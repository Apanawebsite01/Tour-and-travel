import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.ts';

export const publicRouter = Router();

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getSiteSettingsMap(): Record<string, unknown> {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    out[r.key] = safeJsonParse(r.value, r.value);
  }
  return out;
}

function getVehicleImagesMap(): Map<string, string[]> {
  const imgs = db.prepare('SELECT vehicle_id, image_url FROM vehicle_images ORDER BY sort_order ASC').all() as {
    vehicle_id: string;
    image_url: string;
  }[];
  const map = new Map<string, string[]>();
  for (const row of imgs) {
    const arr = map.get(row.vehicle_id) || [];
    arr.push(row.image_url);
    map.set(row.vehicle_id, arr);
  }
  return map;
}

// Public vehicle projection (explicitly excludes registration_no)
function formatPublicVehicle(row: Record<string, unknown>, images: string[]) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    model: row.model,
    seats: row.seats,
    luggage_capacity: row.luggage_capacity,
    is_ac: Boolean(row.is_ac),
    fuel_type: row.fuel_type,
    transmission: row.transmission,
    price_per_km: row.price_per_km,
    daily_rate: row.daily_rate,
    min_km_per_day: row.min_km_per_day,
    driver_allowance: row.driver_allowance,
    driver_available: Boolean(row.driver_available),
    self_drive_available: Boolean(row.self_drive_available),
    status: row.status,
    description: row.description,
    images,
  };
}

function formatPublicPackage(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    days: row.days,
    nights: row.nights,
    price: row.price,
    pickup_location: row.pickup_location,
    dropoff_location: row.dropoff_location,
    itinerary: safeJsonParse(row.itinerary as string, []),
    inclusions: safeJsonParse(row.inclusions as string, []),
    exclusions: safeJsonParse(row.exclusions as string, []),
    suggested_vehicle_id: row.suggested_vehicle_id,
    max_passengers: row.max_passengers,
    status: row.status,
    images: safeJsonParse(row.images as string, []),
    rating: row.rating,
    review_count: row.review_count,
  };
}

// GET /api/public/bootstrap — all safe live website data
publicRouter.get('/bootstrap', (_req, res) => {
  const settings = getSiteSettingsMap();
  const imgMap = getVehicleImagesMap();

  const vehicles = (
    db
      .prepare(
        `SELECT id, name, brand, model, seats, luggage_capacity, is_ac, fuel_type, transmission,
                price_per_km, daily_rate, min_km_per_day, driver_allowance, driver_available,
                self_drive_available, status, description
         FROM vehicles
         WHERE is_archived = 0 AND is_published = 1
         ORDER BY created_at ASC`
      )
      .all() as Record<string, unknown>[]
  ).map((v) => formatPublicVehicle(v, imgMap.get(v.id as string) || []));

  const packages = (
    db
      .prepare("SELECT * FROM tour_packages WHERE status = 'Published' ORDER BY created_at ASC")
      .all() as Record<string, unknown>[]
  ).map(formatPublicPackage);

  const reviews = db
    .prepare('SELECT id, customer_name, location, trip_type, rating, comment, created_at FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC')
    .all();

  const gallery = db
    .prepare('SELECT id, image_url, caption, location, sort_order FROM gallery ORDER BY sort_order ASC, created_at DESC')
    .all();

  const faqs = db
    .prepare('SELECT id, question, answer, sort_order FROM faqs WHERE is_active = 1 ORDER BY sort_order ASC')
    .all();

  res.json({ settings, vehicles, packages, reviews, gallery, faqs });
});

publicRouter.get('/vehicles', (_req, res) => {
  const imgMap = getVehicleImagesMap();
  const rows = db
    .prepare(
      `SELECT id, name, brand, model, seats, luggage_capacity, is_ac, fuel_type, transmission,
              price_per_km, daily_rate, min_km_per_day, driver_allowance, driver_available,
              self_drive_available, status, description
       FROM vehicles
       WHERE is_archived = 0 AND is_published = 1
       ORDER BY created_at ASC`
    )
    .all() as Record<string, unknown>[];
  res.json(rows.map((v) => formatPublicVehicle(v, imgMap.get(v.id as string) || [])));
});

publicRouter.get('/vehicles/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT id, name, brand, model, seats, luggage_capacity, is_ac, fuel_type, transmission,
              price_per_km, daily_rate, min_km_per_day, driver_allowance, driver_available,
              self_drive_available, status, description
       FROM vehicles
       WHERE id = ? AND is_archived = 0 AND is_published = 1`
    )
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  const imgs = (
    db.prepare('SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order ASC').all(req.params.id) as {
      image_url: string;
    }[]
  ).map((i) => i.image_url);
  res.json(formatPublicVehicle(row, imgs));
});

publicRouter.get('/packages', (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM tour_packages WHERE status = 'Published' ORDER BY created_at ASC")
    .all() as Record<string, unknown>[];
  res.json(rows.map(formatPublicPackage));
});

publicRouter.get('/packages/:id', (req, res) => {
  const row = db
    .prepare("SELECT * FROM tour_packages WHERE id = ? AND status = 'Published'")
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  const pkg = formatPublicPackage(row);
  let suggestedVehicle = null;
  if (pkg.suggested_vehicle_id) {
    const v = db
      .prepare(
        `SELECT id, name, brand, model, seats, luggage_capacity, is_ac, fuel_type, transmission,
                price_per_km, daily_rate, min_km_per_day, driver_allowance, driver_available,
                self_drive_available, status, description
         FROM vehicles WHERE id = ? AND is_archived = 0 AND is_published = 1`
      )
      .get(pkg.suggested_vehicle_id as string) as Record<string, unknown> | undefined;
    if (v) {
      const imgs = (
        db.prepare('SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order ASC').all(v.id as string) as {
          image_url: string;
        }[]
      ).map((i) => i.image_url);
      suggestedVehicle = formatPublicVehicle(v, imgs);
    }
  }
  res.json({ ...pkg, suggested_vehicle: suggestedVehicle });
});

const createBookingSchema = z
  .object({
    booking_type: z.enum(['vehicle', 'package']),
    vehicle_id: z.string().optional().nullable(),
    package_id: z.string().optional().nullable(),
    customer_name: z.string().trim().min(2, 'Full name is required').max(120),
    mobile: z
      .string()
      .trim()
      .regex(/^[+\d\s()-]{8,18}$/, 'Please enter a valid 10-digit mobile number'),
    email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
    pickup_location: z.string().trim().min(2, 'Pickup location is required').max(200),
    destination: z.string().trim().min(2, 'Destination is required').max(200),
    travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid travel date is required'),
    pickup_time: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid return date is required'),
    passengers: z.coerce.number().int().min(1).max(30),
    driver_preference: z.enum(['With Driver', 'Self-Drive']).default('With Driver'),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .refine((d) => d.return_date >= d.travel_date, {
    message: 'Return date must be on or after travel date',
    path: ['return_date'],
  });

function generateReferenceId(): string {
  const yr = new Date().getFullYear();
  const rnd = crypto.randomInt(1000, 9999);
  return `TG-${yr}-${rnd}`;
}

// POST /api/public/bookings — strictly forces Pending status + creates customer + logs history
publicRouter.post('/bookings', (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  const normalizedMobile = data.mobile.replace(/\s+/g, ' ').trim();

  let estimatedAmount = 0;
  let vehicleId: string | null = null;
  let packageId: string | null = null;

  const dayDiff = Math.max(
    1,
    Math.ceil((new Date(data.return_date).getTime() - new Date(data.travel_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  if (data.booking_type === 'vehicle') {
    if (!data.vehicle_id) {
      res.status(400).json({ error: 'Please select a vehicle for vehicle rental booking' });
      return;
    }
    const veh = db
      .prepare('SELECT id, daily_rate, driver_allowance, self_drive_available, driver_available, is_archived, is_published FROM vehicles WHERE id = ?')
      .get(data.vehicle_id) as
      | {
          id: string;
          daily_rate: number;
          driver_allowance: number;
          self_drive_available: number;
          driver_available: number;
          is_archived: number;
          is_published: number;
        }
      | undefined;

    if (!veh || veh.is_archived || !veh.is_published) {
      res.status(404).json({ error: 'Selected vehicle is not available' });
      return;
    }
    if (data.driver_preference === 'Self-Drive' && !veh.self_drive_available) {
      res.status(400).json({ error: 'Self-drive is not available for the selected vehicle' });
      return;
    }
    vehicleId = veh.id;
    const allowance = data.driver_preference === 'With Driver' ? veh.driver_allowance * dayDiff : 0;
    estimatedAmount = veh.daily_rate * dayDiff + allowance;
  } else {
    if (!data.package_id) {
      res.status(400).json({ error: 'Please select a tour package' });
      return;
    }
    const pkg = db
      .prepare("SELECT id, price, suggested_vehicle_id, status FROM tour_packages WHERE id = ? AND status = 'Published'")
      .get(data.package_id) as
      | { id: string; price: number; suggested_vehicle_id: string | null; status: string }
      | undefined;
    if (!pkg) {
      res.status(404).json({ error: 'Selected tour package is not available' });
      return;
    }
    packageId = pkg.id;
    vehicleId = pkg.suggested_vehicle_id || null;
    estimatedAmount = pkg.price * Math.max(1, Math.ceil(data.passengers / 2));
  }

  try {
    db.exec('BEGIN');

    // Find or create customer by mobile
    let customer = db.prepare('SELECT id FROM customers WHERE mobile = ?').get(normalizedMobile) as
      | { id: string }
      | undefined;

    if (!customer) {
      const custId = crypto.randomUUID();
      db.prepare('INSERT INTO customers (id, name, mobile, email) VALUES (?, ?, ?, ?)').run(
        custId,
        data.customer_name,
        normalizedMobile,
        data.email || null
      );
      customer = { id: custId };
    } else {
      db.prepare('UPDATE customers SET name = ?, email = COALESCE(?, email) WHERE id = ?').run(
        data.customer_name,
        data.email || null,
        customer.id
      );
    }

    let referenceId = generateReferenceId();
    while (db.prepare('SELECT 1 FROM bookings WHERE reference_id = ?').get(referenceId)) {
      referenceId = generateReferenceId();
    }

    const bookingId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO bookings (
        id, reference_id, booking_type, customer_id, vehicle_id, package_id, driver_id,
        pickup_location, destination, travel_date, pickup_time, return_date, passengers,
        driver_preference, notes, status, total_amount, quotation_breakdown
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`
    ).run(
      bookingId,
      referenceId,
      data.booking_type,
      customer.id,
      vehicleId,
      packageId,
      data.pickup_location,
      data.destination,
      data.travel_date,
      data.pickup_time,
      data.return_date,
      data.passengers,
      data.driver_preference,
      data.notes,
      estimatedAmount,
      JSON.stringify({ estimated_days: dayDiff, estimated_total: estimatedAmount })
    );

    db.prepare(
      'INSERT INTO booking_status_history (id, booking_id, old_status, new_status, changed_by, note) VALUES (?, ?, NULL, ?, NULL, ?)'
    ).run(crypto.randomUUID(), bookingId, 'Pending', 'Booking request submitted by customer');

    db.exec('COMMIT');

    res.status(201).json({
      id: bookingId,
      reference_id: referenceId,
      status: 'Pending',
      estimated_amount: estimatedAmount,
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to save booking' });
  }
});

// GET /api/public/bookings/:referenceId — safe summary for Booking Success page
publicRouter.get('/bookings/:referenceId', (req, res) => {
  const row = db
    .prepare(
      `SELECT b.reference_id, b.booking_type, b.pickup_location, b.destination,
              b.travel_date, b.pickup_time, b.return_date, b.passengers,
              b.driver_preference, b.status, b.total_amount, b.created_at,
              v.name as vehicle_name, p.name as package_name
       FROM bookings b
       LEFT JOIN vehicles v ON v.id = b.vehicle_id
       LEFT JOIN tour_packages p ON p.id = b.package_id
       WHERE b.reference_id = ?`
    )
    .get(req.params.referenceId);

  if (!row) {
    res.status(404).json({ error: 'Booking reference not found' });
    return;
  }
  res.json(row);
});

const reviewSubmitSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(100).default('India'),
  trip_type: z.string().trim().min(2).max(100).default('Tour Package'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10, 'Please share a few words about your trip').max(1000),
});

publicRouter.post('/reviews', (req, res) => {
  const parsed = reviewSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid review input' });
    return;
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO reviews (id, customer_name, location, trip_type, rating, comment, is_approved) VALUES (?, ?, ?, ?, ?, ?, 0)'
  ).run(id, d.customer_name, d.location, d.trip_type, d.rating, d.comment);
  res.status(201).json({ id, message: 'Thank you! Your review has been submitted for moderation.' });
});
