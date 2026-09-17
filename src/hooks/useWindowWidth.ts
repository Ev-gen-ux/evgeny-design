import { useEffect, useState } from 'react';

/** 1:1 with the root component's `windowWidth` state, updated on resize. */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}
