import heroImg from '../assets/images/hero_himalayan_suv_1795623484938.jpg';
import hycrossImg from '../assets/images/vehicle_suv_hycross_1795623485346.jpg';
import tharImg from '../assets/images/vehicle_thar_adventure_1795623485521.jpg';
import rajasthanImg from '../assets/images/package_rajasthan_palace_1795623485510.jpg';
import keralaImg from '../assets/images/package_kerala_backwaters_1795623487119.jpg';
import type { FaqItem, GalleryItem, ReviewItem, SiteSettings, TourPackage, Vehicle } from '../types';

const BUNDLED_IMAGE_MAP: Record<string, string> = {
  '/src/assets/images/hero_himalayan_suv_1795623484938.jpg': heroImg,
  '/src/assets/images/vehicle_suv_hycross_1795623485346.jpg': hycrossImg,
  '/src/assets/images/vehicle_thar_adventure_1795623485521.jpg': tharImg,
  '/src/assets/images/package_rajasthan_palace_1795623485510.jpg': rajasthanImg,
  '/src/assets/images/package_kerala_backwaters_1795623487119.jpg': keralaImg,
};

export function resolveAssetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return BUNDLED_IMAGE_MAP[url] || url;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: 'TravelGo',
  tagline: 'Across India, Without Compromise',
  hero_headline: 'Explore India at your own pace, from Himalayan passes to coastal highways.',
  hero_subheadline:
    'Transparent per-km pricing, sanitized 4x4 SUVs, verified chauffeurs, and hand-crafted tour itineraries across 28 Indian states.',
  hero_image: heroImg,
  phone: '+91 98114 20750',
  whatsapp_number: '919811420750',
  email: 'concierge@travelgo.in',
  address: 'Suite 402, Horizon Tower, MG Road, Gurugram, Haryana 122002',
  operating_area: 'Delhi NCR · Jaipur · Leh · Goa · Kochi · Bengaluru',
  about_title: 'Built by road-trippers, engineered for Indian highways.',
  about_description:
    'Founded in 2019, TravelGo pairs a modern all-India permit fleet with local destination specialists. Whether you choose a self-drive 4x4 through coastal Goa or a chauffeured Innova Hycross across Rajasthan, every rupee is itemized upfront with zero hidden tolls or surprise surcharges.',
  social_links: {
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    facebook: 'https://facebook.com',
  },
  policies: {
    privacy:
      'TravelGo collects only the contact details and travel preferences required to coordinate your vehicle rental or holiday package. Customer phone numbers and identity documents are encrypted at rest and never sold or shared with third-party marketers.',
    terms:
      'All self-drive rentals require an original valid Indian driving licence (or International Driving Permit) and Aadhaar/Passport verification at pickup. Outstation chauffeur bookings follow a standard 250 km/day minimum billing cycle with transparent driver allowances.',
    cancellation:
      'Free cancellation up to 72 hours prior to scheduled pickup for full advance refund. Cancellations between 24 and 72 hours attract a 25% retention credit redeemable on future trips within 6 months. Same-day cancellations are non-refundable.',
  },
};

