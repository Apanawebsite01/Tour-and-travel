-- TravelGo Complete PostgreSQL / Supabase Migration Script
-- Run this in your Supabase SQL Editor (or PostgreSQL 15+) to set up all 13 tables,
-- overlap exclusion constraint, status-history triggers, and Row Level Security (RLS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Profiles (Admin & Client accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  registration_no TEXT NOT NULL,
  seats INT NOT NULL CHECK (seats > 0),
  luggage_capacity INT NOT NULL DEFAULT 3,
  is_ac BOOLEAN NOT NULL DEFAULT true,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG')),
  transmission TEXT NOT NULL CHECK (transmission IN ('Automatic', 'Manual')),
  price_per_km NUMERIC NOT NULL CHECK (price_per_km >= 0),
  daily_rate NUMERIC NOT NULL DEFAULT 3000 CHECK (daily_rate >= 0),
  min_km_per_day INT NOT NULL DEFAULT 250 CHECK (min_km_per_day >= 0),
  driver_allowance NUMERIC NOT NULL DEFAULT 500 CHECK (driver_allowance >= 0),
  driver_available BOOLEAN NOT NULL DEFAULT true,
  self_drive_available BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Unavailable', 'Under Maintenance')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Vehicle Images
CREATE TABLE IF NOT EXISTS vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- 4. Tour Packages
CREATE TABLE IF NOT EXISTS tour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  days INT NOT NULL CHECK (days > 0),
  nights INT NOT NULL CHECK (nights >= 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
  inclusions TEXT[] NOT NULL DEFAULT '{}',
  exclusions TEXT[] NOT NULL DEFAULT '{}',
  suggested_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  max_passengers INT NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Published', 'Inactive', 'Archived')),
  images TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC NOT NULL DEFAULT 4.9,
  review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  licence_no TEXT NOT NULL,
  licence_expiry DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('vehicle', 'package')),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
  package_id UUID REFERENCES tour_packages(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date DATE NOT NULL,
  pickup_time TIME NOT NULL DEFAULT '09:00',
  return_date DATE NOT NULL,
  passengers INT NOT NULL DEFAULT 2 CHECK (passengers > 0),
  driver_preference TEXT NOT NULL DEFAULT 'With Driver' CHECK (driver_preference IN ('With Driver', 'Self-Drive')),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Contacted', 'Confirmed', 'Vehicle Assigned', 'In Progress', 'Completed', 'Rejected', 'Cancelled')
  ),
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (return_date >= travel_date)
);

-- Database-level overlap prevention for active confirmed/assigned/in-progress vehicle bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS prevent_vehicle_overlap;
ALTER TABLE bookings
  ADD CONSTRAINT prevent_vehicle_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    daterange(travel_date, return_date, '[]') WITH &&
  )
  WHERE (vehicle_id IS NOT NULL AND status IN ('Confirmed', 'Vehicle Assigned', 'In Progress'));

-- 8. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('Advance', 'Balance', 'Full', 'Refund')),
  method TEXT NOT NULL CHECK (method IN ('Cash', 'UPI', 'Bank Transfer', 'Card')),
  payment_date DATE NOT NULL,
  transaction_ref TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'India',
  trip_type TEXT NOT NULL DEFAULT 'Tour Package',
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Gallery
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL
);

-- 12. FAQs
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 13. Booking Status History
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: Force new public bookings to Pending & record initial history row
CREATE OR REPLACE FUNCTION enforce_pending_booking()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := 'Pending';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_booking_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_status_history (booking_id, old_status, new_status, note)
    VALUES (NEW.id, NULL, NEW.status, 'Booking created');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO booking_status_history (booking_id, old_status, new_status, note)
    VALUES (NEW.id, OLD.status, NEW.status, 'Status updated');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_booking_status ON bookings;
CREATE TRIGGER trg_log_booking_status
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION log_booking_status_history();

-- Enable Row Level Security (RLS) on all 13 tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

-- Helper check for Admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Public Read Policies
CREATE POLICY "Public read published vehicles" ON vehicles FOR SELECT USING (is_archived = false AND is_published = true);
CREATE POLICY "Public read vehicle images" ON vehicle_images FOR SELECT USING (true);
CREATE POLICY "Public read published packages" ON tour_packages FOR SELECT USING (status = 'Published');
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Public read active faqs" ON faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Public read site settings" ON site_settings FOR SELECT USING (true);

-- Public Booking & Customer Insert Policies
CREATE POLICY "Public insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert pending bookings" ON bookings FOR INSERT WITH CHECK (status = 'Pending');

-- Admin Full Access Policies
CREATE POLICY "Admin full vehicles" ON vehicles FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full vehicle_images" ON vehicle_images FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full packages" ON tour_packages FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full customers" ON customers FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full drivers" ON drivers FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full bookings" ON bookings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full payments" ON payments FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full reviews" ON reviews FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full gallery" ON gallery FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full settings" ON site_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full faqs" ON faqs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full history" ON booking_status_history FOR ALL USING (is_admin()) WITH CHECK (is_admin());
