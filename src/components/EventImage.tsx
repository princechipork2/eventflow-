import { useState } from "react";

interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export default function EventImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
}: EventImageProps) {
  const [hasError, setHasError] = useState(false);

  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full bg-gradient-to-br from-primary/30 via-background to-purple-500/20 ${fallbackClassName}`}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xl font-bold text-primary/50">
            EF
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
