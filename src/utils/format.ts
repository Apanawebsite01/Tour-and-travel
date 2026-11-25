export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const dt = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function buildWhatsAppLink(whatsappNumber: string | number | undefined | null, message: string): string {
  const raw =
    whatsappNumber !== undefined && whatsappNumber !== null && String(whatsappNumber).trim() !== ''
      ? String(whatsappNumber)
      : '919811420750';
  const digits = raw.replace(/\D/g, '') || '919811420750';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function calcTripDays(start: string, end: string): number {
  if (!start || !end) return 1;
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 1;
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1);
}
