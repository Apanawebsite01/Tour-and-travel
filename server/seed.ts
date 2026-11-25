import crypto from 'node:crypto';
import { count } from 'drizzle-orm';
import { db } from '../src/db/index.ts';
import {
  bookings,
  bookingStatusHistory,
  customers,
  drivers,
  faqs,
  gallery,
  payments,
  pricingRules,
  reviews,
  siteSettings,
  tourPackages,
  vehicleImages,
  vehicles,
} from '../src/db/schema.ts';

const HERO_IMG = '/src/assets/images/hero_himalayan_suv_1795623484938.jpg';
const HYCROSS_IMG = '/src/assets/images/vehicle_suv_hycross_1795623485346.jpg';
const THAR_IMG = '/src/assets/images/vehicle_thar_adventure_1795623485521.jpg';
const RAJASTHAN_IMG = '/src/assets/images/package_rajasthan_palace_1795623485510.jpg';
const KERALA_IMG = '/src/assets/images/package_kerala_backwaters_1795623487119.jpg';

function uid(): string {
  return crypto.randomUUID();
}

export async function seedDatabase(): Promise<void> {
  try {
    const [{ total }] = await db.select({ total: count() }).from(vehicles);
    if (Number(total) > 0) {
      return;
    }

    const defaultSettings: Record<string, unknown> = {
      business_name: 'TravelGo',
      tagline: 'Across India, Without Compromise',
      hero_headline: 'Explore India at your own pace, from Himalayan passes to coastal highways.',
      hero_subheadline:
        'Transparent per-km pricing, sanitized 4x4 SUVs, verified chauffeurs, and hand-crafted tour itineraries across 28 Indian states.',
      hero_image: HERO_IMG,
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

    const seedVehicles = [
      {
        id: 'veh-hycross-01',
        name: 'Toyota Innova Hycross ZX',
        brand: 'Toyota',
        model: 'Innova Hycross 2025',
        registration_no: 'HR-26-EV-4821',
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
        is_archived: false,
        is_published: true,
        description:
          'Plush Ottoman captain seats, panoramic sunroof, and whisper-quiet strong hybrid powertrain built for long family circuits across Rajasthan and Himachal.',
        images: [HYCROSS_IMG, HERO_IMG],
      },
      {
        id: 'veh-thar-02',
        name: 'Mahindra Thar 4x4 Earth Edition',
        brand: 'Mahindra',
        model: 'Thar LX Hard Top 4WD',
        registration_no: 'GA-02-AT-1991',
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
        is_archived: false,
        is_published: true,
        description:
          'Trail-rated 4x4 capability with roof expedition rack, all-terrain tyres, and Apple CarPlay—ideal for Konkan coast drives and Spiti valleys.',
        images: [THAR_IMG],
      },
      {
        id: 'veh-prado-03',
        name: 'Toyota Land Cruiser Expedition',
        brand: 'Toyota',
        model: 'Land Cruiser 300 VX',
        registration_no: 'DL-01-CA-9004',
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
        is_archived: false,
        is_published: true,
        description:
          'Flagship high-altitude expedition SUV with oxygen kit, satellite SOS beacon, and multi-terrain select—exclusively paired with our senior Himalayan expedition chauffeurs.',
        images: [HERO_IMG, HYCROSS_IMG],
      },
      {
        id: 'veh-scorpio-04',
        name: 'Mahindra Scorpio-N Z8L 4WD',
        brand: 'Mahindra',
        model: 'Scorpio-N 4Xplor',
        registration_no: 'RJ-14-TG-3312',
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
        is_archived: false,
        is_published: true,
        description:
          'Commanding highway presence with Sony 3D audio, dual-zone climate control, and rugged body-on-frame suspension for desert forts and hill stations.',
        images: [THAR_IMG, HERO_IMG],
      },
      {
        id: 'veh-vitara-05',
        name: 'Maruti Grand Vitara Alpha+',
        brand: 'Maruti Suzuki',
        model: 'Grand Vitara Intelligent Hybrid',
        registration_no: 'KA-03-MN-7140',
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
        is_archived: false,
        is_published: true,
        description:
          'Fuel-sipping city and weekend tourer with 360-degree camera, ventilated seats, and effortless urban drivability across Coorg, Mysuru, and Kochi.',
        images: [HYCROSS_IMG],
      },
      {
        id: 'veh-urbania-06',
        name: 'Force Urbania Luxury 12-Seater',
        brand: 'Force Motors',
        model: 'Urbania Executive Van',
        registration_no: 'DL-1C-VB-8820',
        seats: 12,
        luggage_capacity: 10,
        is_ac: true,
        fuel_type: 'Diesel',
        transmission: 'Manual',
        price_per_km: 34,
        daily_rate: 6200,
        min_km_per_day: 250,
        driver_allowance: 750,
        driver_available: true,
        self_drive_available: false,
        status: 'Under Maintenance',
        is_archived: false,
        is_published: true,
        description:
          'Executive group carrier featuring individual reclining seats, triple-AC vents, reading lamps, and panoramic sealed windows for corporate retreats and large families.',
        images: [HYCROSS_IMG],
      },
    ];

    const today = new Date();
    const addDays = (d: number) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      return dt.toISOString().slice(0, 10);
    };
    const monthDate = (monthsAgo: number, day: number) => {
      const dt = new Date(today.getFullYear(), today.getMonth() - monthsAgo, day);
      return dt.toISOString().slice(0, 10);
    };

    await db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(defaultSettings)) {
        await tx
          .insert(siteSettings)
          .values({ key, value })
          .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
      }

      for (const v of seedVehicles) {
        const { images, ...vehData } = v;
        await tx.insert(vehicles).values(vehData).onConflictDoNothing();
        for (let idx = 0; idx < images.length; idx++) {
          await tx
            .insert(vehicleImages)
            .values({
              id: uid(),
              vehicle_id: v.id,
              image_url: images[idx],
              sort_order: idx,
            })
            .onConflictDoNothing();
        }
      }

      const seedPackages = [
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
          images: [RAJASTHAN_IMG, HYCROSS_IMG],
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
          images: [HERO_IMG, THAR_IMG],
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
          images: [KERALA_IMG],
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
          images: [THAR_IMG],
          rating: 4.85,
          review_count: 84,
        },
      ];

      for (const p of seedPackages) {
        await tx.insert(tourPackages).values(p).onConflictDoNothing();
      }

      const seedDrivers = [
        { id: 'drv-01', name: 'Rajveer Singh Rathore', phone: '+91 98290 11234', photo_url: '', licence_no: 'RJ14-20160048219', licence_expiry: addDays(540), is_active: true },
        { id: 'drv-02', name: 'Tenzin Dorjay', phone: '+91 94191 88321', photo_url: '', licence_no: 'LA01-20150019284', licence_expiry: addDays(410), is_active: true },
        { id: 'drv-03', name: 'Arun Kumar Nair', phone: '+91 98470 55412', photo_url: '', licence_no: 'KL07-20180077410', licence_expiry: addDays(18), is_active: true },
        { id: 'drv-04', name: 'Vikramjit Gill', phone: '+91 98155 64320', photo_url: '', licence_no: 'HR26-20190051298', licence_expiry: addDays(720), is_active: true },
      ];
      for (const d of seedDrivers) {
        await tx.insert(drivers).values(d).onConflictDoNothing();
      }

      const seedCustomers = [
        { id: 'cust-01', name: 'Ananya Deshmukh', mobile: '+91 98201 44512', email: 'ananya.deshmukh@example.in' },
        { id: 'cust-02', name: 'Siddharth Malhotra', mobile: '+91 98112 77890', email: 'siddharth.m@example.in' },
        { id: 'cust-03', name: 'Priya & Karthik Iyer', mobile: '+91 98400 32198', email: 'karthik.iyer@example.in' },
        { id: 'cust-04', name: 'Rohan Kapoor', mobile: '+91 99104 65432', email: 'rohan.kapoor@example.in' },
      ];
      for (const c of seedCustomers) {
        await tx.insert(customers).values(c).onConflictDoNothing();
      }

      const seedBookings = [
        {
          id: 'bk-01',
          reference_id: 'TG-2026-1041',
          booking_type: 'package',
          customer_id: 'cust-01',
          vehicle_id: 'veh-hycross-01',
          package_id: 'pkg-rajasthan-01',
          driver_id: 'drv-01',
          pickup_location: 'Jaipur Airport',
          destination: 'Jaipur · Jodhpur · Udaipur',
          travel_date: monthDate(2, 10),
          pickup_time: '09:30',
          return_date: monthDate(2, 15),
          passengers: 4,
          driver_preference: 'With Driver',
          notes: 'Family anniversary trip, child seat requested.',
          status: 'Completed',
          total_amount: 57000,
          quotation_breakdown: { base: 57000 },
          admin_notes: 'Completed smoothly. Customer left 5-star review.',
        },
        {
          id: 'bk-02',
          reference_id: 'TG-2026-1088',
          booking_type: 'vehicle',
          customer_id: 'cust-02',
          vehicle_id: 'veh-thar-02',
          package_id: null,
          driver_id: null,
          pickup_location: 'Mopa Airport Goa',
          destination: 'South Goa Coastal Loop',
          travel_date: monthDate(1, 14),
          pickup_time: '11:00',
          return_date: monthDate(1, 18),
          passengers: 2,
          driver_preference: 'Self-Drive',
          notes: 'Self-drive KYC uploaded at counter.',
          status: 'Completed',
          total_amount: 19000,
          quotation_breakdown: { base: 19000 },
          admin_notes: 'Returned with full tank and zero scratches.',
        },
        {
          id: 'bk-03',
          reference_id: 'TG-2026-1124',
          booking_type: 'package',
          customer_id: 'cust-03',
          vehicle_id: 'veh-prado-03',
          package_id: 'pkg-ladakh-02',
          driver_id: 'drv-02',
          pickup_location: 'Leh Airport',
          destination: 'Leh · Nubra · Pangong Tso',
          travel_date: addDays(4),
          pickup_time: '08:00',
          return_date: addDays(10),
          passengers: 4,
          driver_preference: 'With Driver',
          notes: 'Need oxygen canisters checked before Leh pickup.',
          status: 'Vehicle Assigned',
          total_amount: 73800,
          quotation_breakdown: { base: 73800 },
          admin_notes: 'Tenzin assigned. Inner line permits approved.',
        },
        {
          id: 'bk-04',
          reference_id: 'TG-2026-1149',
          booking_type: 'vehicle',
          customer_id: 'cust-04',
          vehicle_id: 'veh-hycross-01',
          package_id: null,
          driver_id: null,
          pickup_location: 'Gurugram CyberHub',
          destination: 'Shimla & Narkanda',
          travel_date: addDays(8),
          pickup_time: '06:30',
          return_date: addDays(12),
          passengers: 5,
          driver_preference: 'With Driver',
          notes: 'Early morning departure preferred.',
          status: 'Confirmed',
          total_amount: 24600,
          quotation_breakdown: { base: 24600 },
          admin_notes: 'Advance received via UPI. Assign driver 48h prior.',
        },
        {
          id: 'bk-05',
          reference_id: 'TG-2026-1172',
          booking_type: 'package',
          customer_id: 'cust-01',
          vehicle_id: 'veh-vitara-05',
          package_id: 'pkg-kerala-03',
          driver_id: null,
          pickup_location: 'Cochin Airport',
          destination: 'Kochi · Munnar · Alleppey',
          travel_date: addDays(16),
          pickup_time: '10:00',
          return_date: addDays(20),
          passengers: 2,
          driver_preference: 'With Driver',
          notes: 'Vegetarian meals requested on houseboat.',
          status: 'Pending',
          total_amount: 49600,
          quotation_breakdown: { base: 49600 },
          admin_notes: '',
        },
      ];

      for (const b of seedBookings) {
        await tx.insert(bookings).values(b).onConflictDoNothing();
        await tx
          .insert(bookingStatusHistory)
          .values({
            id: uid(),
            booking_id: b.id,
            old_status: null,
            new_status: 'Pending',
            changed_by: null,
            note: 'Booking submitted via TravelGo website',
          })
          .onConflictDoNothing();
        if (b.status !== 'Pending') {
          await tx
            .insert(bookingStatusHistory)
            .values({
              id: uid(),
              booking_id: b.id,
              old_status: 'Pending',
              new_status: b.status,
              changed_by: null,
              note: 'Updated by operations desk',
            })
            .onConflictDoNothing();
        }
      }

      const seedPayments = [
        { id: uid(), booking_id: 'bk-01', amount: 20000, payment_type: 'Advance', method: 'UPI', payment_date: monthDate(2, 3), transaction_ref: 'UPI-492019283' },
        { id: uid(), booking_id: 'bk-01', amount: 37000, payment_type: 'Balance', method: 'Bank Transfer', payment_date: monthDate(2, 15), transaction_ref: 'NEFT-8829104' },
        { id: uid(), booking_id: 'bk-02', amount: 19000, payment_type: 'Full', method: 'Card', payment_date: monthDate(1, 14), transaction_ref: 'POS-774129' },
        { id: uid(), booking_id: 'bk-03', amount: 30000, payment_type: 'Advance', method: 'UPI', payment_date: monthDate(0, 3), transaction_ref: 'UPI-618294011' },
        { id: uid(), booking_id: 'bk-04', amount: 10000, payment_type: 'Advance', method: 'UPI', payment_date: monthDate(0, 7), transaction_ref: 'UPI-618992310' },
      ];
      for (const p of seedPayments) {
        await tx.insert(payments).values(p).onConflictDoNothing();
      }

      const seedReviews = [
        { id: uid(), customer_name: 'Ananya Deshmukh', location: 'Mumbai', trip_type: 'Royal Rajasthan Circuit', rating: 5, comment: 'Our Innova Hycross was spotless and Rajveer knew every quiet shortcut between Jaipur and Udaipur. Zero billing surprises at the end of the 6-day trip.', is_approved: true },
        { id: uid(), customer_name: 'Siddharth Malhotra', location: 'New Delhi', trip_type: 'Thar 4x4 Self-Drive', rating: 5, comment: 'Handover at Mopa airport took less than 10 minutes. The Thar handled steep Konkan ghats effortlessly and the security deposit policy was crystal clear.', is_approved: true },
        { id: uid(), customer_name: 'Dr. Meera Krishnan', location: 'Bengaluru', trip_type: 'Kerala Backwaters Package', rating: 5, comment: 'From Munnar misty mornings to our private Kettuvallam houseboat in Alleppey, TravelGo handled every transfer seamlessly for my parents.', is_approved: true },
        { id: uid(), customer_name: 'Kabir & Rhea Sen', location: 'Kolkata', trip_type: 'Ladakh Expedition', rating: 5, comment: 'Tenzin navigated Khardung La and Pangong Tso with calm professionalism. Having oxygen kits onboard gave our family complete peace of mind.', is_approved: true },
      ];
      for (const r of seedReviews) {
        await tx.insert(reviews).values(r).onConflictDoNothing();
      }

      const seedGallery = [
        { id: uid(), image_url: HERO_IMG, caption: 'Ascending Chang La Pass in our Land Cruiser Expedition fleet', location: 'Ladakh, J&K', sort_order: 1 },
        { id: uid(), image_url: RAJASTHAN_IMG, caption: 'Golden hour reflection at Amber Fort, Jaipur', location: 'Jaipur, Rajasthan', sort_order: 2 },
        { id: uid(), image_url: KERALA_IMG, caption: 'Morning mist along emerald Alleppey canals', location: 'Alleppey, Kerala', sort_order: 3 },
        { id: uid(), image_url: THAR_IMG, caption: 'Sunset cliffside halt with the Thar 4x4 Earth Edition', location: 'South Goa', sort_order: 4 },
        { id: uid(), image_url: HYCROSS_IMG, caption: 'Heritage haveli arrival in the Toyota Innova Hycross ZX', location: 'Udaipur, Rajasthan', sort_order: 5 },
      ];
      for (const g of seedGallery) {
        await tx.insert(gallery).values(g).onConflictDoNothing();
      }

      const seedFaqs = [
        { id: uid(), question: 'How does per-km outstation billing work?', answer: 'Outstation chauffeur trips use a standard minimum of 250 km per calendar day multiplied by the vehicle per-km rate, plus a fixed daily driver allowance. State border taxes and highway tolls are billed strictly at actuals with FASTag receipts.', sort_order: 1, is_active: true },
        { id: uid(), question: 'What documents do I need for a self-drive SUV?', answer: 'You need an original Indian driving licence (or valid International Driving Permit with passport) and Aadhaar card or Passport for quick digital KYC verification at vehicle handover.', sort_order: 2, is_active: true },
        { id: uid(), question: 'Are your vehicles permitted across all Indian states?', answer: 'Yes. Every TravelGo vehicle carries an All-India Tourist Permit (AITP), comprehensive passenger insurance, and active FASTag.', sort_order: 3, is_active: true },
        { id: uid(), question: 'Do I pay the full amount online when submitting a booking request?', answer: 'No. Submitting a booking request reserves your preference at zero charge. Our trip specialist confirms availability and sends an itemized quotation before you pay a small confirmation advance.', sort_order: 4, is_active: true },
        { id: uid(), question: 'Can I customize a tour package itinerary or swap the vehicle?', answer: 'Absolutely. Every package itinerary can be tailored for extra nights, hotel tiers, or a preferred SUV class from our fleet—simply mention it in the booking notes or message us on WhatsApp.', sort_order: 5, is_active: true },
      ];
      for (const f of seedFaqs) {
        await tx.insert(faqs).values(f).onConflictDoNothing();
      }

      const seedRules = [
        { id: 'pr-local', name: 'Local City 8Hr / 80Km Standard', category: 'Local', per_km_rate: 18, min_km_per_day: 80, driver_allowance: 350, night_charge: 250, waiting_charge_per_hr: 150, extra_km_charge: 18, seasonal_multiplier: 1.0, is_active: true },
        { id: 'pr-outstation', name: 'Outstation Highway Standard', category: 'Outstation', per_km_rate: 22, min_km_per_day: 250, driver_allowance: 600, night_charge: 400, waiting_charge_per_hr: 200, extra_km_charge: 22, seasonal_multiplier: 1.0, is_active: true },
        { id: 'pr-peak', name: 'Peak Season Himalayan / Festive Tariff', category: 'Seasonal', per_km_rate: 28, min_km_per_day: 250, driver_allowance: 750, night_charge: 500, waiting_charge_per_hr: 250, extra_km_charge: 28, seasonal_multiplier: 1.15, is_active: true },
      ];
      for (const r of seedRules) {
        await tx.insert(pricingRules).values(r).onConflictDoNothing();
      }
    });
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to initialize default catalog records.', { cause: error });
  }
}
