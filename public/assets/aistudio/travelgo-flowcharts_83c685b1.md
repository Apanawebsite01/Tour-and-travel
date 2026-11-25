# TravelGo – Tour & Travel Website: Complete Flowcharts & Build Spec

> Hand this file to your AI coder. Every diagram is Mermaid (renders in GitHub, VS Code with Mermaid extension, Claude, Cursor, mermaid.live).
> Stack: React + Vite, Tailwind, Supabase (Postgres, Auth, Storage, RLS), Vercel, Google Maps, React Hook Form + Zod, Recharts, Lucide React.

---

## 1. Master System Overview

```mermaid
flowchart TD
    V["Visitor / Customer"] --> W["Public Website - React + Vite"]
    W --> B["Booking Request Form"]
    B --> DB[("Supabase PostgreSQL")]
    DB --> N["Admin Notification - Email + Dashboard"]
    N --> A["Admin Panel - /admin/login"]
    A --> M1["Vehicles"]
    A --> M2["Tour Packages"]
    A --> M3["Bookings"]
    A --> M4["Drivers"]
    A --> M5["Customers"]
    A --> M6["Pricing and Payments"]
    A --> M7["Website Content"]
    A --> M8["Reports"]
    M1 --> DB
    M2 --> DB
    M3 --> DB
    M4 --> DB
    M5 --> DB
    M6 --> DB
    M7 --> DB
    DB --> W
    A --> ST[("Supabase Storage - images")]
    ST --> W
    W --> WA["WhatsApp click-to-chat"]
    W --> GM["Google Maps"]
```

---

## 2. Public Website Sitemap & Navigation

```mermaid
flowchart TD
    NAV["Navbar: Logo + Menu + WhatsApp button"] --> HOME["/ Home"]
    NAV --> ABOUT["/about"]
    NAV --> VEH["/vehicles"]
    NAV --> PKG["/packages"]
    NAV --> GAL["/gallery"]
    NAV --> REV["/reviews"]
    NAV --> FAQ["/faqs"]
    NAV --> CON["/contact"]

    VEH --> VD["/vehicles/:id Vehicle Details"]
    PKG --> PD["/packages/:id Package Details"]
    VD --> BK1["/booking?type=vehicle&id=..."]
    PD --> BK2["/booking?type=package&id=..."]
    HOME --> BK3["/booking via hero search form"]
    BK1 --> BS["Booking Success Page - Reference ID"]
    BK2 --> BS
    BK3 --> BS

    FOOT["Footer"] --> POL1["/privacy-policy"]
    FOOT --> POL2["/terms"]
    FOOT --> POL3["/cancellation-policy"]
```

### Home page section order
1. Navbar (logo, menu)
2. Hero banner (travel themed) + booking search form
3. Why Choose Us
4. Featured vehicles
5. Popular tour packages
6. How Booking Works (4 steps)
7. Testimonials
8. Travel gallery
9. Contact + WhatsApp section
10. Footer (quick links, policies, socials)

---

## 3. Customer Booking Flow

```mermaid
flowchart TD
    S(["Start"]) --> C{"Booking type?"}
    C -->|Vehicle rental| V1["Select vehicle"]
    C -->|Tour package| P1["Select package"]
    V1 --> D1{"Driver preference"}
    D1 -->|With driver| F["Fill booking form"]
    D1 -->|Self-drive| F
    P1 --> F
    F --> FV["Fields: name, mobile, email optional, pickup, destination, travel date, pickup time, return date, passengers, driver preference, notes"]
    FV --> Z{"Zod client validation passes?"}
    Z -->|No| F
    Z -->|Yes| SV{"Server validation + RLS insert"}
    SV -->|Fail| ERR["Show error, keep form data"]
    ERR --> F
    SV -->|Pass| CU["Find or create customer by mobile"]
    CU --> BI["Insert booking: status = Pending, generate Booking Reference ID"]
    BI --> SH["Insert booking_status_history row"]
    SH --> EM["Send email to admin"]
    EM --> OK["Success page: show Reference ID + WhatsApp link"]
    OK --> E(["End"])
```

---

## 4. Admin Booking Handling Flow

