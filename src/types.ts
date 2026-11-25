export interface SiteSettings {
  business_name: string;
  tagline: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_image: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  operating_area: string;
  about_title: string;
  about_description: string;
  social_links: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
  };
  policies: {
    privacy: string;
    terms: string;
    cancellation: string;
  };
}

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  registration_no?: string;
  seats: number;
  luggage_capacity: number;
  is_ac: boolean;
  fuel_type: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | 'CNG';
  transmission: 'Automatic' | 'Manual';
  price_per_km: number;
  daily_rate: number;
  min_km_per_day: number;
  driver_allowance: number;
  driver_available: boolean;
  self_drive_available: boolean;
  status: 'Available' | 'Unavailable' | 'Under Maintenance';
  is_archived?: boolean;
  is_published?: boolean;
  description: string;
  images: string[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface TourPackage {
  id: string;
  name: string;
  destination: string;
  days: number;
  nights: number;
  price: number;
  pickup_location: string;
  dropoff_location: string;
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  suggested_vehicle_id: string | null;
  suggested_vehicle?: Vehicle | null;
  max_passengers: number;
  status: 'Published' | 'Inactive' | 'Archived';
  images: string[];
  rating: number;
  review_count: number;
}

export interface ReviewItem {
  id: string;
  customer_name: string;
  location: string;
  trip_type: string;
  rating: number;
  comment: string;
  is_approved?: boolean;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string;
  location: string;
  sort_order: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active?: boolean;
}

export type BookingStatus =
  | 'Pending'
  | 'Contacted'
  | 'Confirmed'
  | 'Vehicle Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled';

export interface BookingRecord {
  id: string;
  reference_id: string;
  booking_type: 'vehicle' | 'package';
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  vehicle_id: string | null;
  vehicle_name?: string;
  vehicle_reg?: string;
  package_id: string | null;
  package_name?: string;
  driver_id: string | null;
  driver_name?: string;
  driver_phone?: string;
  pickup_location: string;
  destination: string;
  travel_date: string;
  pickup_time: string;
  return_date: string;
  passengers: number;
  driver_preference: 'With Driver' | 'Self-Drive';
  notes: string;
  status: BookingStatus;
  total_amount: number;
  admin_notes: string;
  created_at: string;
  paid?: number;
  balance?: number;
  payment_status?: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Refunded';
}

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  photo_url: string;
  licence_no: string;
  licence_expiry: string;
  is_active: boolean;
  licence_expiring_soon?: boolean;
  licence_expired?: boolean;
}

export interface PricingRule {
  id: string;
  name: string;
  category: 'Local' | 'Outstation' | 'Seasonal' | 'Add-on';
  per_km_rate: number;
  min_km_per_day: number;
  driver_allowance: number;
  night_charge: number;
  waiting_charge_per_hr: number;
  extra_km_charge: number;
  seasonal_multiplier: number;
  is_active: boolean;
}
