import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { getDataDir } from './paths.ts';

const dataDir = getDataDir();
const dbPath = path.join(dataDir, 'travelgo.sqlite');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      registration_no TEXT NOT NULL,
      seats INTEGER NOT NULL CHECK (seats > 0),
      luggage_capacity INTEGER NOT NULL DEFAULT 3,
      is_ac INTEGER NOT NULL DEFAULT 1,
      fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG')),
      transmission TEXT NOT NULL CHECK (transmission IN ('Automatic', 'Manual')),
      price_per_km REAL NOT NULL CHECK (price_per_km >= 0),
      daily_rate REAL NOT NULL DEFAULT 3000 CHECK (daily_rate >= 0),
      min_km_per_day INTEGER NOT NULL DEFAULT 250 CHECK (min_km_per_day >= 0),
      driver_allowance REAL NOT NULL DEFAULT 500 CHECK (driver_allowance >= 0),
      driver_available INTEGER NOT NULL DEFAULT 1,
      self_drive_available INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Unavailable', 'Under Maintenance')),
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicle_images (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tour_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination TEXT NOT NULL,
      days INTEGER NOT NULL CHECK (days > 0),
      nights INTEGER NOT NULL CHECK (nights >= 0),
      price REAL NOT NULL CHECK (price >= 0),
      pickup_location TEXT NOT NULL,
      dropoff_location TEXT NOT NULL,
      itinerary TEXT NOT NULL DEFAULT '[]',
      inclusions TEXT NOT NULL DEFAULT '[]',
      exclusions TEXT NOT NULL DEFAULT '[]',
      suggested_vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      max_passengers INTEGER NOT NULL DEFAULT 6,
      status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Published', 'Inactive', 'Archived')),
      images TEXT NOT NULL DEFAULT '[]',
      rating REAL NOT NULL DEFAULT 4.9,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '',
      licence_no TEXT NOT NULL,
      licence_expiry TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      reference_id TEXT UNIQUE NOT NULL,
      booking_type TEXT NOT NULL CHECK (booking_type IN ('vehicle', 'package')),
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE RESTRICT,
      package_id TEXT REFERENCES tour_packages(id) ON DELETE RESTRICT,
      driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      pickup_location TEXT NOT NULL,
      destination TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      pickup_time TEXT NOT NULL DEFAULT '09:00',
      return_date TEXT NOT NULL,
      passengers INTEGER NOT NULL DEFAULT 2 CHECK (passengers > 0),
      driver_preference TEXT NOT NULL DEFAULT 'With Driver' CHECK (driver_preference IN ('With Driver', 'Self-Drive')),
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Contacted', 'Confirmed', 'Vehicle Assigned', 'In Progress', 'Completed', 'Rejected', 'Cancelled')),
      total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
      quotation_breakdown TEXT NOT NULL DEFAULT '{}',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      amount REAL NOT NULL CHECK (amount > 0),
      payment_type TEXT NOT NULL CHECK (payment_type IN ('Advance', 'Balance', 'Full', 'Refund')),
      method TEXT NOT NULL CHECK (method IN ('Cash', 'UPI', 'Bank Transfer', 'Card')),
      payment_date TEXT NOT NULL,
      transaction_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'India',
      trip_type TEXT NOT NULL DEFAULT 'Tour Package',
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS booking_status_history (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      note TEXT NOT NULL DEFAULT '',
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Local', 'Outstation', 'Seasonal', 'Add-on')),
      per_km_rate REAL NOT NULL DEFAULT 0,
      min_km_per_day INTEGER NOT NULL DEFAULT 250,
      driver_allowance REAL NOT NULL DEFAULT 500,
      night_charge REAL NOT NULL DEFAULT 300,
      waiting_charge_per_hr REAL NOT NULL DEFAULT 150,
      extra_km_charge REAL NOT NULL DEFAULT 18,
      seasonal_multiplier REAL NOT NULL DEFAULT 1.0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_dates ON bookings(vehicle_id, travel_date, return_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
    CREATE INDEX IF NOT EXISTS idx_history_booking ON booking_status_history(booking_id);
  `);

  // Database-level overlap prevention triggers for active confirmed/assigned/in-progress vehicle bookings
  db.exec(`
    DROP TRIGGER IF EXISTS prevent_vehicle_overlap_insert;
    CREATE TRIGGER prevent_vehicle_overlap_insert
    BEFORE INSERT ON bookings
    WHEN NEW.vehicle_id IS NOT NULL AND NEW.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
    BEGIN
      SELECT RAISE(ABORT, 'OVERLAP_CONFLICT: Vehicle already has an active confirmed booking for overlapping dates.')
      WHERE EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.vehicle_id = NEW.vehicle_id
          AND b.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
          AND b.travel_date <= NEW.return_date
          AND b.return_date >= NEW.travel_date
      );
    END;

    DROP TRIGGER IF EXISTS prevent_vehicle_overlap_update;
    CREATE TRIGGER prevent_vehicle_overlap_update
    BEFORE UPDATE OF vehicle_id, travel_date, return_date, status ON bookings
    WHEN NEW.vehicle_id IS NOT NULL AND NEW.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
    BEGIN
      SELECT RAISE(ABORT, 'OVERLAP_CONFLICT: Vehicle already has an active confirmed booking for overlapping dates.')
      WHERE EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id != NEW.id
          AND b.vehicle_id = NEW.vehicle_id
          AND b.status IN ('Confirmed', 'Vehicle Assigned', 'In Progress')
          AND b.travel_date <= NEW.return_date
          AND b.return_date >= NEW.travel_date
      );
    END;
  `);
}
