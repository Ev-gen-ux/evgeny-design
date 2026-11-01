import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { compileTokens } from './token-system.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(resolve(root, 'design-tokens.json'), 'utf8'));
const { outputs, tokenCount, contextCount } = compileTokens(source);
let stale = false;
for (const [path, content] of Object.entries(outputs)) {
  const target = resolve(root, path);
  let old = '';
  try { old = readFileSync(target, 'utf8'); } catch { /* first generation */ }
  if (old === content) continue;
  if (process.argv.includes('--check')) { console.error(`Stale generated tokens: ${path}`); stale = true; }
  else writeFileSync(target, content);
}
if (stale) process.exitCode = 1;
else console.log(`Tokens ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${tokenCount} definitions, ${contextCount} contexts.`);
