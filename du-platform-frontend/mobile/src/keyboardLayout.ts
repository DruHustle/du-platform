/** Both the measured view and native keyboard coordinates use window units. */
export function keyboardBottomInset(view: { y: number; height: number }, keyboardTop?: number): number {
  if (keyboardTop === undefined || !Number.isFinite(keyboardTop)
      || !Number.isFinite(view.y) || !Number.isFinite(view.height) || view.height <= 0) return 0;
  // Older Android windows may already resize above the IME. Add only their
  // remaining overlap, rather than adding the full keyboard height twice.
  return Math.min(view.height, Math.max(0, view.y + view.height - keyboardTop));
}
