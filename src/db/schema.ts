import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Firebase Auth linked users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Operations Admin profiles
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  full_name: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('admin'),
  password_hash: text('password_hash'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Fleet Vehicles
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  registration_no: text('registration_no').notNull(),
  seats: integer('seats').notNull(),
  luggage_capacity: integer('luggage_capacity').notNull().default(3),
  is_ac: boolean('is_ac').notNull().default(true),
  fuel_type: text('fuel_type').notNull(),
  transmission: text('transmission').notNull(),
  price_per_km: doublePrecision('price_per_km').notNull(),
  daily_rate: doublePrecision('daily_rate').notNull().default(3000),
  min_km_per_day: integer('min_km_per_day').notNull().default(250),
  driver_allowance: doublePrecision('driver_allowance').notNull().default(500),
  driver_available: boolean('driver_available').notNull().default(true),
  self_drive_available: boolean('self_drive_available').notNull().default(true),
  status: text('status').notNull().default('Available'),
  is_archived: boolean('is_archived').notNull().default(false),
  is_published: boolean('is_published').notNull().default(true),
  description: text('description').notNull().default(''),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const vehicleImages = pgTable('vehicle_images', {
  id: text('id').primaryKey(),
  vehicle_id: text('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  image_url: text('image_url').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
});

export const tourPackages = pgTable('tour_packages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  destination: text('destination').notNull(),
  days: integer('days').notNull(),
  nights: integer('nights').notNull(),
  price: doublePrecision('price').notNull(),
  pickup_location: text('pickup_location').notNull(),
  dropoff_location: text('dropoff_location').notNull(),
  itinerary: jsonb('itinerary').$type<Array<{ day: number; title: string; description: string }>>().notNull().default([]),
  inclusions: jsonb('inclusions').$type<string[]>().notNull().default([]),
  exclusions: jsonb('exclusions').$type<string[]>().notNull().default([]),
  suggested_vehicle_id: text('suggested_vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  max_passengers: integer('max_passengers').notNull().default(6),
  status: text('status').notNull().default('Published'),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  rating: doublePrecision('rating').notNull().default(4.9),
  review_count: integer('review_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mobile: text('mobile').notNull().unique(),
  email: text('email'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const drivers = pgTable('drivers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  photo_url: text('photo_url').notNull().default(''),
  licence_no: text('licence_no').notNull(),
  licence_expiry: text('licence_expiry').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  reference_id: text('reference_id').notNull().unique(),
  booking_type: text('booking_type').notNull(),
  customer_id: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  vehicle_id: text('vehicle_id').references(() => vehicles.id, { onDelete: 'restrict' }),
  package_id: text('package_id').references(() => tourPackages.id, { onDelete: 'restrict' }),
  driver_id: text('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
  user_uid: text('user_uid'),
  pickup_location: text('pickup_location').notNull(),
  destination: text('destination').notNull(),
  travel_date: text('travel_date').notNull(),
  pickup_time: text('pickup_time').notNull().default('09:00'),
  return_date: text('return_date').notNull(),
  passengers: integer('passengers').notNull().default(2),
  driver_preference: text('driver_preference').notNull().default('With Driver'),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('Pending'),
  total_amount: doublePrecision('total_amount').notNull().default(0),
  quotation_breakdown: jsonb('quotation_breakdown').$type<Record<string, unknown>>().notNull().default({}),
  admin_notes: text('admin_notes').notNull().default(''),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  booking_id: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  amount: doublePrecision('amount').notNull(),
  payment_type: text('payment_type').notNull(),
  method: text('method').notNull(),
  payment_date: text('payment_date').notNull(),
  transaction_ref: text('transaction_ref').notNull().default(''),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  customer_name: text('customer_name').notNull(),
  location: text('location').notNull().default('India'),
  trip_type: text('trip_type').notNull().default('Tour Package'),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  is_approved: boolean('is_approved').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const gallery = pgTable('gallery', {
  id: text('id').primaryKey(),
  image_url: text('image_url').notNull(),
  caption: text('caption').notNull(),
  location: text('location').notNull().default(''),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

export const faqs = pgTable('faqs', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
});

export const bookingStatusHistory = pgTable('booking_status_history', {
  id: text('id').primaryKey(),
  booking_id: text('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  old_status: text('old_status'),
  new_status: text('new_status').notNull(),
  changed_by: text('changed_by').references(() => profiles.id, { onDelete: 'set null' }),
  note: text('note').notNull().default(''),
  changed_at: timestamp('changed_at').defaultNow().notNull(),
});

export const pricingRules = pgTable('pricing_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  per_km_rate: doublePrecision('per_km_rate').notNull().default(0),
  min_km_per_day: integer('min_km_per_day').notNull().default(250),
  driver_allowance: doublePrecision('driver_allowance').notNull().default(500),
  night_charge: doublePrecision('night_charge').notNull().default(300),
  waiting_charge_per_hr: doublePrecision('waiting_charge_per_hr').notNull().default(150),
  extra_km_charge: doublePrecision('extra_km_charge').notNull().default(18),
  seasonal_multiplier: doublePrecision('seasonal_multiplier').notNull().default(1.0),
  is_active: boolean('is_active').notNull().default(true),
});

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  images: many(vehicleImages),
  bookings: many(bookings),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleImages.vehicle_id],
    references: [vehicles.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(customers, {
    fields: [bookings.customer_id],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicle_id],
    references: [vehicles.id],
  }),
  tourPackage: one(tourPackages, {
    fields: [bookings.package_id],
    references: [tourPackages.id],
  }),
  driver: one(drivers, {
    fields: [bookings.driver_id],
    references: [drivers.id],
  }),
  payments: many(payments),
  history: many(bookingStatusHistory),
}));
