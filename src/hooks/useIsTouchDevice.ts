/** 1:1 with componentDidMount's `const touch = matchMedia('(pointer: coarse)').matches` — computed once, not reactive (matches source: no change listener for pointer type). */
export function useIsTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}