export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 'veh-hycross-01',
    name: 'Toyota Innova Hycross ZX',
    brand: 'Toyota',
    model: 'Innova Hycross 2025',
    seats: 7,
    luggage_capacity: 5,
    is_ac: true,
    fuel_type: 'Hybrid',
    transmission: 'Automatic',
    price_per_km: 24,
    daily_rate: 4200,
    min_km_per_day: 250,
    driver_allowance: 600,
    driver_available: true,
    self_drive_available: true,
    status: 'Available',
    description:
      'Plush Ottoman captain seats, panoramic sunroof, and whisper-quiet strong hybrid powertrain built for long family circuits across Rajasthan and Himachal.',
    images: [hycrossImg, heroImg],
  },
  {
    id: 'veh-thar-02',
    name: 'Mahindra Thar 4x4 Earth Edition',
    brand: 'Mahindra',
    model: 'Thar LX Hard Top 4WD',
    seats: 4,
    luggage_capacity: 3,
    is_ac: true,
    fuel_type: 'Diesel',
    transmission: 'Manual',
    price_per_km: 22,
    daily_rate: 3800,
    min_km_per_day: 200,
    driver_allowance: 550,
    driver_available: true,
    self_drive_available: true,
    status: 'Available',
    description:
      'Trail-rated 4x4 capability with roof expedition rack, all-terrain tyres, and Apple CarPlay—ideal for Konkan coast drives and Spiti valleys.',
    images: [tharImg],
  },
  {
    id: 'veh-prado-03',
    name: 'Toyota Land Cruiser Expedition',
    brand: 'Toyota',
    model: 'Land Cruiser 300 VX',
    seats: 7,
    luggage_capacity: 6,
    is_ac: true,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    price_per_km: 48,
    daily_rate: 8400,
    min_km_per_day: 250,
    driver_allowance: 900,
    driver_available: true,
    self_drive_available: false,
    status: 'Available',
    description:
      'Flagship high-altitude expedition SUV with oxygen kit, satellite SOS beacon, and multi-terrain select—exclusively paired with our senior Himalayan expedition chauffeurs.',
    images: [heroImg, hycrossImg],
  },
  {
    id: 'veh-scorpio-04',
    name: 'Mahindra Scorpio-N Z8L 4WD',
    brand: 'Mahindra',
    model: 'Scorpio-N 4Xplor',
    seats: 7,
    luggage_capacity: 4,
    is_ac: true,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    price_per_km: 21,
    daily_rate: 3500,
    min_km_per_day: 250,
    driver_allowance: 550,
    driver_available: true,
    self_drive_available: true,
    status: 'Available',
    description:
      'Commanding highway presence with Sony 3D audio, dual-zone climate control, and rugged body-on-frame suspension for desert forts and hill stations.',
    images: [tharImg, heroImg],
  },
  {
    id: 'veh-vitara-05',
    name: 'Maruti Grand Vitara Alpha+',
    brand: 'Maruti Suzuki',
    model: 'Grand Vitara Intelligent Hybrid',
    seats: 5,
    luggage_capacity: 3,
    is_ac: true,
    fuel_type: 'Hybrid',
    transmission: 'Automatic',
    price_per_km: 16,
    daily_rate: 2600,
    min_km_per_day: 200,
    driver_allowance: 500,
    driver_available: true,
    self_drive_available: true,
    status: 'Available',
    description:
      'Fuel-sipping city and weekend tourer with 360-degree camera, ventilated seats, and effortless urban drivability across Coorg, Mysuru, and Kochi.',
    images: [hycrossImg],
  },
];

