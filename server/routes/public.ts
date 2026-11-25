import { Router } from 'express';
import crypto from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  bookings,
  bookingStatusHistory,
  customers,
  faqs,
  gallery,
  reviews,
  siteSettings,
  tourPackages,
  vehicleImages,
  vehicles,
} from '../../src/db/schema.ts';
import { adminAuth } from '../../src/lib/firebase-admin.ts';
import { getOrCreateUser } from '../../src/db/users.ts';
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

async function getSiteSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(siteSettings);
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    out[r.key] = STRING_SETTING_KEYS.has(r.key) && r.value !== null && r.value !== undefined ? String(r.value) : r.value;
  }
  return out;
}

async function getVehicleImagesMap(): Promise<Map<string, string[]>> {
  const imgs = await db
    .select({
      vehicle_id: vehicleImages.vehicle_id,
      image_url: vehicleImages.image_url,
    })
    .from(vehicleImages)
    .orderBy(asc(vehicleImages.sort_order));

  const map = new Map<string, string[]>();
  for (const row of imgs) {
    const arr = map.get(row.vehicle_id) || [];
    arr.push(row.image_url);
    map.set(row.vehicle_id, arr);
  }
  return map;
}

// Public vehicle projection (explicitly excludes registration_no)
function formatPublicVehicle(
  row: {
    id: string;
    name: string;
    brand: string;
    model: string;
    seats: number;
    luggage_capacity: number;
    is_ac: boolean;
    fuel_type: string;
    transmission: string;
    price_per_km: number;
    daily_rate: number;
    min_km_per_day: number;
    driver_allowance: number;
    driver_available: boolean;
    self_drive_available: boolean;
    status: string;
    description: string;
  },
  images: string[]
) {
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
publicRouter.get('/bootstrap', async (_req, res) => {
  try {
    const [settings, imgMap, vehRows, pkgRows, reviewRows, galleryRows, faqRows] = await Promise.all([
      getSiteSettingsMap(),
      getVehicleImagesMap(),
      db
        .select({
          id: vehicles.id,
          name: vehicles.name,
          brand: vehicles.brand,
          model: vehicles.model,
          seats: vehicles.seats,
          luggage_capacity: vehicles.luggage_capacity,
          is_ac: vehicles.is_ac,
          fuel_type: vehicles.fuel_type,
          transmission: vehicles.transmission,
          price_per_km: vehicles.price_per_km,
          daily_rate: vehicles.daily_rate,
          min_km_per_day: vehicles.min_km_per_day,
          driver_allowance: vehicles.driver_allowance,
          driver_available: vehicles.driver_available,
          self_drive_available: vehicles.self_drive_available,
          status: vehicles.status,
          description: vehicles.description,
        })
        .from(vehicles)
        .where(and(eq(vehicles.is_archived, false), eq(vehicles.is_published, true)))
        .orderBy(asc(vehicles.created_at)),
      db
        .select()
        .from(tourPackages)
        .where(eq(tourPackages.status, 'Published'))
        .orderBy(asc(tourPackages.created_at)),
      db
        .select({
          id: reviews.id,
          customer_name: reviews.customer_name,
          location: reviews.location,
          trip_type: reviews.trip_type,
          rating: reviews.rating,
          comment: reviews.comment,
          is_approved: reviews.is_approved,
          created_at: reviews.created_at,
        })
        .from(reviews)
        .where(eq(reviews.is_approved, true))
        .orderBy(desc(reviews.created_at)),
      db
        .select({
          id: gallery.id,
          image_url: gallery.image_url,
          caption: gallery.caption,
          location: gallery.location,
          sort_order: gallery.sort_order,
        })
        .from(gallery)
        .orderBy(asc(gallery.sort_order), desc(gallery.created_at)),
      db
        .select({
          id: faqs.id,
          question: faqs.question,
          answer: faqs.answer,
          sort_order: faqs.sort_order,
        })
        .from(faqs)
        .where(eq(faqs.is_active, true))
        .orderBy(asc(faqs.sort_order)),
    ]);

    const formattedVehicles = vehRows.map((v) => formatPublicVehicle(v, imgMap.get(v.id) || []));
    res.json({
      settings,
      vehicles: formattedVehicles,
      packages: pkgRows,
      reviews: reviewRows,
      gallery: galleryRows,
      faqs: faqRows,
    });
  } catch (error) {
    console.error('Bootstrap query failed:', error);
    res.status(500).json({ error: 'Unable to load catalog data. Please try again.' });
  }
});

publicRouter.get('/vehicles', async (_req, res) => {
  try {
    const [imgMap, rows] = await Promise.all([
      getVehicleImagesMap(),
      db
        .select({
          id: vehicles.id,
          name: vehicles.name,
          brand: vehicles.brand,
          model: vehicles.model,
          seats: vehicles.seats,
          luggage_capacity: vehicles.luggage_capacity,
          is_ac: vehicles.is_ac,
          fuel_type: vehicles.fuel_type,
          transmission: vehicles.transmission,
          price_per_km: vehicles.price_per_km,
          daily_rate: vehicles.daily_rate,
          min_km_per_day: vehicles.min_km_per_day,
          driver_allowance: vehicles.driver_allowance,
          driver_available: vehicles.driver_available,
          self_drive_available: vehicles.self_drive_available,
          status: vehicles.status,
          description: vehicles.description,
        })
        .from(vehicles)
        .where(and(eq(vehicles.is_archived, false), eq(vehicles.is_published, true)))
        .orderBy(asc(vehicles.created_at)),
    ]);
    res.json(rows.map((v) => formatPublicVehicle(v, imgMap.get(v.id) || [])));
  } catch (error) {
    console.error('Vehicles query failed:', error);
    res.status(500).json({ error: 'Unable to load vehicles.' });
  }
});

publicRouter.get('/vehicles/:id', async (req, res) => {
  try {
    const rows = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        brand: vehicles.brand,
        model: vehicles.model,
        seats: vehicles.seats,
        luggage_capacity: vehicles.luggage_capacity,
        is_ac: vehicles.is_ac,
        fuel_type: vehicles.fuel_type,
        transmission: vehicles.transmission,
        price_per_km: vehicles.price_per_km,
        daily_rate: vehicles.daily_rate,
        min_km_per_day: vehicles.min_km_per_day,
        driver_allowance: vehicles.driver_allowance,
        driver_available: vehicles.driver_available,
        self_drive_available: vehicles.self_drive_available,
        status: vehicles.status,
        description: vehicles.description,
      })
      .from(vehicles)
      .where(and(eq(vehicles.id, req.params.id), eq(vehicles.is_archived, false), eq(vehicles.is_published, true)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const imgs = await db
      .select({ image_url: vehicleImages.image_url })
      .from(vehicleImages)
      .where(eq(vehicleImages.vehicle_id, req.params.id))
      .orderBy(asc(vehicleImages.sort_order));

    res.json(formatPublicVehicle(row, imgs.map((i) => i.image_url)));
  } catch (error) {
    console.error('Vehicle detail query failed:', error);
    res.status(500).json({ error: 'Unable to load vehicle details.' });
  }
});

publicRouter.get('/packages', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(tourPackages)
      .where(eq(tourPackages.status, 'Published'))
      .orderBy(asc(tourPackages.created_at));
    res.json(rows);
  } catch (error) {
    console.error('Packages query failed:', error);
    res.status(500).json({ error: 'Unable to load tour packages.' });
  }
});

