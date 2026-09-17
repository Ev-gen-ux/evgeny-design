import { useEffect, useState } from 'react';

/**
 * 1:1 with the hero's `tokensRevealed`/`tokenCounterText`/`tokenCounterStyle` in
 * Portfolio.dc.html — a small mono counter above the headline reading
 * "generating · N/M tokens" that ticks up on a randomized timer, then fades out.
 * Note: despite the name, `heroTokens` in the source never actually animates the
 * headline words themselves (their computed style is just `display:inline-block`,
 * no opacity/transform) — only this counter label is visible motion. `showCaret`
 * is hardcoded `false` in the source (dead code), so no caret is ported either.
 */
export function useTokenCounter(headline: string, reducedMotion: boolean) {
  const wordCount = headline.split(' ').length;
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let timeout: ReturnType<typeof setTimeout>;
    const step = (i: number) => {
      timeout = setTimeout(
        () => {
          setRevealed(i);
          if (i < wordCount) step(i + 1);
        },
        55 + Math.random() * 95 + (i % 4 === 0 ? 260 : 0),
      );
    };
    step(1);
    return () => clearTimeout(timeout);
  }, [wordCount, reducedMotion]);

  const effectiveRevealed = reducedMotion ? wordCount : revealed;
  const done = reducedMotion || effectiveRevealed >= wordCount;
  return {
    text: `generating · ${effectiveRevealed}/${wordCount} tokens`,
    opacity: reducedMotion ? 0 : done ? 0 : 0.75,
  };
}
