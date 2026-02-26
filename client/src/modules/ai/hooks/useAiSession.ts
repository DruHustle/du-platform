import { useMemo } from 'react';

export function useAiSession() {
  return useMemo(() => {
    const stored = window.sessionStorage.getItem('du_ai_session_id');
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem('du_ai_session_id', created);
    return created;
  }, []);
}
