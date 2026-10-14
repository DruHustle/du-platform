import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FetchPriority = "high" | "low" | "auto";

export interface InstantImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "fetchPriority"> {
  wrapperClassName?: string;
  placeholderClassName?: string;
  priority?: boolean;
  fetchPriority?: FetchPriority;
}

export function preloadImages(
  sources: Array<string | null | undefined>,
  highPriorityCount = 0
) {
  if (typeof window === "undefined") return;

  sources
    .filter((source): source is string => Boolean(source))
    .forEach((source, index) => {
      const image = new window.Image();
      try {
        image.decoding = "async";
      } catch {}
      try {
        (
          image as HTMLImageElement & { fetchPriority?: FetchPriority }
        ).fetchPriority = index < highPriorityCount ? "high" : "auto";
      } catch {}
      image.src = source;
    });
}

export default function InstantImage({
  wrapperClassName,
  placeholderClassName,
  priority = false,
  fetchPriority,
  loading,
  decoding = "async",
  className,
  src,
  onLoad,
  onError,
  ...rest
}: InstantImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) setIsLoaded(true);
  }, [src]);

  return (
    <div
      className={cn("relative overflow-hidden bg-slate-900", wrapperClassName)}
    >
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(15,23,42,0.96)_65%)]",
            placeholderClassName
          )}
        />
      )}
      <img
        {...rest}
        ref={imageRef}
        src={src}
        loading={loading ?? (priority ? "eager" : "lazy")}
        decoding={decoding}
        fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={event => {
          setIsLoaded(true);
          onLoad?.(event);
        }}
        onError={event => {
          setIsLoaded(true);
          onError?.(event);
        }}
      />
    </div>
  );
}
