import {
  useLayoutEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";
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

  useLayoutEffect(() => {
    const image = imageRef.current;
    setIsLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [src]);

  return (
    <div
      className={cn("relative overflow-hidden bg-slate-900", wrapperClassName)}
    >
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={cn("absolute inset-0 bg-slate-900", placeholderClassName)}
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
          !priority &&
            "transition-opacity duration-200 motion-reduce:transition-none",
          priority || isLoaded ? "opacity-100" : "opacity-0",
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