export const DEFAULT_PACKAGES: TourPackage[] = [
  {
    id: 'pkg-rajasthan-01',
    name: 'Royal Rajasthan Heritage Circuit',
    destination: 'Jaipur · Jodhpur · Udaipur',
    days: 6,
    nights: 5,
    price: 28500,
    pickup_location: 'Jaipur Airport / Railway Station',
    dropoff_location: 'Udaipur Airport',
    itinerary: [
      { day: 1, title: 'Arrival in Jaipur & Pink City Walk', description: 'Chauffeur welcome at Jaipur, heritage haveli check-in, and evening sunset at Nahargarh Fort overlooking the Pink City.' },
      { day: 2, title: 'Amber Fort, Jal Mahal & City Palace', description: 'Guided morning ascent to Amber Fort, photo halt at Jal Mahal lake, and curated afternoon tour of Jantar Mantar.' },
      { day: 3, title: 'Drive to Jodhpur via Pushkar', description: 'Scenic expressway transfer with sacred Pushkar Lake pause, arriving at the Blue City by dusk.' },
      { day: 4, title: 'Mehrangarh Fort & Jaswant Thada', description: 'Explore towering Mehrangarh ramparts, blue-washed old lanes, and spice markets around Clock Tower.' },
      { day: 5, title: 'Ranakpur Marble Temples to Udaipur', description: 'Drive through Aravalli hills with Ranakpur Jain temple visit; sunset boat cruise on Lake Pichola.' },
      { day: 6, title: 'City Palace Udaipur & Departure', description: 'Morning walk through Jagdish Temple and Saheliyon-ki-Bari before comfortable drop-off at Udaipur Airport.' },
    ],
    inclusions: ['Private AC Innova Hycross with Chauffeur', '5 Nights Heritage Boutique Stays with Breakfast', 'All State Tolls, Parking & Driver Allowance', 'Lake Pichola Sunset Boat Ride'],
    exclusions: ['Monument Entry & Camera Tickets', 'Lunches, Dinners & Personal Expenses', 'Airfare / Train Tickets'],
    suggested_vehicle_id: 'veh-hycross-01',
    max_passengers: 6,
    status: 'Published',
    images: [rajasthanImg, hycrossImg],
    rating: 4.9,
    review_count: 142,
  },
  {
    id: 'pkg-ladakh-02',
    name: 'Ladakh High-Pass Expedition',
    destination: 'Leh · Nubra Valley · Pangong Tso',
    days: 7,
    nights: 6,
    price: 36900,
    pickup_location: 'Leh Kushok Bakula Airport',
    dropoff_location: 'Leh Airport',
    itinerary: [
      { day: 1, title: 'Leh Arrival & Acclimatization', description: 'Rest and hydration at boutique eco-lodge; gentle evening stroll around Leh Market and Shanti Stupa.' },
      { day: 2, title: 'Sham Valley & Magnetic Hill', description: 'Visit Sangam confluence of Indus & Zanskar rivers, Gurudwara Pathar Sahib, and Alchi Monastery.' },
      { day: 3, title: 'Leh to Nubra via Khardung La (17,982 ft)', description: 'Cross one of the highest motorable passes into Hunder silver sand dunes for double-humped camel trails.' },
      { day: 4, title: 'Turtuk Border Village Excursion', description: 'Full-day cultural exploration of apricot orchards and Balti heritage along the Shyok river.' },
      { day: 5, title: 'Nubra to Pangong Tso via Shyok Route', description: 'Dramatic mountain river drive arriving at sapphire-blue Pangong Lake beside snow-draped peaks.' },
      { day: 6, title: 'Chang La Pass Return to Leh', description: 'Morning lakeside breakfast followed by return crossing over Chang La Pass with Hemis Monastery halt.' },
      { day: 7, title: 'Departure from Leh', description: 'Early morning airport drop-off with cherished Himalayan memories.' },
    ],
    inclusions: ['4x4 Expedition SUV with Mountain Specialist Driver', 'Oxygen Cylinder & First-Aid Kit Onboard', 'Inner Line Permits & Wildlife Fees', '6 Nights Boutique Hotels & Luxury Pangong Cottages'],
    exclusions: ['Flights to/from Leh', 'Camel Ride & Monastery Donations', 'Personal Winter Gear'],
    suggested_vehicle_id: 'veh-prado-03',
    max_passengers: 6,
    status: 'Published',
    images: [heroImg, tharImg],
    rating: 4.95,
    review_count: 98,
  },
  {
    id: 'pkg-kerala-03',
    name: 'Kerala Emerald Backwaters & Munnar Mist',
    destination: 'Kochi · Munnar · Alleppey',
    days: 5,
    nights: 4,
    price: 24800,
    pickup_location: 'Cochin International Airport',
    dropoff_location: 'Cochin International Airport',
    itinerary: [
      { day: 1, title: 'Kochi to Munnar Tea Hills', description: 'Private pickup from Kochi, stopping at Cheeyappara Waterfalls on the winding ascent into emerald tea estates.' },
      { day: 2, title: 'Eravikulam Park & Echo Point', description: 'Morning misty hike in Eravikulam National Park, Mattupetty Dam, and Tata Tea Museum tasting.' },
      { day: 3, title: 'Thekkady Spice Plantations', description: 'Scenic Western Ghats drive through cardamom estates with optional Kalaripayattu cultural evening.' },
      { day: 4, title: 'Alleppey Private Houseboat Cruise', description: 'Board your traditional wooden Kettuvallam houseboat for a tranquil full-day cruise with freshly cooked Kerala meals.' },
      { day: 5, title: 'Fort Kochi Heritage & Departure', description: 'Disembark after sunrise breakfast, visit Chinese Fishing Nets and Jew Town before airport drop.' },
    ],
    inclusions: ['Private AC Vehicle with English-Speaking Driver', '2 Nights Munnar Resort + 1 Night Thekkady', '1 Night Private Luxury Houseboat with All Meals', 'All Parking, Tolls & Fuel'],
    exclusions: ['Airfare', 'National Park Safari Tickets', 'Ayurvedic Spa Treatments'],
    suggested_vehicle_id: 'veh-vitara-05',
    max_passengers: 5,
    status: 'Published',
    images: [keralaImg],
    rating: 4.88,
    review_count: 116,
  },
  {
    id: 'pkg-goa-04',
    name: 'Konkan & Goa Coastal Drive Escape',
    destination: 'North Goa · Cabo de Rama · South Goa',
    days: 4,
    nights: 3,
    price: 18400,
    pickup_location: 'Dabolim / Mopa Airport',
    dropoff_location: 'Dabolim / Mopa Airport',
    itinerary: [
      { day: 1, title: 'Handover & Fontainhas Sunset', description: 'Pick up your sanitized Thar 4x4 at the airport; check into Panjim boutique villa and walk Fontainhas Latin Quarter.' },
      { day: 2, title: 'Chapora Cliffs & Spice Farm', description: 'Drive along scenic coastal ridges, explore Vagator cliffs, and savour traditional Goan lunch at a tropical spice farm.' },
      { day: 3, title: 'Cabo de Rama Fort & Palolem', description: 'Head south along palm-lined coastal roads to Cabo de Rama cliffside fort and tranquil Agonda cove.' },
      { day: 4, title: 'Divar Island Ferry & Drop-off', description: 'Morning drive across Mandovi river onto peaceful Divar Island before seamless vehicle return at airport.' },
    ],
    inclusions: ['4 Days Self-Drive or Chauffeured Thar 4x4', '3 Nights Boutique Coastal Resort with Breakfast', '24/7 Roadside Concierge & Unlimited Coastal Km'],
    exclusions: ['Fuel (Full-to-Full Policy for Self-Drive)', 'Watersports & Club Entry'],
    suggested_vehicle_id: 'veh-thar-02',
    max_passengers: 4,
    status: 'Published',
    images: [tharImg],
    rating: 4.85,
    review_count: 84,
  },
];

