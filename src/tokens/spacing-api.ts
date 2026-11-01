import { space } from './spacing';
import { token } from './api';
import type { TokenName } from './generated';

export const semanticSpace = {
  'section-block': token('space-section-block'),
  'section-mobile': token('space-section-mobile'),
  'section-desktop': token('space-section-desktop'),
  'case-section': token('space-case-section'),
  'stack-tight': token('space-stack-tight'),
  'stack-sm': token('space-stack-sm'),
  'stack-md': token('space-stack-md'),
  'stack-lg': token('space-stack-lg'),
  'stack-xl': token('space-stack-xl'),
  'inline-tight': token('space-inline-tight'),
  'inline-sm': token('space-inline-sm'),
  'inline-md': token('space-inline-md'),
  'inline-lg': token('space-inline-lg'),
  'inline-xl': token('space-inline-xl'),
} as const satisfies Record<string, `var(--${TokenName})`>;

export type SpacingRole = keyof typeof semanticSpace;
/** Numeric aliases remain available for deliberately bespoke compositions. */
export type SpacingValue = SpacingRole | keyof typeof space;
export function resolveSpacing(value: SpacingValue): string {
  return typeof value === 'number' ? space[value] : semanticSpace[value];
}
