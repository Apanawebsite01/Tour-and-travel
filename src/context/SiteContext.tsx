import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { FaqItem, GalleryItem, ReviewItem, SiteSettings, TourPackage, Vehicle } from '../types';

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
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) throw new Error('Unable to load TravelGo data');
      const data = await res.json();
      setSettings(data.settings);
      setVehicles(data.vehicles || []);
      setPackages(data.packages || []);
      setReviews(data.reviews || []);
      setGallery(data.gallery || []);
      setFaqs(data.faqs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
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
