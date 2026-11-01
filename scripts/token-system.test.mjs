import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileTokens} from './token-system.mjs';
const original=JSON.parse(readFileSync(new URL('../design-tokens.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(original);

test('changing the bust/glow color updates hex, RGB and JS compatibility exports together',()=>{
 const source=copy();source.tokens['color-glow']='#123456';const result=compileTokens(source);
 assert.equal(result.resolvedValues['color-bust'],'#123456');
 assert.equal(result.resolvedValues['color-glow-rgb'],'18, 52, 86');
 assert.match(result.outputs['src/tokens/colors.ts'],/"glow": "#123456"/);
});
test('one card dimension controls CSS and the 3D layout numeric input',()=>{
 const source=copy();source.tokens['case-card-width']='512px';const result=compileTokens(source);
 assert.equal(result.runtime.workCylinder.width,512);
 assert.match(result.outputs['src/tokens/generated.css'],/--case-card-width: 512px/);
});
test('semantic spacing propagates through component aliases',()=>{
 const source=copy();source.tokens['space-stack-lg']='31px';
 const consumer=Object.entries(source.tokens).find(([name,value])=>!name.startsWith('space-')&&value==='var(--space-stack-lg)')?.[0];
 assert.ok(consumer,'a real component must use the semantic spacing role');
 assert.equal(compileTokens(source).resolvedValues[consumer],'31px');
});
test('named breakpoints stay identical in CSS queries and TypeScript',()=>{
 const source=copy();source.breakpoints.phone=700;const result=compileTokens(source);
 assert.equal(result.mediaQueries['viewport-phone'],'(max-width: 700px)');
 assert.match(result.outputs['src/tokens/generated.ts'],/"phone": 700/);
 assert.match(result.outputs['src/tokens/generated.css'],/@media \(max-width: 700px\)/);
 assert.doesNotMatch(result.outputs['src/tokens/generated.css'],/@media \(--viewport/);
});
test('cyclic aliases fail generation instead of shipping invalid CSS',()=>{
 const source=copy();source.tokens['test-a']='var(--test-b)';source.tokens['test-b']='var(--test-a)';
 assert.throws(()=>compileTokens(source),/Token cycle/);
});
test('missing references and invalid CSS names fail generation',()=>{
 const source=copy();source.tokens['test-missing']='var(--does-not-exist)';assert.throws(()=>compileTokens(source),/Unknown token/);
 const invalid=copy();invalid.tokens['invalid#name']='4px';assert.throws(()=>compileTokens(invalid),/Invalid CSS token name/);
});
test('shared hover duration controls the magnetic effect in milliseconds',()=>{
 const source=copy();source.tokens['motion-hover']='0.4s';const result=compileTokens(source);
 assert.equal(result.runtime.magnet.durationMs,400);
});

test('CSS Modules keyframes keep matching their animation declarations after compilation', async()=>{
 const {preprocessCSS,resolveConfig}=await import('vite');
 const {readdirSync}=await import('node:fs');
 const {resolve}=await import('node:path');
 const config=await resolveConfig({configFile:false,logLevel:'silent'},'build');
 function* modules(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())yield*modules(path);else if(path.endsWith('.module.css'))yield path;}}
 const globalNames=[...readFileSync('src/index.css','utf8').matchAll(/@keyframes\s+([\w-]+)/g)].map(match=>match[1]);
 const tokenValues=compileTokens(original).resolvedValues;
 let checked=0;
 for(const path of modules('src')){
  const input=readFileSync(path,'utf8');
  if(!/@keyframes\s|animation(?:-name)?\s*:/.test(input))continue;
  const result=await preprocessCSS(input,resolve(path),config);
  const names=[...result.code.matchAll(/@keyframes\s+([\w-]+)/g)].map(match=>match[1]);
  const declarations=[...result.code.matchAll(/(?:^|[;{\n])\s*animation(?:-name)?\s*:\s*([^;]+)/g)].map(match=>match[1]).join(' ');
  for(const name of names)assert.ok(declarations.includes(name),`${path}: compiled keyframes ${name} are not referenced by animation; keep the name local and tokenize only duration/easing`);
  const declaredNames=new Set([...globalNames,...names]);
  for(const match of result.code.matchAll(/(?:^|[;{\n])\s*animation(?:-name)?\s*:\s*([^;]+)/g)){
   const value=match[1].replace(/var\(--([\w-]+)\)/g,(_match,token)=>tokenValues[token]??`var(--${token})`).trim();
   const name=value.split(/\s+/)[0];
   if(name!=='none')assert.ok(declaredNames.has(name),`${path}: animation ${name} has no matching local/global keyframes`);
  }
  checked++;
 }
 assert.ok(checked>=5);
});
