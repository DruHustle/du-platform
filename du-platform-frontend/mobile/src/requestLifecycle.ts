/** Ignore obsolete completions even when a transport finishes after cancellation. */
export function latestRequest() {
  let generation = 0;
  let controller: AbortController | undefined;
  const invalidate = () => { generation++; controller?.abort(); controller = undefined; };
  return {
    invalidate,
    begin() {
      invalidate();
      const version = generation;
      const active = new AbortController();
      controller = active;
      return { signal: active.signal, isCurrent: () => generation === version && !active.signal.aborted };
    },
  };
}