publicRouter.get('/packages/:id', async (req, res) => {
  try {
    const pkgRows = await db
      .select()
      .from(tourPackages)
      .where(and(eq(tourPackages.id, req.params.id), eq(tourPackages.status, 'Published')))
      .limit(1);

    const pkg = pkgRows[0];
    if (!pkg) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    let suggestedVehicle = null;
    if (pkg.suggested_vehicle_id) {
      const vRows = await db
        .select({
          id: vehicles.id,
          name: vehicles.name,
          brand: vehicles.brand,
          model: vehicles.model,
          seats: vehicles.seats,
          luggage_capacity: vehicles.luggage_capacity,
          is_ac: vehicles.is_ac,
          fuel_type: vehicles.fuel_type,
          transmission: vehicles.transmission,
          price_per_km: vehicles.price_per_km,
          daily_rate: vehicles.daily_rate,
          min_km_per_day: vehicles.min_km_per_day,
          driver_allowance: vehicles.driver_allowance,
          driver_available: vehicles.driver_available,
          self_drive_available: vehicles.self_drive_available,
          status: vehicles.status,
          description: vehicles.description,
        })
        .from(vehicles)
        .where(and(eq(vehicles.id, pkg.suggested_vehicle_id), eq(vehicles.is_archived, false), eq(vehicles.is_published, true)))
        .limit(1);

      const v = vRows[0];
      if (v) {
        const imgs = await db
          .select({ image_url: vehicleImages.image_url })
          .from(vehicleImages)
          .where(eq(vehicleImages.vehicle_id, v.id))
          .orderBy(asc(vehicleImages.sort_order));
        suggestedVehicle = formatPublicVehicle(v, imgs.map((i) => i.image_url));
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

  // Optional Firebase ID token verification so signed-in clients link bookings securely
  let userUid: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
      userUid = decoded.uid;
      if (decoded.email) {
        await getOrCreateUser(decoded.uid, decoded.email);
      }
    } catch {
      // Public booking submission still works without sign-in
    }
  }

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
      const vehRows = await db
        .select({
          id: vehicles.id,
          daily_rate: vehicles.daily_rate,
          driver_allowance: vehicles.driver_allowance,
          self_drive_available: vehicles.self_drive_available,
          is_archived: vehicles.is_archived,
          is_published: vehicles.is_published,
        })
        .from(vehicles)
        .where(eq(vehicles.id, data.vehicle_id))
        .limit(1);

      const veh = vehRows[0];
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
      const pkgRows = await db
        .select({
          id: tourPackages.id,
          price: tourPackages.price,
          suggested_vehicle_id: tourPackages.suggested_vehicle_id,
        })
        .from(tourPackages)
        .where(and(eq(tourPackages.id, data.package_id), eq(tourPackages.status, 'Published')))
        .limit(1);

      const pkg = pkgRows[0];
      if (!pkg) {
        res.status(404).json({ error: 'Selected tour package is not available' });
        return;
      }
      packageId = pkg.id;
      vehicleId = pkg.suggested_vehicle_id || null;
      estimatedAmount = pkg.price * Math.max(1, Math.ceil(data.passengers / 2));
    }

    const result = await db.transaction(async (tx) => {
      const existingCust = await tx
        .select({ id: customers.id, email: customers.email })
        .from(customers)
        .where(eq(customers.mobile, normalizedMobile))
        .limit(1);

      let customerId: string;
      if (existingCust.length === 0) {
        customerId = crypto.randomUUID();
        await tx.insert(customers).values({
          id: customerId,
          name: data.customer_name,
          mobile: normalizedMobile,
          email: data.email || null,
        });
      } else {
        customerId = existingCust[0].id;
        await tx
          .update(customers)
          .set({
            name: data.customer_name,
            email: data.email || existingCust[0].email,
          })
          .where(eq(customers.id, customerId));
      }

      let referenceId = generateReferenceId();
      while (
        (
          await tx
            .select({ id: bookings.id })
            .from(bookings)
            .where(eq(bookings.reference_id, referenceId))
            .limit(1)
        ).length > 0
      ) {
        referenceId = generateReferenceId();
      }

      const bookingId = crypto.randomUUID();
      await tx.insert(bookings).values({
        id: bookingId,
        reference_id: referenceId,
        booking_type: data.booking_type,
        customer_id: customerId,
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
      });

      await tx.insert(bookingStatusHistory).values({
        id: crypto.randomUUID(),
        booking_id: bookingId,
        old_status: null,
        new_status: 'Pending',
        changed_by: null,
        note: 'Booking request submitted by customer',
      });

      return { bookingId, referenceId };
    });

    res.status(201).json({
      id: result.bookingId,
      reference_id: result.referenceId,
      status: 'Pending',
      estimated_amount: estimatedAmount,
    });
  } catch (err) {
    console.error('Create booking failed:', err);
    res.status(500).json({ error: 'Unable to save booking. Please try again.' });
  }
});

