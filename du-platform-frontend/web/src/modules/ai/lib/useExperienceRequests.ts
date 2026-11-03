import { useCallback, useEffect, useRef } from "react";

/** Cancels work when its destination/language/mode changes or the page closes. */
export function useExperienceRequests(context: string) {
  const controller = useRef(new AbortController());
  const cancel = useCallback(() => {
    controller.current.abort();
    controller.current = new AbortController();
  }, []);
  useEffect(() => {
    // Renew on setup too: React Strict Mode runs setup again after cleanup.
    cancel();
    return () => controller.current.abort();
  }, [context, cancel]);
  const getSignal = useCallback(() => controller.current.signal, []);
  return { getSignal, cancel };
}

/** Bound media requests, including response decoding, independently of AI generation. */
export function experienceMediaSignal(signal: AbortSignal) {
  return AbortSignal.any([signal, AbortSignal.timeout(20_000)]);
}