export const DEFAULT_REVIEWS: ReviewItem[] = [
  { id: 'rev-1', customer_name: 'Ananya Deshmukh', location: 'Mumbai', trip_type: 'Royal Rajasthan Circuit', rating: 5, comment: 'Our Innova Hycross was spotless and Rajveer knew every quiet shortcut between Jaipur and Udaipur. Zero billing surprises at the end of the 6-day trip.', is_approved: true, created_at: '2026-10-12' },
  { id: 'rev-2', customer_name: 'Siddharth Malhotra', location: 'New Delhi', trip_type: 'Thar 4x4 Self-Drive', rating: 5, comment: 'Handover at Mopa airport took less than 10 minutes. The Thar handled steep Konkan ghats effortlessly and the security deposit policy was crystal clear.', is_approved: true, created_at: '2026-10-20' },
  { id: 'rev-3', customer_name: 'Dr. Meera Krishnan', location: 'Bengaluru', trip_type: 'Kerala Backwaters Package', rating: 5, comment: 'From Munnar misty mornings to our private Kettuvallam houseboat in Alleppey, TravelGo handled every transfer seamlessly for my parents.', is_approved: true, created_at: '2026-11-02' },
  { id: 'rev-4', customer_name: 'Kabir & Rhea Sen', location: 'Kolkata', trip_type: 'Ladakh Expedition', rating: 5, comment: 'Tenzin navigated Khardung La and Pangong Tso with calm professionalism. Having oxygen kits onboard gave our family complete peace of mind.', is_approved: true, created_at: '2026-11-10' },
];

export const DEFAULT_GALLERY: GalleryItem[] = [
  { id: 'gal-1', image_url: heroImg, caption: 'Ascending Chang La Pass in our Land Cruiser Expedition fleet', location: 'Ladakh, J&K', sort_order: 1 },
  { id: 'gal-2', image_url: rajasthanImg, caption: 'Golden hour reflection at Amber Fort, Jaipur', location: 'Jaipur, Rajasthan', sort_order: 2 },
  { id: 'gal-3', image_url: keralaImg, caption: 'Morning mist along emerald Alleppey canals', location: 'Alleppey, Kerala', sort_order: 3 },
  { id: 'gal-4', image_url: tharImg, caption: 'Sunset cliffside halt with the Thar 4x4 Earth Edition', location: 'South Goa', sort_order: 4 },
  { id: 'gal-5', image_url: hycrossImg, caption: 'Heritage haveli arrival in the Toyota Innova Hycross ZX', location: 'Udaipur, Rajasthan', sort_order: 5 },
];

export const DEFAULT_FAQS: FaqItem[] = [
  { id: 'faq-1', question: 'How does per-km outstation billing work?', answer: 'Outstation chauffeur trips use a standard minimum of 250 km per calendar day multiplied by the vehicle per-km rate, plus a fixed daily driver allowance. State border taxes and highway tolls are billed strictly at actuals with FASTag receipts.', sort_order: 1, is_active: true },
  { id: 'faq-2', question: 'What documents do I need for a self-drive SUV?', answer: 'You need an original Indian driving licence (or valid International Driving Permit with passport) and Aadhaar card or Passport for quick digital KYC verification at vehicle handover.', sort_order: 2, is_active: true },
  { id: 'faq-3', question: 'Are your vehicles permitted across all Indian states?', answer: 'Yes. Every TravelGo vehicle carries an All-India Tourist Permit (AITP), comprehensive passenger insurance, and active FASTag.', sort_order: 3, is_active: true },
  { id: 'faq-4', question: 'Do I pay the full amount online when submitting a booking request?', answer: 'No. Submitting a booking request reserves your preference at zero charge. Our trip specialist confirms availability and sends an itemized quotation before you pay a small confirmation advance.', sort_order: 4, is_active: true },
  { id: 'faq-5', question: 'Can I customize a tour package itinerary or swap the vehicle?', answer: 'Absolutely. Every package itinerary can be tailored for extra nights, hotel tiers, or a preferred SUV class from our fleet—simply mention it in the booking notes or message us on WhatsApp.', sort_order: 5, is_active: true },
];
