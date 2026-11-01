import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
const source=JSON.parse(readFileSync('design-tokens.json','utf8'));
const errors=[];
function* files(dir){for(const d of readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+d.name;if(d.isDirectory())yield*files(p);else if(/\.(css|tsx?|mjs)$/.test(p))yield p;}}
const paths=[...files('src')];
const definitions=new Set([...Object.keys(source.tokens), ...Object.keys(source.runtimeProperties ?? {})]);
for(const c of source.contexts)for(const key of Object.keys(c.declarations))if(key.startsWith('--'))definitions.add(key.slice(2));
for(const path of paths){const text=readFileSync(path,'utf8');for(const m of text.matchAll(/--([\w-]+)\s*:/g))definitions.add(m[1]);for(const m of text.matchAll(/setProperty\(['"]--([\w-]+)['"]/g))definitions.add(m[1]);}
for (const match of JSON.stringify(source).matchAll(/var\(--([\w-]+)/g)) {
  if (!definitions.has(match[1])) errors.push(`design-tokens.json: undefined CSS variable --${match[1]}`);
}
for(const path of paths){
 if(path.includes('/content/')||path.endsWith('/generated.ts')||path.endsWith('/generated.css'))continue;
 const text=readFileSync(path,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 for(const m of text.matchAll(/var\(--([\w-]+)/g))if(!definitions.has(m[1]))errors.push(`${path}: undefined CSS variable --${m[1]}`);
 if(path.endsWith('.css')){
  if(path.endsWith('.module.css') && /animation\s*:\s*var\(--[\w-]+\)\s*;/.test(text)) errors.push(`${path}: keep keyframe names local to CSS Modules; tokenize duration/easing, not the whole animation shorthand`);
  const css=text.replace(/url\((?:"[^"]*"|'[^']*'|[^)])*\)/g,'');
  for(const [i,line]of css.split('\n').entries()){
   if(/@media/.test(line)){
    if(/\((min|max)-width:\s*\d/.test(line))errors.push(`${path}:${i+1}: use a named viewport token`);
    continue;
   }
   if(/\d+(?:\.\d+)?(?:px|rem|em|ch|vw|vh|ms)\b|#[\da-f]{3,8}\b/i.test(line.replace(/var\(--[\w-]+/g, '')))errors.push(`${path}:${i+1}: hardcoded visual value: ${line.trim()}`);
  }
 }
 if(path.endsWith('.tsx')){
  const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function inspectStyle(node){
   if(ts.isPropertyAssignment(node)){
    const key=node.name.getText(ast);const v=node.initializer;
    const dimensions=/^(?:margin|padding|gap|rowGap|columnGap|fontSize|borderRadius|minWidth|maxWidth|width|height|top|left|right|bottom)$/;
    if(dimensions.test(key)&&ts.isNumericLiteral(v)&&v.text!=='0')errors.push(`${path}: inline ${key}=${v.text}; use token()`);
   }
   ts.forEachChild(node,inspectStyle);
  }
  function visit(node){
   if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='style'&&node.initializer)inspectStyle(node.initializer);
   if(ts.isVariableDeclaration(node)&&node.initializer&&(node.type?.getText(ast)==='CSSProperties'||/Style$/.test(node.name.getText(ast))))inspectStyle(node.initializer);
   ts.forEachChild(node,visit);
  }
  visit(ast);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Token usage verified across ${paths.length} source files. No undefined variables or hardcoded CSS dimensions/colors.`);
