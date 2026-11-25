import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from './paths.ts';

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  role: string;
  password_hash: string | null;
  created_at: string;
}

export interface UserRecord {
  uid: string;
  email: string;
  created_at: string;
}

export interface VehicleRecord {
  id: string;
  name: string;
  brand: string;
  model: string;
  registration_no: string;
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
  is_archived: boolean;
  is_published: boolean;
  description: string;
  created_at: string;
}

export interface VehicleImageRecord {
  id: string;
  vehicle_id: string;
  image_url: string;
  sort_order: number;
}

export interface TourPackageRecord {
  id: string;
  name: string;
  destination: string;
  days: number;
  nights: number;
  price: number;
  pickup_location: string;
  dropoff_location: string;
  itinerary: Array<{ day: number; title: string; description: string }>;
  inclusions: string[];
  exclusions: string[];
  suggested_vehicle_id: string | null;
  max_passengers: number;
  status: string;
  images: string[];
  rating: number;
  review_count: number;
  created_at: string;
}

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  photo_url: string;
  licence_no: string;
  licence_expiry: string;
  is_active: boolean;
  created_at: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  created_at: string;
}

export interface BookingRecord {
  id: string;
  reference_id: string;
  booking_type: string;
  customer_id: string;
  vehicle_id: string | null;
  package_id: string | null;
  driver_id: string | null;
  user_uid: string | null;
  pickup_location: string;
  destination: string;
  travel_date: string;
  pickup_time: string;
  return_date: string;
  passengers: number;
  driver_preference: string;
  notes: string;
  status: string;
  total_amount: number;
  quotation_breakdown: Record<string, unknown>;
  admin_notes: string;
  created_at: string;
}

export interface BookingStatusHistoryRecord {
  id: string;
  booking_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string;
  changed_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: string;
  method: string;
  payment_date: string;
  transaction_ref: string;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  customer_name: string;
  location: string;
  trip_type: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

export interface GalleryRecord {
  id: string;
  image_url: string;
  caption: string;
  location: string;
  sort_order: number;
  created_at: string;
}

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export interface PricingRuleRecord {
  id: string;
  name: string;
  category: string;
  per_km_rate: number;
  min_km_per_day: number;
  driver_allowance: number;
  night_charge: number;
  waiting_charge_per_hr: number;
  extra_km_charge: number;
  seasonal_multiplier: number;
  is_active: boolean;
}

export interface LocalStoreData {
  profiles: ProfileRecord[];
  users: UserRecord[];
  vehicles: VehicleRecord[];
  vehicle_images: VehicleImageRecord[];
  tour_packages: TourPackageRecord[];
  drivers: DriverRecord[];
  customers: CustomerRecord[];
  bookings: BookingRecord[];
  booking_status_history: BookingStatusHistoryRecord[];
  payments: PaymentRecord[];
  reviews: ReviewRecord[];
  gallery: GalleryRecord[];
  faqs: FaqRecord[];
  site_settings: Record<string, unknown>;
  pricing_rules: PricingRuleRecord[];
}

function createEmptyStore(): LocalStoreData {
  return {
    profiles: [],
    users: [],
    vehicles: [],
    vehicle_images: [],
    tour_packages: [],
    drivers: [],
    customers: [],
    bookings: [],
    booking_status_history: [],
    payments: [],
    reviews: [],
    gallery: [],
    faqs: [],
    site_settings: {},
    pricing_rules: [],
  };
}

declare global {
  var _travelGoStore: LocalStoreData | undefined;
}

function getStorePath(): string {
  return path.join(getDataDir(), 'travelgo-db.json');
}

export function getStore(): LocalStoreData {
  if (global._travelGoStore) {
    return global._travelGoStore;
  }

  const filePath = getStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
      global._travelGoStore = {
        ...createEmptyStore(),
        ...parsed,
      };
      return global._travelGoStore;
    }
  } catch (err) {
    console.warn('Could not read local store file, initializing fresh store:', err);
  }

  global._travelGoStore = createEmptyStore();
  return global._travelGoStore;
}

export function saveStore(data?: LocalStoreData): void {
  const target = data || getStore();
  global._travelGoStore = target;
  try {
    const filePath = getStorePath();
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(target, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    // On read-only filesystems or restricted serverless environments, keep in-memory state intact
    console.warn('Local store disk write skipped (using in-memory store):', err);
  }
}

export function upsertLocalUser(uid: string, email: string): UserRecord {
  const store = getStore();
  const existing = store.users.find((u) => u.uid === uid);
  if (existing) {
    if (existing.email !== email) {
      existing.email = email;
      saveStore(store);
    }
    return existing;
  }
  const created: UserRecord = {
    uid,
    email,
    created_at: new Date().toISOString(),
  };
  store.users.push(created);
  saveStore(store);
  return created;
}
