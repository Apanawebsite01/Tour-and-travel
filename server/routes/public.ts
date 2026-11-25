import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { getStore, saveStore, upsertLocalUser, type VehicleRecord } from '../store.ts';
import { adminAuth } from '../../src/lib/firebase-admin.ts';
import { requireAuth, type FirebaseAuthRequest } from '../../src/middleware/auth.ts';

export const publicRouter = Router();

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

function getSiteSettingsMap(): Record<string, unknown> {
  const store = getStore();
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(store.site_settings || {})) {
    out[key] = STRING_SETTING_KEYS.has(key) && val !== null && val !== undefined ? String(val) : val;
  }
  return out;
}

function getVehicleImagesMap(): Map<string, string[]> {
  const store = getStore();
  const sorted = [...store.vehicle_images].sort((a, b) => a.sort_order - b.sort_order);
  const map = new Map<string, string[]>();
  for (const row of sorted) {
    const arr = map.get(row.vehicle_id) || [];
    arr.push(row.image_url);
    map.set(row.vehicle_id, arr);
  }
  return map;
}

// Public vehicle projection (explicitly excludes registration_no)
function formatPublicVehicle(row: VehicleRecord, images: string[]) {
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

// GET /api/public/bootstrap — all safe live website data
publicRouter.get('/bootstrap', (_req, res) => {
  try {
    const store = getStore();
    const imgMap = getVehicleImagesMap();

    const formattedVehicles = store.vehicles
      .filter((v) => !v.is_archived && v.is_published)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((v) => formatPublicVehicle(v, imgMap.get(v.id) || []));

    const packages = store.tour_packages
      .filter((p) => p.status === 'Published')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const reviews = store.reviews
      .filter((r) => r.is_approved)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const gallery = [...store.gallery].sort(
      (a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)
    );

    const faqs = store.faqs
      .filter((f) => f.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);

    res.json({
      settings: getSiteSettingsMap(),
      vehicles: formattedVehicles,
      packages,
      reviews,
      gallery,
      faqs,
    });
  } catch (error) {
    console.error('Bootstrap query failed:', error);
    res.status(500).json({ error: 'Unable to load catalog data. Please try again.' });
  }
});

publicRouter.get('/vehicles', (_req, res) => {
  try {
    const store = getStore();
    const imgMap = getVehicleImagesMap();
    const rows = store.vehicles
      .filter((v) => !v.is_archived && v.is_published)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    res.json(rows.map((v) => formatPublicVehicle(v, imgMap.get(v.id) || [])));
  } catch (error) {
    console.error('Vehicles query failed:', error);
    res.status(500).json({ error: 'Unable to load vehicles.' });
  }
});

publicRouter.get('/vehicles/:id', (req, res) => {
  try {
    const store = getStore();
    const row = store.vehicles.find((v) => v.id === req.params.id && !v.is_archived && v.is_published);
    if (!row) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    const imgs = store.vehicle_images
      .filter((i) => i.vehicle_id === req.params.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.image_url);

    res.json(formatPublicVehicle(row, imgs));
  } catch (error) {
    console.error('Vehicle detail query failed:', error);
    res.status(500).json({ error: 'Unable to load vehicle details.' });
  }
});

publicRouter.get('/packages', (_req, res) => {
  try {
    const store = getStore();
    const rows = store.tour_packages
      .filter((p) => p.status === 'Published')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    res.json(rows);
  } catch (error) {
    console.error('Packages query failed:', error);
    res.status(500).json({ error: 'Unable to load tour packages.' });
  }
});

publicRouter.get('/packages/:id', (req, res) => {
  try {
    const store = getStore();
    const pkg = store.tour_packages.find((p) => p.id === req.params.id && p.status === 'Published');
    if (!pkg) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    let suggestedVehicle = null;
    if (pkg.suggested_vehicle_id) {
      const v = store.vehicles.find(
        (veh) => veh.id === pkg.suggested_vehicle_id && !veh.is_archived && veh.is_published
      );
      if (v) {
        const imgs = store.vehicle_images
          .filter((i) => i.vehicle_id === v.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => i.image_url);
        suggestedVehicle = formatPublicVehicle(v, imgs);
      }
    }

    res.json({ ...pkg, suggested_vehicle: suggestedVehicle });
  } catch (error) {
    console.error('Package detail query failed:', error);
    res.status(500).json({ error: 'Unable to load package details.' });
  }
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
publicRouter.post('/bookings', async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  const normalizedMobile = data.mobile.replace(/\s+/g, ' ').trim();

  let userUid: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
      userUid = decoded.uid;
      if (decoded.email) {
        upsertLocalUser(decoded.uid, decoded.email);
      }
    } catch {
      // Public booking submission still works without sign-in
    }
  }

  const store = getStore();
  let estimatedAmount = 0;
  let vehicleId: string | null = null;
  let packageId: string | null = null;

  const dayDiff = Math.max(
    1,
    Math.ceil((new Date(data.return_date).getTime() - new Date(data.travel_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  try {
    if (data.booking_type === 'vehicle') {
      if (!data.vehicle_id) {
        res.status(400).json({ error: 'Please select a vehicle for vehicle rental booking' });
        return;
      }
      const veh = store.vehicles.find((v) => v.id === data.vehicle_id);
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
      const pkg = store.tour_packages.find((p) => p.id === data.package_id && p.status === 'Published');
      if (!pkg) {
        res.status(404).json({ error: 'Selected tour package is not available' });
        return;
      }
      packageId = pkg.id;
      vehicleId = pkg.suggested_vehicle_id || null;
      estimatedAmount = pkg.price * Math.max(1, Math.ceil(data.passengers / 2));
    }

    const nowIso = new Date().toISOString();
    let customer = store.customers.find((c) => c.mobile === normalizedMobile);
    if (!customer) {
      customer = {
        id: crypto.randomUUID(),
        name: data.customer_name,
        mobile: normalizedMobile,
        email: data.email || null,
        created_at: nowIso,
      };
      store.customers.push(customer);
    } else {
      customer.name = data.customer_name;
      if (data.email) customer.email = data.email;
    }

    let referenceId = generateReferenceId();
    while (store.bookings.some((b) => b.reference_id === referenceId)) {
      referenceId = generateReferenceId();
    }

    const bookingId = crypto.randomUUID();
    store.bookings.push({
      id: bookingId,
      reference_id: referenceId,
      booking_type: data.booking_type,
      customer_id: customer.id,
      vehicle_id: vehicleId,
      package_id: packageId,
      driver_id: null,
      user_uid: userUid,
      pickup_location: data.pickup_location,
      destination: data.destination,
      travel_date: data.travel_date,
      pickup_time: data.pickup_time,
      return_date: data.return_date,
      passengers: data.passengers,
      driver_preference: data.driver_preference,
      notes: data.notes,
      status: 'Pending',
      total_amount: estimatedAmount,
      quotation_breakdown: { estimated_days: dayDiff, estimated_total: estimatedAmount },
      admin_notes: '',
      created_at: nowIso,
    });

    store.booking_status_history.push({
      id: crypto.randomUUID(),
      booking_id: bookingId,
      old_status: null,
      new_status: 'Pending',
      changed_by: null,
      note: 'Booking request submitted by customer',
      changed_at: nowIso,
    });

    saveStore(store);

    res.status(201).json({
      id: bookingId,
      reference_id: referenceId,
      status: 'Pending',
      estimated_amount: estimatedAmount,
    });
  } catch (err) {
    console.error('Create booking failed:', err);
    res.status(500).json({ error: 'Unable to save booking. Please try again.' });
  }
});

// GET /api/public/my-bookings — authenticated client bookings
publicRouter.get('/my-bookings', requireAuth, (req: FirebaseAuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const store = getStore();
    const vehMap = new Map(store.vehicles.map((v) => [v.id, v.name]));
    const pkgMap = new Map(store.tour_packages.map((p) => [p.id, p.name]));

    const rows = store.bookings
      .filter((b) => b.user_uid === uid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((b) => ({
        id: b.id,
        reference_id: b.reference_id,
        booking_type: b.booking_type,
        pickup_location: b.pickup_location,
        destination: b.destination,
        travel_date: b.travel_date,
        return_date: b.return_date,
        status: b.status,
        total_amount: b.total_amount,
        created_at: b.created_at,
        vehicle_name: b.vehicle_id ? vehMap.get(b.vehicle_id) || null : null,
        package_name: b.package_id ? pkgMap.get(b.package_id) || null : null,
      }));

    res.json(rows);
  } catch (err) {
    console.error('Client bookings fetch failed:', err);
    res.status(500).json({ error: 'Unable to load your bookings.' });
  }
});

// GET /api/public/bookings/:referenceId — safe summary for Booking Success page
publicRouter.get('/bookings/:referenceId', (req, res) => {
  try {
    const store = getStore();
    const b = store.bookings.find((row) => row.reference_id === req.params.referenceId);
    if (!b) {
      res.status(404).json({ error: 'Booking reference not found' });
      return;
    }
    const vehicleName = b.vehicle_id ? store.vehicles.find((v) => v.id === b.vehicle_id)?.name || null : null;
    const packageName = b.package_id ? store.tour_packages.find((p) => p.id === b.package_id)?.name || null : null;

    res.json({
      reference_id: b.reference_id,
      booking_type: b.booking_type,
      pickup_location: b.pickup_location,
      destination: b.destination,
      travel_date: b.travel_date,
      pickup_time: b.pickup_time,
      return_date: b.return_date,
      passengers: b.passengers,
      driver_preference: b.driver_preference,
      status: b.status,
      total_amount: b.total_amount,
      created_at: b.created_at,
      vehicle_name: vehicleName,
      package_name: packageName,
    });
  } catch (err) {
    console.error('Booking lookup failed:', err);
    res.status(500).json({ error: 'Unable to fetch booking summary.' });
  }
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
  const createdAt = new Date().toISOString();
  try {
    const store = getStore();
    const record = {
      id,
      customer_name: d.customer_name,
      location: d.location,
      trip_type: d.trip_type,
      rating: d.rating,
      comment: d.comment,
      is_approved: true,
      created_at: createdAt,
    };
    store.reviews.unshift(record);
    saveStore(store);

    res.status(201).json({
      id,
      review: record,
      message: 'Thank you! Your review is now live.',
    });
  } catch (err) {
    console.error('Review submit failed:', err);
    res.status(500).json({ error: 'Unable to publish review right now.' });
  }
});
