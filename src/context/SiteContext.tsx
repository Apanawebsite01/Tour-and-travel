import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { FaqItem, GalleryItem, ReviewItem, SiteSettings, TourPackage, Vehicle } from '../types';
import {
  DEFAULT_FAQS,
  DEFAULT_GALLERY,
  DEFAULT_PACKAGES,
  DEFAULT_REVIEWS,
  DEFAULT_SETTINGS,
  DEFAULT_VEHICLES,
} from '../data/bundledAssets';

interface SiteContextValue {
  settings: SiteSettings | null;
  vehicles: Vehicle[];
  packages: TourPackage[];
  reviews: ReviewItem[];
  gallery: GalleryItem[];
  faqs: FaqItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(DEFAULT_SETTINGS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEFAULT_VEHICLES);
  const [packages, setPackages] = useState<TourPackage[]>(DEFAULT_PACKAGES);
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS);
  const [gallery, setGallery] = useState<GalleryItem[]>(DEFAULT_GALLERY);
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/public/bootstrap');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        return;
      }
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (Array.isArray(data.vehicles) && data.vehicles.length > 0) setVehicles(data.vehicles);
      if (Array.isArray(data.packages) && data.packages.length > 0) setPackages(data.packages);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);
      if (Array.isArray(data.gallery)) setGallery(data.gallery);
      if (Array.isArray(data.faqs)) setFaqs(data.faqs);
    } catch {
      // Keep bundled catalog data if backend endpoint is unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SiteContext.Provider value={{ settings, vehicles, packages, reviews, gallery, faqs, loading, error, refresh }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
