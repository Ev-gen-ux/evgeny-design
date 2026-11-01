export function compileTokens(source) {
const { tokens, contexts, breakpoints, runtime } = source;
const resolved = new Map();
function resolveToken(name, chain = []) {
  if (resolved.has(name)) return resolved.get(name);
  if (!(name in tokens)) throw new Error(`Unknown token: ${name}`);
  if (chain.includes(name)) throw new Error(`Token cycle: ${[...chain, name].join(' → ')}`);
  const value = tokens[name];
  let result;
  if (typeof value === 'object' && value.rgbOf) {
    const hex = resolveToken(value.rgbOf, [...chain, name]);
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`RGB source must resolve to hex: ${name}`);
    result = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ');
  } else {
    result = String(value).replace(/var\(--([\w-]+)\)/g, (_, dependency) => resolveToken(dependency, [...chain, name]));
  }
  resolved.set(name, result);
  return result;
}
for (const name of Object.keys(tokens)) {
  if (!/^[a-zA-Z_][\w-]*$/.test(name)) throw new Error(`Invalid CSS token name: ${name}`);
  resolveToken(name);
}
const mediaAliases = {
  'viewport-phone': `(max-width: ${breakpoints.phone}px)`,
  'viewport-tablet': `(max-width: ${breakpoints.tablet}px)`,
  'viewport-desktop': `(min-width: ${breakpoints.desktop}px)`,
  'viewport-above-phone': `(min-width: ${breakpoints.abovePhone}px)`,
  'viewport-nav-compact': `(max-width: ${breakpoints.navCompact}px)`,
};
function cssValue(name) {
  return typeof tokens[name] === 'object' ? resolveToken(name) : tokens[name];
}
let css = '/* GENERATED from design-tokens.json. Run npm run tokens:generate. */\n:root {\n';
css += Object.keys(tokens).map(name => `  --${name}: ${cssValue(name)};`).join('\n') + '\n}\n';
for (const context of contexts) {
  const declarations = Object.entries(context.declarations).map(([name, value]) => `  ${name}: ${value};`).join('\n');
  let rule = `${context.selector} {\n${declarations}\n}`;
  for (const media of [...context.media].reverse()) {
    const query = media.replace(/\(--(viewport-[\w-]+)\)/g, (_match, name) => {
      if (!mediaAliases[name]) throw new Error(`Unknown media token: ${name}`);
      return mediaAliases[name];
    });
    rule = `@media ${query} {\n${rule}\n}`;
  }
  css += `\n${rule}\n`;
}
const values = Object.fromEntries(resolved);
function resolveRuntime(value) {
  if (Array.isArray(value)) return value.map(resolveRuntime);
  if (value && typeof value === 'object') {
    if (value.token) {
      const resolved = resolveToken(value.token);
      if (value.as && !['css', 'number', 'milliseconds'].includes(value.as)) throw new Error(`Unknown runtime token format: ${value.as}`);
      if (value.as === 'css') return `var(--${value.token})`;
      if (value.as === 'number' || value.as === 'milliseconds') {
        const number = Number.parseFloat(resolved);
        if (!Number.isFinite(number)) throw new Error(`Non-numeric runtime token: ${value.token}`);
        return value.as === 'milliseconds' && !resolved.endsWith('ms') ? number * 1000 : number;
      }
      return resolved;
    }
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, resolveRuntime(nested)]));
  }
  return value;
}
const ts = `// GENERATED from design-tokens.json. Do not edit.\nexport const tokenValues = ${JSON.stringify(values, null, 2)} as const;\n\nexport type TokenName = keyof typeof tokenValues;\nexport const breakpoints = ${JSON.stringify(breakpoints, null, 2)} as const;\nexport const mediaQueries = ${JSON.stringify(mediaAliases, null, 2)} as const;\nexport const runtimeTokens = ${JSON.stringify(resolveRuntime(runtime), null, 2)} as const;\n`;
const header = '// GENERATED compatibility exports; values come from design-tokens.json.\n';
const spaceKeys = Object.keys(tokens).filter(k => /^space-\d+$/.test(k));
const spacing = header + 'export const space = {\n' + spaceKeys.map(k => `  ${k.slice(6)}: 'var(--${k})',`).join('\n') + '\n} as const;\n' + `export const fluidSpace = {containerX: 'var(--space-page-gutter)', navX: 'var(--space-nav-x)'} as const;\n`;
const alias = (name, mapping) => `export const ${name} = {\n${Object.entries(mapping).map(([key, token]) => `  ${JSON.stringify(key)}: ${JSON.stringify(['fontWeight', 'lineHeight'].includes(name) ? Number(values[token]) : values[token])},`).join('\n')}\n} as const;\n`;
const camel = text => text.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
const familyMap = { display: 'font-display', mono: 'font-mono' };
const group = prefix => Object.fromEntries(Object.keys(tokens).filter(k => k.startsWith(prefix)).map(k => [camel(k.slice(prefix.length)), k]));
const typography = header + alias('fontFamily', familyMap) + alias('fontSize', group('fs-')) + alias('fontWeight', group('fw-')) + alias('tracking', group('tracking-')) + alias('lineHeight', group('lh-'));
const colorMap = {blueprint: 'color-blueprint', redline: 'color-redline', accent: 'color-accent', glow: 'color-glow', glowLight: 'color-glow-light', vellum: 'color-vellum', slateMist: 'color-slate-mist', graphite: 'color-graphite', vellumMuted: 'color-vellum-muted', slateMistDim: 'color-slate-mist-dim'};
const colors = header + alias('colors', colorMap) + `export type ColorToken = keyof typeof colors;\nexport const colorsNumeric = Object.fromEntries(Object.entries(colors).map(([key, hex]) => [key, parseInt(hex.slice(1), 16)])) as Record<ColorToken, number>;\n`;
const durationMap = Object.fromEntries(Object.keys(tokens).filter(k => k.startsWith('duration-')).map(k => [k.slice(9).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()), k]));
const motion = header + `import { runtimeTokens } from './generated';\n` + alias('duration', durationMap) + alias('easing', group('ease-')) + `export const durationMs = Object.fromEntries(Object.entries(duration).map(([key, seconds]) => [key, parseFloat(seconds) * 1000])) as Record<keyof typeof duration, number>;\nexport const assemblyLoadDurationMs = runtimeTokens.motion.assemblyLoadDurationMs;\nexport const signatureEasingPoints = runtimeTokens.motion.signatureEasingPoints;\n`;
const outputs = { 'src/tokens/generated.css': css, 'src/tokens/generated.ts': ts, 'src/tokens/spacing.ts': spacing, 'src/tokens/colors.ts': colors, 'src/tokens/typography.ts': typography, 'src/tokens/motion.ts': motion };

return {outputs, resolvedValues: values, runtime: resolveRuntime(runtime), mediaQueries: mediaAliases, tokenCount: Object.keys(tokens).length, contextCount: contexts.length};
}