```mermaid
flowchart TD
    A1["New booking appears: Pending"] --> A2["Admin opens booking details"]
    A2 --> A3["Check vehicle availability on calendar"]
    A3 --> A4{"Vehicle free for dates?"}
    A4 -->|No| A5["Suggest alternate vehicle or dates"]
    A5 --> A6["Contact customer: status = Contacted"]
    A4 -->|Yes| A6
    A6 --> A7["Prepare quotation using pricing rules"]
    A7 --> A8{"Customer agrees?"}
    A8 -->|No| REJ["Status = Rejected or Cancelled"]
    A8 -->|Yes| A9["Run overlap check on confirm"]
    A9 --> A10{"Overlap with confirmed booking?"}
    A10 -->|Yes| BLOCK["Block confirmation, show conflict"]
    BLOCK --> A5
    A10 -->|No| CONF["Status = Confirmed"]
    CONF --> A11{"With driver?"}
    A11 -->|Yes| A12["Assign driver, check driver availability"]
    A11 -->|Self-drive| A13["Skip driver assignment"]
    A12 --> VA["Status = Vehicle Assigned"]
    A13 --> VA
    VA --> A14["Record advance payment"]
    A14 --> IP["Status = In Progress on trip start"]
    IP --> A15["Trip ends: record balance payment"]
    A15 --> COMP["Status = Completed"]
    COMP --> INV["Generate PDF invoice - optional"]
```

---

## 5. Booking Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Contacted
    Pending --> Rejected
    Pending --> Cancelled
    Contacted --> Confirmed
    Contacted --> Rejected
    Contacted --> Cancelled
    Confirmed --> VehicleAssigned
    Confirmed --> Cancelled
    VehicleAssigned --> InProgress
    VehicleAssigned --> Cancelled
    InProgress --> Completed
    Completed --> [*]
    Rejected --> [*]
    Cancelled --> [*]
```

Every transition writes a row to `booking_status_history` (booking_id, old_status, new_status, changed_by, changed_at, note).

### Overlap prevention rule (implement in database, not only in UI)
- Two bookings for the same `vehicle_id` cannot both have status in (Confirmed, Vehicle Assigned, In Progress) with overlapping date ranges.
- Implement with a Postgres exclusion constraint using `btree_gist` and `daterange(travel_date, return_date, '[]')`, or a trigger that raises an error.

---

## 6. Admin Panel Structure

```mermaid
flowchart LR
    L["/admin/login"] --> AUTH{"Supabase Auth + role = admin?"}
    AUTH -->|No| L
    AUTH -->|Yes| DASH["Dashboard"]
    DASH --> SB["Sidebar"]
    SB --> S1["Vehicle Management"]
    SB --> S2["Booking Management"]
    SB --> S3["Tour Packages"]
    SB --> S4["Drivers"]
    SB --> S5["Customers"]
    SB --> S6["Pricing"]
    SB --> S7["Payments"]
    SB --> S8["Availability Calendar"]
    SB --> S9["Gallery"]
    SB --> S10["Reviews"]
    SB --> S11["Website Management"]
    SB --> S12["Reports"]
    SB --> S13["Settings"]
```

### Dashboard widgets
Total vehicles, available, unavailable, pending requests, confirmed bookings, completed trips, total recorded revenue, upcoming trips, recent enquiries, monthly bookings chart, monthly revenue chart (Recharts).

### Admin routes
`/admin/login`, `/admin`, `/admin/vehicles`, `/admin/vehicles/new`, `/admin/vehicles/:id`, `/admin/bookings`, `/admin/bookings/:id`, `/admin/packages`, `/admin/packages/new`, `/admin/packages/:id`, `/admin/drivers`, `/admin/customers`, `/admin/customers/:id`, `/admin/pricing`, `/admin/payments`, `/admin/calendar`, `/admin/gallery`, `/admin/reviews`, `/admin/website`, `/admin/reports`, `/admin/settings`

---

## 7. Vehicle Management Flow

```mermaid
flowchart TD
    VL["Vehicle list"] --> ADD["Add vehicle"]
    VL --> EDIT["Edit vehicle"]
    VL --> ARC["Archive vehicle"]
    VL --> HIST["View booking history"]
    ADD --> FORM["Form: name, brand, model, registration number admin-only, seats, AC, fuel, transmission, per-km price, min km per day, driver allowance, driver/self-drive options, description"]
    EDIT --> FORM
    FORM --> IMG["Upload multiple images to Supabase Storage - restrict type and size"]
    IMG --> SAVE["Save to vehicles and vehicle_images"]
    SAVE --> PUB{"Publish?"}
    PUB -->|Yes| LIVE["Appears on public /vehicles automatically"]
    PUB -->|No| DRAFT["Saved as draft"]
    EDIT --> AVL["Change availability: Available / Unavailable / Under Maintenance"]
    AVL --> LIVE
    ARC --> KEEP["Soft delete: is_archived = true, hidden from public, history preserved"]
