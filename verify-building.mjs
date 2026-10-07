import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=vulkan','--enable-features=Vulkan','--disable-vulkan-surface']});
await mkdir('artifacts/building',{recursive:true});
const errors=[],externalRequests=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,250));});
page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith('http://127.0.0.1:4173'))externalRequests.push(r.url());});
async function scopeIs(scope){await page.waitForFunction(s=>window.__home.scope===s,scope);}
async function capture(name){await page.waitForTimeout(250);await page.screenshot({path:`artifacts/building/${name}.png`});}
try{
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>!!window.__home,null,{timeout:90000});await page.waitForSelector('#loading',{state:'detached'});
 await scopeIs('building');assert.equal(await page.locator('#building-floor option').count(),32);assert.equal(await page.locator('#building-wing option').count(),7);
 const mapped=await page.evaluate(()=>{const d=window.__home.development;return {buildings:d.mapped.buildings,roads:d.mapped.roads,sections:d.config.sections,floors:d.config.floors};});assert.ok(mapped.buildings>500&&mapped.roads>500);
 const layout=await page.evaluate(()=>{const d=window.__home.development,L=d.mapped.layout;const inside=(x,z,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};return {anchor:[d.config.latitude,d.config.longitude],site:L.site,parkExists:!!d.neighborhood.getObjectByName('Shree Duttguru Sangharsh Udhyan — open ground'),cricketExists:!!d.neighborhood.getObjectByName('Vishal’s Magic Cricket Academy ground'),treesOnGround:d.mapped.treeCenters.filter(([x,z])=>inside(x,z,L.park)).length,supplemental:d.mapped.supplementalBuildings,backRoadZ:L.backRoad[2][1],frontRoadZ:L.frontRoad[2][1]};});
 assert.deepEqual(layout.anchor,[19.216288,72.817758]);assert.ok(layout.parkExists&&layout.cricketExists);assert.equal(layout.treesOnGround,0);assert.ok(layout.frontRoadZ<layout.site.z&&layout.backRoadZ>layout.site.z);assert.ok(layout.supplemental>0);
 await page.click('#area-overview');await page.waitForTimeout(1100);await capture('corrected-area-layout');await page.click('#building-overview');
 assert.equal(await page.evaluate(()=>window.__home.house.visible),false);assert.ok(await page.locator('#my-apartment').isVisible());await capture('overview');
 await page.click('[data-light="evening"]');assert.ok(await page.evaluate(()=>window.__home.evening));await capture('evening');await page.click('[data-light="day"]');
 // Select a different apartment and verify real elevation/orientation transforms.
 await page.selectOption('#building-floor','8');await page.selectOption('#building-wing','B');await page.selectOption('#building-facing','south');await page.click('#my-apartment');await scopeIs('apartment');
 const south=await page.evaluate(()=>{const h=window.__home,d=h.development;const P=h.camera.position.constructor;const p=new P(2,0,0).applyMatrix4(d.root.matrix);return {selection:d.selection,origin:new P().applyMatrix4(d.root.matrix).toArray(),eastDelta:p.x-new P().applyMatrix4(d.root.matrix).x,aperture:d.aperture,canWalk:h.canWalk(h.camera.position.x,h.camera.position.z)};});
 assert.deepEqual(south.selection,{floor:8,wing:'B',facing:'south'});assert.equal(south.origin[1],-31.5);assert.ok(south.eastDelta<0);assert.equal(south.aperture,'1:8:south');assert.ok(south.canWalk);
 await page.evaluate(()=>{window.__home.focusRoom('balconies');window.__home.setWalkView([2.56,1.6,-.55],[2.56,1.6,-80]);});await capture('south-balcony');
 // North view at another height; same furnished apartment is reused.
 await page.click('#return-building');await scopeIs('building');await page.selectOption('#building-floor','20');await page.selectOption('#building-wing','D');await page.selectOption('#building-facing','north');await page.click('#my-apartment');await page.evaluate(()=>{window.__home.focusRoom('balconies');window.__home.setWalkView([2.56,1.6,-.55],[2.56,1.6,-80]);});await capture('north-balcony');
 const north=await page.evaluate(()=>{const d=window.__home.development,P=window.__home.camera.position.constructor;return {origin:new P().applyMatrix4(d.root.matrix).toArray(),aperture:d.aperture,houses:window.__home.scene.children.filter(x=>x.name==='My home — metres').length};});assert.equal(north.origin[1],-67.5);assert.equal(north.aperture,'3:20:north');assert.equal(north.houses,1);
 // Door passage regression: continuous route from passage through master entry.
 assert.deepEqual(await page.evaluate(()=>{const p=[[10.8,3.3],[11.55,3.3],[11.55,3.04],[12.45,3.04],[12.45,2.6]],blocked=[];for(let i=1;i<p.length;i++)for(let s=0;s<=100;s++){const x=p[i-1][0]+(p[i][0]-p[i-1][0])*s/100,z=p[i-1][1]+(p[i][1]-p[i-1][1])*s/100;if(!window.__home.canWalk(x,z))blocked.push([x,z]);}return blocked;}),[]);
 // Room controls still switch top/dollhouse/walk modes.
 await page.click('[data-view="plan"]');assert.equal(await page.evaluate(()=>window.__home.mode),'plan');await page.click('[data-view="dollhouse"]');await page.waitForTimeout(1050);await capture('apartment-model');
 await page.click('#return-building');
 // Full arrival journey, including proximity restrictions and floor synchronization.
 await page.click('#start-arrival');await scopeIs('arrival');assert.ok(await page.locator('#call-lift').isDisabled());await capture('lobby');
 await page.click('#approach-lift');await page.waitForFunction(()=>!document.querySelector('#call-lift').disabled,null,{timeout:10000});await page.click('#call-lift');await page.waitForFunction(()=>window.__home.arrival.stage==='lift');
 await page.selectOption('#lift-floor','12');await page.click('#ride-lift');assert.ok(await page.locator('#building-floor').isDisabled());await page.waitForFunction(()=>window.__home.arrival.stage==='corridor',null,{timeout:10000});
 assert.equal(await page.inputValue('#building-floor'),'12');assert.ok(await page.locator('#enter-home').isDisabled());await capture('corridor');await page.click('#approach-door');await page.waitForFunction(()=>!document.querySelector('#enter-home').disabled,null,{timeout:10000});await page.click('#enter-home');await scopeIs('apartment');assert.equal(await page.evaluate(()=>window.__home.development.selection.floor),12);
 // Returning and repeated entry reuse GPU assets.
 await page.click('#return-building');await page.evaluate(()=>{for(let i=0;i<6;i++){window.__home.enterApartment(true);window.__home.showBuilding();}});assert.equal(await page.evaluate(()=>window.__home.scene.children.filter(x=>x.name==='My home — metres').length),1);
 await page.click('#start-arrival');await page.click('#skip-arrival');await scopeIs('apartment');await page.click('#return-building');
 // Hosted reference asset is valid.
 await page.click('#reference-btn');await page.click('[data-ref="building"]');await page.waitForFunction(()=>document.querySelector('#reference-image').complete&&document.querySelector('#reference-image').naturalWidth>0);await page.click('[data-ref="location"]');await page.waitForFunction(()=>document.querySelector('#reference-image').complete&&document.querySelector('#reference-image').naturalWidth>0);await page.click('#close-reference');
 const download=page.waitForEvent('download');await page.click('#snapshot');assert.ok((await download).suggestedFilename().endsWith('.png'));
 // Mobile selectors and navigation fit the viewport without horizontal overflow.
 await page.setViewportSize({width:390,height:844});await capture('mobile-building');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.click('#my-apartment');await scopeIs('apartment');await capture('mobile-apartment');await page.click('#return-building');await page.click('#start-arrival');await capture('mobile-lobby');await page.click('#skip-arrival');await scopeIs('apartment');
 // Standalone model must work with network requests blocked.
 await page.route('http://**/*',r=>r.abort());await page.route('https://**/*',r=>r.abort());await page.goto('file:///home/vikas/3dhouse/My%20Home%203D.html',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>!!window.__home,null,{timeout:90000});await scopeIs('building');await page.click('#my-apartment');await scopeIs('apartment');
 assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
 const result={passed:true,mapped,correctedLayout:layout,entryRoutes:3,standaloneOffline:true,errors,externalRequests};await writeFile('artifacts/building/results.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
