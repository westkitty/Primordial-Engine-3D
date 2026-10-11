/**
 * Desktop taps wait only long enough to disambiguate a double-click focus
 * gesture. Touch casts remain immediate; two-finger input is handled earlier.
 */
export interface PendingTap<T> {
  x: number;
  y: number;
  remaining: number;
  payload: T;
}

export function queueDesktopTap<T>(items: PendingTap<T>[], tap: {x: number; y: number; payload: T}): PendingTap<T>[] {
  return [...items.slice(-7), {...tap, remaining: 0.32}];
}
export function discardFocusTap<T>(items: PendingTap<T>[], x: number, y: number): PendingTap<T>[] {
  // Remove only the tap that could have been the first click of this focus gesture.
  return items.filter(item => Math.hypot(item.x - x, item.y - y) >= 24);
}
export function advanceDesktopTaps<T>(items: PendingTap<T>[], elapsed: number):
  {pending: PendingTap<T>[]; ready: T[]} {
  if (elapsed <= 0 || !Number.isFinite(elapsed)) return {pending: items, ready: []};
  const pending: PendingTap<T>[] = [];
  const ready: T[] = [];
  for (const item of items) {
    const remaining = item.remaining - elapsed;
    if (remaining <= 0) ready.push(item.payload);
    else pending.push({...item, remaining});
  }
  return {pending, ready};
}
