import { useState } from 'react';
import { Compass } from 'lucide-react';
import { isSafeUrl } from '../../utils/format';
import { resolveAssetUrl } from '../../data/bundledAssets';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveAssetUrl(src);

  if (!resolvedSrc || !isSafeUrl(resolvedSrc) || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#CCFBF1] via-[#F8FAFC] to-[#FFEDD5] text-[#0F766E] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-8 h-8 mb-2 opacity-75" />
        <span className="text-xs font-medium text-[#0F172A]/80 line-clamp-2 max-w-[180px]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