```

---

## 8. Tour Package Management Flow

```mermaid
flowchart TD
    PL["Package list"] --> NEW["Create package"]
    PL --> ED["Edit package"]
    PL --> DE["Deactivate"]
    PL --> AR["Archive"]
    NEW --> PF["Form: name, destination, images, days and nights, price, pickup and drop-off, day-wise itinerary, inclusions, exclusions, suggested vehicle, passenger info, availability"]
    ED --> PF
    PF --> PI["Upload images"]
    PI --> PS["Save to tour_packages"]
    PS --> PP{"Status"}
    PP -->|Published| PUBL["Visible on /packages with Book button"]
    PP -->|Inactive| HID["Hidden from public"]
    PP -->|Archived| HID
```

---

## 9. Pricing & Payment Flow

```mermaid
flowchart TD
    PR["Admin Pricing module"] --> R1["Per-km rate"]
    PR --> R2["Minimum km"]
    PR --> R3["Driver allowance"]
    PR --> R4["Night charges"]
    PR --> R5["Waiting charges"]
    PR --> R6["Extra km charge"]
    PR --> R7["Local and outstation rates"]
    PR --> R8["Seasonal prices"]
    PR --> R9["Custom quotation"]
    R1 --> Q["Quotation for booking"]
    R2 --> Q
    R3 --> Q
    R4 --> Q
    R5 --> Q
    R6 --> Q
    R7 --> Q
    R8 --> Q
    R9 --> Q
    Q --> TOT["Total booking amount saved"]
    TOT --> PAY["Record payment: advance, balance, method Cash / UPI / Bank Transfer, date, reference"]
    PAY --> PS2{"Payment status"}
    PS2 --> U["Unpaid"]
    PS2 --> PP2["Partially Paid"]
    PS2 --> PD2["Paid"]
    PS2 --> RF["Refunded"]
```

Note: no online payment gateway in v1. Payment status auto-derives from sum of payments vs total amount, with manual Refunded override.

---

## 10. Driver Management Flow

```mermaid
flowchart TD
    D1["Drivers list"] --> D2["Add / edit driver"]
    D2 --> D3["Name, phone, photo, licence number, licence expiry"]
    D3 --> D4["Save"]
    D4 --> D5{"Licence expiring within 30 days?"}
    D5 -->|Yes| D6["Show warning badge"]
    D5 -->|No| D7["OK"]
    B1["Booking confirmed - with driver"] --> B2["Show only available drivers: not on overlapping trip, licence valid"]
    B2 --> B3["Assign driver to booking"]
    B0["Booking is self-drive"] --> B4["No driver required"]
```

---

## 11. Website Content Management Flow

```mermaid
flowchart TD
    WM["Admin: Website Management"] --> C1["Business name and logo"]
    WM --> C2["Homepage headings + hero images"]
    WM --> C3["About Us content"]
    WM --> C4["Contact info + WhatsApp number"]
    WM --> C5["Social links"]
    WM --> C6["FAQs"]
    WM --> C7["Terms and policies"]
    WM --> C8["Gallery photos"]
    WM --> C9["Reviews: approve / hide"]
    C1 --> SS[("site_settings, faqs, gallery, reviews")]
    C2 --> SS
    C3 --> SS
    C4 --> SS
    C5 --> SS
    C6 --> SS
    C7 --> SS
    C8 --> SS
    C9 --> SS
    SS --> PUBW["Public website reads and displays live data"]
