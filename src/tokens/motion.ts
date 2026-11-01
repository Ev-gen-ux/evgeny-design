// GENERATED compatibility exports; values come from design-tokens.json.
import { runtimeTokens } from './generated';
export const duration = {
  "150": "0.15s",
  "180": "0.18s",
  "200": "0.2s",
  "250": "0.25s",
  "300": "0.3s",
  "350": "0.35s",
  "400": "0.4s",
  "500": "0.5s",
  "700": "0.7s",
  "1100": "1.1s",
  "ambient7s": "7s",
  "ambient20s": "20s",
  "ambient26s": "26s",
  "ambient50s": "50s",
} as const;
export const easing = {
  "linear": "linear",
  "standard": "ease",
  "inOut": "ease-in-out",
  "out": "ease-out",
  "signature": "cubic-bezier(0.16, 1, 0.3, 1)",
  "magnet": "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;
export const durationMs = Object.fromEntries(Object.entries(duration).map(([key, seconds]) => [key, parseFloat(seconds) * 1000])) as Record<keyof typeof duration, number>;
export const assemblyLoadDurationMs = runtimeTokens.motion.assemblyLoadDurationMs;
export const signatureEasingPoints = runtimeTokens.motion.signatureEasingPoints;
