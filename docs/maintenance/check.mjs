import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=JSON.parse(await fs.readFile(path.join(root,'docs/maintenance/catalog.json'),'utf8'));
const expected=['flybit','xiyou','cocoduck','lingdong','laomao','wgetcloud','mesl','xingchen-cloud','jike-cloud','feiniaoyun','miaomiao-cloud','feituyun','yangfanyun','dongligang','xsus','cyberguard','freecat','jisu-cloud'];
assert.deepEqual(data.airports.map(a=>a.id),expected,'Airport order differs from the requested edition');
assert.deepEqual(data.airports.map(a=>a.order),expected.map((_,i)=>i+1));
assert.equal(data.airports[0].referral_url,'https://goflybit.com/register?code=m4qRDLA1');
assert.equal(data.airports.find(a=>a.id==='xiyou').referral_url,'https://e.xiyou666.xyz/?code=s7S4hVxm');
assert.equal(data.airports.find(a=>a.id==='xingchen-cloud').referral_url,'https://xc1.luniu8.com/?code=det68imC');
assert.deepEqual((await fs.readdir(root)).filter(name=>name!=='.git').sort(),['README.md','docs','images'],'Keep only two folders and README at the root');
const kinds=new Set(['monthly','quarterly','annual','half-year','biennial','triennial','one-time','addon']);
const starRules={monthly:5,quarterly:4,annual:2};
let plans=0;
for(const a of data.airports){
 assert(a.name&&a.source_note,'Missing provider metadata');
 assert.equal(new URL(a.referral_url).protocol,'https:');
 assert.equal(a.image?.webp,`images/banners/${a.id}.webp`,'Provider image must match its own airport');
 assert(a.plans.length>0);const keys=new Set();
 for(const p of a.plans){
  plans++;for(const key of ['name','billing','traffic','devices','route'])assert.equal(typeof p[key],'string',`${a.id}: missing ${key}`);
  assert(Number.isFinite(p.price)&&p.price>0);assert(kinds.has(p.kind));
  const key=`${p.name}/${p.kind}`;assert(!keys.has(key),`${a.id}: duplicate plan ${key}`);keys.add(key);
  if(p.kind in starRules)assert.equal(p.stars,starRules[p.kind]);
  else if(p.kind==='one-time')assert([4,5].includes(p.stars));else assert.equal(p.stars,null);
 }
}
const files=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){
 if(dir===root&&e.name==='.git')continue;
 assert(!e.isSymbolicLink(),'Do not publish symlinks');assert(e.name!=='.git','Do not embed Git metadata');
 const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(path.relative(root,p).split(path.sep).join('/'));
}}
await walk(root);
const contents=new Map();for(const file of files)contents.set(file,/\.(?:png|webp|jpe?g|gif|avif)$/i.test(file)?null:await fs.readFile(path.join(root,file),'utf8'));
const excluded=new RegExp('\u514d\u8d39\u8bd5\u7528|\u4f18\u60e0\u7801|\u6298\u6263\u7801');
const excludedBrand=new RegExp('\u006e\u006f\u0064\u0065\u0072\u0061\u0064\u0061\u0072|\u8282\u70b9\u96f7\u8fbe','i');
for(const [file,text] of contents){
 if(text===null)continue;
 assert(!text.includes('\uFFFD'),`${file}: invalid encoding`);
 assert(!excluded.test(text),`${file}: excluded campaign wording`);
 assert(!excludedBrand.test(text),`${file}: remove external site branding`);
 assert(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text),`${file}: do not publish personal email`);
}
function slug(s){return s.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').toLowerCase().replace(/<[^>]*>/g,'').replace(/[^\p{L}\p{N}_\-\s]/gu,'').replace(/ /g,'-');}
const anchors=new Map();
for(const [file,text] of contents){
 if(!file.endsWith('.md'))continue;
 const ids=new Set([...text.matchAll(/<a\s+id="([^"]+)"/g)].map(m=>m[1]));const seen=new Map();
 for(const m of text.matchAll(/^#{1,6}\s+(.+)$/gm)){const base=slug(m[1]);const n=seen.get(base)||0;seen.set(base,n+1);ids.add(base+(n?`-${n}`:''));}
 anchors.set(file,ids);
}
let links=0,ctaCount=0,mdCount=0;
for(const [file,text] of contents){
 if(!file.endsWith('.md'))continue;mdCount++;
 assert.equal((text.match(/^# /gm)||[]).length,1,`${file}: one H1`);
 assert(!/<details|<script|<style/i.test(text),`${file}: tables must remain expanded, no embedded application code`);
 assert.equal((text.match(/^```/gm)||[]).length%2,0,`${file}: unmatched code fence`);
 let header=null;
 for(const line of text.split('\n')){
  if(!line.startsWith('|')){header=null;continue;}
  const cells=line.split('|').slice(1,-1).map(x=>x.trim());
  if(header===null)header=cells;
  else{
   assert.equal(cells.length,header.length,`${file}: malformed table`);
   if(cells.every(c=>/^:?-+:?$/.test(c))){const i=header.indexOf('推荐指数');if(i>=0)assert(/^:-+:$/.test(cells[i]),`${file}: center stars`);}
  }
 }
 const urls=[...text.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)\)/g)].map(m=>m[1]);
 urls.push(...[...text.matchAll(/<(?:img|source)\b[^>]*\b(?:src|srcset)="([^"]+)"/g)].map(m=>m[1]));
 for(const url of urls){
  if(/^https:\/\//.test(url)){new URL(url);continue;}
  assert(!/^[a-z]+:|^\//i.test(url),`${file}: unsafe or absolute reference ${url}`);
  const [name,fragment]=url.split('#');const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),decodeURIComponent(name||path.posix.basename(file))));
  assert(contents.has(target),`${file}: missing ${target}`);links++;
  if(fragment)assert(anchors.get(target)?.has(decodeURIComponent(fragment)),`${file}: missing anchor ${url}`);
 }
 ctaCount+=(text.match(/^## \[👉 点击进入官网\]\(https:\/\//gm)||[]).length;
}
const home=contents.get('README.md');
assert.deepEqual([...home.matchAll(/<a id="([^"]+)"/g)].map(m=>m[1]).filter(id=>expected.includes(id)),expected,'Homepage airport sequence');
assert.equal(ctaCount,36,'Exactly one homepage and one detail CTA per airport');
for(const a of data.airports){
 const entry=`## [👉 点击进入官网](${a.referral_url})`;
 assert(home.includes(entry));assert(contents.get(`docs/reviews/${a.id}.md`)?.includes(entry));
 assert.equal((home.match(new RegExp(`src="${a.image.webp.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`,'g'))||[]).length,1,'One image per homepage provider');
 const detail=contents.get(`docs/reviews/${a.id}.md`);
 assert(detail.includes(`src="../../${a.image.webp}"`),'Detail image must use a working relative path');
}
assert(home.includes('2026-11'));assert(home.includes('灵动')&&home.includes('70GB/年'));
assert(!home.includes('fastfastfast.best'),'Use the go URL for this edition');
assert(files.length<=100,'Keep the self-contained folder under one browser upload batch');
console.log(JSON.stringify({ok:true,files:files.length,markdown:mdCount,airports:expected.length,plans,localLinks:links,registrationHeadings:ctaCount},null,2));