// GET /api/public/my-bookings — authenticated client bookings
publicRouter.get('/my-bookings', requireAuth, async (req: FirebaseAuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const rows = await db
      .select({
        id: bookings.id,
        reference_id: bookings.reference_id,
        booking_type: bookings.booking_type,
        pickup_location: bookings.pickup_location,
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
      .where(eq(bookings.user_uid, uid))
      .orderBy(desc(bookings.created_at));

    res.json(rows);
  } catch (err) {
    console.error('Client bookings fetch failed:', err);
    res.status(500).json({ error: 'Unable to load your bookings.' });
  }
});

// GET /api/public/bookings/:referenceId — safe summary for Booking Success page
publicRouter.get('/bookings/:referenceId', async (req, res) => {
  try {
    const rows = await db
      .select({
        reference_id: bookings.reference_id,
        booking_type: bookings.booking_type,
        pickup_location: bookings.pickup_location,
        destination: bookings.destination,
        travel_date: bookings.travel_date,
        pickup_time: bookings.pickup_time,
        return_date: bookings.return_date,
        passengers: bookings.passengers,
        driver_preference: bookings.driver_preference,
        status: bookings.status,
        total_amount: bookings.total_amount,
        created_at: bookings.created_at,
        vehicle_name: vehicles.name,
        package_name: tourPackages.name,
      })
      .from(bookings)
      .leftJoin(vehicles, eq(vehicles.id, bookings.vehicle_id))
      .leftJoin(tourPackages, eq(tourPackages.id, bookings.package_id))
      .where(eq(bookings.reference_id, req.params.referenceId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: 'Booking reference not found' });
      return;
    }
    res.json(row);
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

publicRouter.post('/reviews', async (req, res) => {
  const parsed = reviewSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid review input' });
    return;
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const createdAt = new Date();
  try {
    await db.insert(reviews).values({
      id,
      customer_name: d.customer_name,
      location: d.location,
      trip_type: d.trip_type,
      rating: d.rating,
      comment: d.comment,
      is_approved: true,
      created_at: createdAt,
    });
    res.status(201).json({
      id,
      review: {
        id,
        customer_name: d.customer_name,
        location: d.location,
        trip_type: d.trip_type,
        rating: d.rating,
        comment: d.comment,
        is_approved: true,
        created_at: createdAt.toISOString(),
      },
      message: 'Thank you! Your review is now live.',
    });
  } catch (err) {
    console.error('Review submit failed:', err);
    res.status(500).json({ error: 'Unable to publish review right now.' });
  }
});
