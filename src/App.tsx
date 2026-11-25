import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SiteProvider } from './context/SiteContext';
import { AuthProvider } from './context/AuthContext';
import { ClientAuthProvider } from './context/ClientAuthContext';
import { HomePage } from './pages/public/HomePage';
import { VehiclesPage } from './pages/public/VehiclesPage';
import { VehicleDetailsPage } from './pages/public/VehicleDetailsPage';
import { PackagesPage } from './pages/public/PackagesPage';
import { PackageDetailsPage } from './pages/public/PackageDetailsPage';
import { BookingPage } from './pages/public/BookingPage';
import { BookingSuccessPage } from './pages/public/BookingSuccessPage';
import { ClientAuthPage } from './pages/public/ClientAuthPage';
import {
  AboutPage,
  ContactPage,
  FaqsPage,
  GalleryPage,
  PolicyPage,
  ReviewsPage,
} from './pages/public/InfoPages';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminBookingDetailPage } from './pages/admin/AdminBookingDetailPage';
import { AdminVehiclesPage } from './pages/admin/AdminVehiclesPage';
import { AdminPackagesPage } from './pages/admin/AdminPackagesPage';
import {
  AdminCalendarPage,
  AdminCustomersPage,
  AdminDriversPage,
  AdminPaymentsPage,
  AdminPricingPage,
} from './pages/admin/AdminOperationsPages';
import {
  AdminGalleryPage,
  AdminReportsPage,
  AdminReviewsPage,
  AdminWebsitePage,
} from './pages/admin/AdminContentPages';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientAuthProvider>
          <SiteProvider>
            <Routes>
              {/* Public Website Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/vehicles/:id" element={<VehicleDetailsPage />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/packages/:id" element={<PackageDetailsPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/booking/success/:refId" element={<BookingSuccessPage />} />
              <Route path="/account" element={<ClientAuthPage />} />
              <Route path="/login" element={<ClientAuthPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/faqs" element={<FaqsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
              <Route path="/terms" element={<PolicyPage type="terms" />} />
              <Route path="/cancellation-policy" element={<PolicyPage type="cancellation" />} />

            {/* Admin Portal Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/bookings/:id" element={<AdminBookingDetailPage />} />
            <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
            <Route path="/admin/packages" element={<AdminPackagesPage />} />
            <Route path="/admin/drivers" element={<AdminDriversPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/pricing" element={<AdminPricingPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/calendar" element={<AdminCalendarPage />} />
            <Route path="/admin/gallery" element={<AdminGalleryPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/website" element={<AdminWebsitePage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SiteProvider>
        </ClientAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
