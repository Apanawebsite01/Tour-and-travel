import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AlertCircle, Calendar, Car, Compass, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { useSite } from '../../context/SiteContext';
import { useClientAuth } from '../../context/ClientAuthContext';
import { calcTripDays, formatINR } from '../../utils/format';

const bookingSchema = z
  .object({
    booking_type: z.enum(['vehicle', 'package']),
    vehicle_id: z.string().optional(),
    package_id: z.string().optional(),
    customer_name: z.string().trim().min(2, 'Please enter your full name'),
    mobile: z
      .string()
      .trim()
      .regex(/^[+\d\s()-]{8,18}$/, 'Please enter a valid 10-digit mobile number'),
    email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
    pickup_location: z.string().trim().min(2, 'Pickup location is required'),
    destination: z.string().trim().min(2, 'Destination is required'),
    travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a travel date'),
    pickup_time: z.string().regex(/^\d{2}:\d{2}$/),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a return date'),
    passengers: z.coerce.number().int().min(1, 'At least 1 passenger').max(30),
    driver_preference: z.enum(['With Driver', 'Self-Drive']),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => d.return_date >= d.travel_date, {
    message: 'Return date must be on or after travel date',
    path: ['return_date'],
  })
  .refine((d) => (d.booking_type === 'vehicle' ? Boolean(d.vehicle_id) : Boolean(d.package_id)), {
    message: 'Please choose a vehicle or tour package',
    path: ['vehicle_id'],
  });

export function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { vehicles, packages } = useSite();
  const { clientUser, savedPhone } = useClientAuth();

  const defaultTravel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  }, []);

  const defaultReturn = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 8);
    return d.toISOString().slice(0, 10);
  }, []);

  const initialType = params.get('type') === 'package' ? 'package' : 'vehicle';
  const paramId = params.get('id') || '';

  const [bookingType, setBookingType] = useState<'vehicle' | 'package'>(initialType);
  const [vehicleId, setVehicleId] = useState(initialType === 'vehicle' ? paramId : '');
  const [packageId, setPackageId] = useState(initialType === 'package' ? paramId : '');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [pickupLocation, setPickupLocation] = useState(params.get('pickup') || '');
  const [destination, setDestination] = useState(params.get('destination') || '');
  const [travelDate, setTravelDate] = useState(params.get('travel_date') || defaultTravel);
  const [pickupTime, setPickupTime] = useState('09:00');
  const [returnDate, setReturnDate] = useState(params.get('return_date') || defaultReturn);
  const [passengers, setPassengers] = useState(2);
  const [driverPref, setDriverPref] = useState<'With Driver' | 'Self-Drive'>(
    params.get('driver_preference') === 'Self-Drive' ? 'Self-Drive' : 'With Driver'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (bookingType === 'vehicle' && !vehicleId && vehicles.length > 0) {
      setVehicleId(vehicles[0].id);
    }
    if (bookingType === 'package' && !packageId && packages.length > 0) {
      setPackageId(packages[0].id);
    }
  }, [bookingType, vehicleId, packageId, vehicles, packages]);

  useEffect(() => {
    if (clientUser) {
      if (clientUser.displayName) setCustomerName((prev) => prev || clientUser.displayName || '');
      if (clientUser.email) setEmail((prev) => prev || clientUser.email || '');
    }
    if (savedPhone) {
      setMobile((prev) => prev || savedPhone);
    }
  }, [clientUser, savedPhone]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedPackage = packages.find((p) => p.id === packageId);

  useEffect(() => {
    if (bookingType === 'package' && selectedPackage) {
      if (!pickupLocation) setPickupLocation(selectedPackage.pickup_location);
      if (!destination) setDestination(selectedPackage.destination);
    }
  }, [bookingType, selectedPackage, pickupLocation, destination]);

  const tripDays = calcTripDays(travelDate, returnDate);
  const indicativeTotal = useMemo(() => {
    if (bookingType === 'vehicle' && selectedVehicle) {
      const allowance = driverPref === 'With Driver' ? selectedVehicle.driver_allowance * tripDays : 0;
      return selectedVehicle.daily_rate * tripDays + allowance;
    }
    if (bookingType === 'package' && selectedPackage) {
      return selectedPackage.price * Math.max(1, Math.ceil(passengers / 2));
    }
    return 0;
  }, [bookingType, selectedVehicle, selectedPackage, tripDays, driverPref, passengers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    const payload = {
      booking_type: bookingType,
      vehicle_id: bookingType === 'vehicle' ? vehicleId : undefined,
      package_id: bookingType === 'package' ? packageId : undefined,
      customer_name: customerName,
      mobile,
      email,
      pickup_location: pickupLocation,
      destination,
      travel_date: travelDate,
      pickup_time: pickupTime,
      return_date: returnDate,
      passengers,
      driver_preference: driverPref,
      notes,
    };

    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setErrorMsg(parsed.error.issues[0]?.message || 'Please review the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientUser) {
        try {
          const idToken = await clientUser.getIdToken();
          if (idToken) headers.Authorization = `Bearer ${idToken}`;
        } catch {
          // Proceed as guest if token refresh fails
        }
      }
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Could not submit booking request. Please try again.');
        setSubmitting(false);
        return;
      }
      navigate(`/booking/success/${json.reference_id}`);
    } catch {
      setErrorMsg('Network error while submitting booking. Your form data has been kept intact.');
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50/40 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 transition-all';

  return (
    <PublicLayout>
      <section className="bg-white border-b border-slate-200/80 py-10 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-2">
              Zero Prepayment Request
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight mb-2 text-balance">
              Request Your Vehicle or Tour Package
            </h1>
            <p className="text-[#475569] text-sm sm:text-base leading-relaxed">
              Submit your trip schedule below. Our team verifies availability, prepares an exact INR quote, and sends confirmation to your mobile.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-7 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.06)]"
          >
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Booking Type */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-2">What would you like to book?</label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setBookingType('vehicle')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                    bookingType === 'vehicle'
                      ? 'bg-white text-[#0F766E] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Vehicle Rental</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('package')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                    bookingType === 'package'
                      ? 'bg-white text-[#0F766E] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Tour Package</span>
                </button>
              </div>
            </div>

            {/* Step 2: Selection */}
            {bookingType === 'vehicle' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Select Vehicle</label>
                  <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputCls}>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({formatINR(v.daily_rate)}/day · {v.seats} Seats)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Driver Preference</label>
                  <select
                    value={driverPref}
                    onChange={(e) => setDriverPref(e.target.value as 'With Driver' | 'Self-Drive')}
                    className={inputCls}
                  >
                    {(!selectedVehicle || selectedVehicle.driver_available) && (
                      <option value="With Driver">With Verified Chauffeur</option>
                    )}
                    {(!selectedVehicle || selectedVehicle.self_drive_available) && (
                      <option value="Self-Drive">Self-Drive</option>
                    )}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Select Tour Package</label>
                <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={inputCls}>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.days}D/{p.nights}N · {formatINR(p.price)}/person)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3: Route & Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Pickup Location *</label>
                <input
                  type="text"
                  required
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Airport, Railway Station, or Address"
                  className={inputCls}
                />
                {fieldErrors.pickup_location && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.pickup_location}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Destination / Circuit *</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Jaipur · Udaipur"
                  className={inputCls}
                />
                {fieldErrors.destination && <p className="text-xs text-red-600 mt-1">{fieldErrors.destination}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Travel Date *</label>
                <input
                  type="date"
                  required
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Return Date *</label>
                <input
                  type="date"
                  required
                  min={travelDate}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
                {fieldErrors.return_date && <p className="text-xs text-red-600 mt-1">{fieldErrors.return_date}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Pickup Time</label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Passengers</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className={`${inputCls} tabular-nums`}
                />
              </div>
            </div>

            {/* Step 4: Traveller Contact */}
            <div className="pt-5 border-t border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#0F172A]">Traveller Contact Details</span>
                {clientUser ? (
                  <Link to="/account" className="text-[#0F766E] font-medium hover:underline">
                    Signed in as {clientUser.displayName || clientUser.email}
                  </Link>
                ) : (
                  <Link to="/account?redirect=/booking" className="text-[#0F766E] font-medium hover:underline">
                    Sign in with Google or Email to auto-fill
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Aarav Sharma"
                    className={inputCls}
                  />
                  {fieldErrors.customer_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.customer_name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98114 20750"
                    className={`${inputCls} tabular-nums`}
                  />
                  {fieldErrors.mobile && <p className="text-xs text-red-600 mt-1">{fieldErrors.mobile}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Special Requests or Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Child seat, luggage carrier, airport placard name, or hotel stops..."
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-base py-4 shadow-[0_6px_18px_-4px_rgba(249,115,22,0.45)] transition-all"
            >
              {submitting ? 'Submitting Booking Request...' : 'Submit Booking Request'}
            </button>
          </form>

          {/* Summary Sidebar */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 space-y-5 lg:sticky lg:top-24 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.06)]">
            <h2 className="font-display text-lg font-bold text-[#0F172A] tracking-tight">Trip Estimate Summary</h2>
            <div className="space-y-3 text-sm border-b border-slate-100 pb-4">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Booking Type</span>
                <span className="font-semibold text-[#0F172A]">
                  {bookingType === 'vehicle' ? 'Vehicle Rental' : 'Tour Package'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748B]">Selection</span>
                <span className="font-semibold text-right text-[#0F172A]">
                  {bookingType === 'vehicle' ? selectedVehicle?.name || '—' : selectedPackage?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Duration</span>
                <span className="font-semibold tabular-nums flex items-center gap-1.5 text-[#0F172A]">
                  <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
                  {tripDays} {tripDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Guests</span>
                <span className="font-semibold tabular-nums text-[#0F172A]">{passengers}</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[#0F172A]">Indicative Estimate</span>
              <span className="text-2xl font-bold text-[#F97316] tabular-nums">{formatINR(indicativeTotal)}</span>
            </div>

            <div className="rounded-xl bg-[#F7F8FA] border border-slate-200/80 p-4 text-xs text-[#475569] space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 font-semibold text-[#0F766E]">
                <ShieldCheck className="w-4 h-4" />
                <span>What happens next?</span>
              </div>
              <p>
                You receive an instant Booking Reference ID. Our specialist checks live fleet scheduling and shares your final quotation before any payment is requested.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