```

---

## 12. Authentication & Security Flow

```mermaid
flowchart TD
    U["User opens /admin/*"] --> S{"Valid Supabase session?"}
    S -->|No| LOGIN["Redirect to /admin/login"]
    S -->|Yes| R{"profiles.role = admin?"}
    R -->|No| DENY["Access denied, sign out"]
    R -->|Yes| ALLOW["Load admin page"]
    LOGIN --> CRED["Email + password"]
    CRED --> SA["Supabase Auth"]
    SA -->|Fail| LOGIN
    SA -->|OK| R

    PUBU["Anonymous visitor"] --> RLS1["RLS: SELECT only published vehicles, packages, gallery, approved reviews, FAQs, safe site_settings"]
    PUBU --> RLS2["RLS: INSERT only into bookings and customers via booking form"]
    PUBU --> RLS3["No UPDATE or DELETE on anything"]
    ADM["Admin"] --> RLS4["RLS: full access to all tables"]
```

### Security checklist for the coder
- No public admin registration (disable signups; create admin manually in Supabase)
- RLS enabled on all 13 tables
- Service-role key NEVER in frontend code or Vite env vars prefixed `VITE_`
- Customers cannot set or change booking status (status forced to Pending on insert via trigger or RPC)
- Registration numbers and driver licence data never exposed to public queries (use views or column-level restrictions)
- Image uploads restricted by type (jpg, png, webp) and size (e.g. 5 MB); admin-only write on storage buckets
- Server-side validation via database constraints, checks and a booking-insert RPC
- Archived vehicles stay referenced by old bookings (soft delete, `ON DELETE RESTRICT`)

---

## 13. Database Schema (ER Diagram)

```mermaid
erDiagram
    profiles {
        uuid id PK
        text full_name
        text role
        timestamptz created_at
    }
    vehicles {
        uuid id PK
        text name
        text brand
        text model
        text registration_no
        int seats
        bool is_ac
        text fuel_type
        text transmission
        numeric price_per_km
        int min_km_per_day
        numeric driver_allowance
        bool driver_available
        bool self_drive_available
        text status
        bool is_archived
        bool is_published
        text description
    }
    vehicle_images {
        uuid id PK
        uuid vehicle_id FK
        text image_url
        int sort_order
    }
    tour_packages {
        uuid id PK
        text name
        text destination
        int days
        int nights
        numeric price
        text pickup_location
        text dropoff_location
        jsonb itinerary
        text_array inclusions
        text_array exclusions
        uuid suggested_vehicle_id FK
        int max_passengers
        text status
        text_array images
    }
    customers {
        uuid id PK
        text name
        text mobile
        text email
        timestamptz created_at
    }
    drivers {
        uuid id PK
        text name
        text phone
        text photo_url
        text licence_no
        date licence_expiry
        bool is_active
    }
    bookings {
        uuid id PK
        text reference_id
        text booking_type
        uuid customer_id FK
        uuid vehicle_id FK
        uuid package_id FK
        uuid driver_id FK
        text pickup_location
        text destination
        date travel_date
        time pickup_time
        date return_date
        int passengers
        text driver_preference
        text notes
        text status
        numeric total_amount
        text admin_notes
        timestamptz created_at
    }
    payments {
        uuid id PK
        uuid booking_id FK
        numeric amount
        text payment_type
        text method
        date payment_date
        text transaction_ref
    }
    reviews {
        uuid id PK
        text customer_name
        int rating
        text comment
        bool is_approved
    }
    gallery {
        uuid id PK
        text image_url
        text caption
        int sort_order
    }
    site_settings {
        uuid id PK
        text key
        jsonb value
    }
    faqs {
        uuid id PK
        text question
        text answer
        int sort_order
        bool is_active
    }
    booking_status_history {
        uuid id PK
        uuid booking_id FK
        text old_status
        text new_status
        uuid changed_by FK
        text note
        timestamptz changed_at
    }

    vehicles ||--o{ vehicle_images : has
    vehicles ||--o{ bookings : booked_in
    vehicles ||--o{ tour_packages : suggested_for
    customers ||--o{ bookings : places
    drivers ||--o{ bookings : assigned_to
    tour_packages ||--o{ bookings : booked_as
    bookings ||--o{ payments : has
    bookings ||--o{ booking_status_history : logs
    profiles ||--o{ booking_status_history : changed_by
```

---

## 14. Frontend Folder Structure (suggested)

```
src/
  main.jsx
  App.jsx                  # routes
  lib/
    supabase.js            # client with anon key only
    validators.js          # Zod schemas
  components/
    layout/                # Navbar, Footer, AdminSidebar, ProtectedRoute
    ui/                    # Button, Card, Modal, Badge, Table
    vehicles/              # VehicleCard, VehicleForm, ImageUploader
    packages/              # PackageCard, PackageForm, ItineraryEditor
    bookings/              # BookingForm, StatusBadge, StatusTimeline
    charts/                # RevenueChart, BookingsChart
  pages/
    public/                # Home, About, Vehicles, VehicleDetails, Packages, PackageDetails,
                           # Booking, BookingSuccess, Gallery, Reviews, Contact, FAQs, Policies
    admin/                 # Login, Dashboard, Vehicles, Bookings, Packages, Drivers, Customers,
                           # Pricing, Payments, Calendar, Gallery, Reviews, Website, Reports, Settings
  hooks/                   # useAuth, useVehicles, useBookings, ...
  utils/                   # formatCurrency, generateReference, dateHelpers
```

---

## 15. Development Roadmap

```mermaid
flowchart LR
    P1["Phase 1: UI/UX design - branding, palette, wireframes"] --> P2["Phase 2: Frontend - public pages, forms, admin UI"]
    P2 --> P3["Phase 3: Database - Supabase tables, RLS, auth, storage"]
    P3 --> P4["Phase 4: Functionality - CRUD, bookings, payments, content mgmt"]
    P4 --> P5["Phase 5: Testing - overlap, permissions, uploads, security, mobile"]
    P5 --> P6["Phase 6: Deployment - GitHub, Vercel, domain, seed data, handover"]
```

---

## 16. Step-by-Step Prompts to Give Your AI Coder

Give these one at a time, in order. Do not skip ahead.

1. **Setup:** "Create a React + Vite project with Tailwind CSS, React Router, React Hook Form, Zod, Lucide React and Recharts. Set up the folder structure from section 14 of this document."
2. **Database:** "Write the Supabase SQL migration for all 13 tables in section 13: UUID primary keys, foreign keys, check constraints for statuses, indexes, and a `btree_gist` exclusion constraint preventing overlapping active bookings for the same vehicle (section 5)."
3. **Security:** "Write RLS policies per section 12. Public can read published data and insert bookings only. Admin role has full access. Add a trigger forcing new bookings to status Pending and writing a status-history row."
4. **Storage:** "Create Supabase Storage buckets for vehicle images, package images, gallery, driver photos and logo, with admin-only write and public read, and file type and size limits."
5. **Auth:** "Build /admin/login with Supabase Auth, a ProtectedRoute that checks `profiles.role = 'admin'`, and no public signup."
6. **Public site:** "Build all public pages from section 2 with the Home section order listed there. Fetch data live from Supabase. Make it mobile-first and SEO friendly (meta tags, semantic HTML, sitemap)."
7. **Booking form:** "Build the booking form per section 3 with Zod validation, preselected vehicle or package from URL params, a Supabase insert, Booking Reference ID generation, and a success page with a WhatsApp link."
8. **Admin core:** "Build the admin layout, sidebar (section 6) and dashboard with stat cards and Recharts charts."
9. **Vehicles and packages:** "Build admin CRUD per sections 7 and 8, including multi-image upload, publish/draft, archive (soft delete) and maintenance status."
10. **Bookings:** "Build the booking management table, filters, detail page, status changes per section 5, conflict warnings, driver assignment (section 10) and admin notes."
11. **Calendar:** "Build the vehicle availability calendar showing confirmed bookings per vehicle."
12. **Pricing and payments:** "Build pricing management and payment recording per section 9 with auto-calculated payment status and balance."
13. **Drivers and customers:** "Build driver management with licence expiry warnings and customer list with booking history."
14. **Content management:** "Build Website Management per section 11 so the owner can edit all content without code."
15. **Reports and invoice:** "Build reports (monthly revenue, bookings by status, top vehicles) and a PDF invoice generator."
16. **Testing and deploy:** "Review the security checklist in section 12, test overlapping bookings, admin permissions, uploads and mobile layout, then prepare for Vercel deployment with environment variables."

---

## 17. Pending Client Inputs (placeholders to use until received)

Business name and logo, phone and WhatsApp number, address and operating area, vehicle names/models/photos, pricing structure, driver and self-drive policies, tour package details, cancellation and refund policy, email and social links. Store all of these in `site_settings` so they can be changed from the admin panel later.
