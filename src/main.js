import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { prepareExportModel, deduplicateGlbImages } from './export-model.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createRealisticMaterials } from './realistic-materials.js';
import { loadScannedAssets, placeScannedAssets } from './scanned-assets.js';
import { buildRealisticInterior } from './realistic-interior.js';
import { refineArchitecture } from './realistic-architecture.js';
import { createRealisticRenderer, addMirrorReflections, configureInteractiveGlass } from './realistic-renderer.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createPhotoQuality } from './photo-quality.js';
import { createDevelopment, createArrival } from './development.js';

async function init() {

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const viewport = $('#viewport'), canvas = $('#scene');
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
const contextRecovery=renderer.getContext().getExtension('WEBGL_lose_context');
renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.localClippingEnabled=true;
const camera=new THREE.PerspectiveCamera(38,1,.06,180);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=3;controls.maxDistance=65;controls.maxPolarAngle=Math.PI/2.04;controls.target.set(7.1,0,3.1);
const cutPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),.75);
const house=new THREE.Group();house.name='My home — metres';scene.add(house);
const architecture=new THREE.Group();architecture.name='Architecture';house.add(architecture);
const furnishing=new THREE.Group();furnishing.name='Furniture';house.add(furnishing);
const dimensionGroup=new THREE.Group();dimensionGroup.name='Room dimensions';scene.add(dimensionGroup);dimensionGroup.visible=false;
const material=(color,roughness=.8,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
const mats=await createRealisticMaterials(THREE,renderer,window.__ASSET_URLS__||{});
for(const key of ['wall','trim','glass']){mats[key]=mats[key].clone();mats[key].clippingPlanes=[cutPlane];mats[key].clipShadows=true;}
const woodTall=mats.wood.clone();woodTall.clippingPlanes=[cutPlane];woodTall.clipShadows=true;
const whiteTall=mats.white.clone();whiteTall.clippingPlanes=[cutPlane];whiteTall.clipShadows=true;
const metalTall=mats.metal.clone();metalTall.clippingPlanes=[cutPlane];metalTall.clipShadows=true;
const blackTall=mats.black.clone();blackTall.clippingPlanes=[cutPlane];blackTall.clipShadows=true;
function mesh(geo,mat,parent,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,x,y,z,w,h,d,mat=mats.white,r=0){return mesh(r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function cylinder(parent,x,y,z,r,h,mat=mats.wood,rTop=r){return mesh(new THREE.CylinderGeometry(rTop,r,h,20),mat,parent,x,y,z);}
function sphere(parent,x,y,z,r,mat=mats.leaves,sx=1,sy=1,sz=1){const m=mesh(new THREE.SphereGeometry(r,12,8),mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
function group(parent,x=0,z=0,rot=0,name=''){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.name=name;parent.add(g);return g;}
const floorMeshes=[],walkable=[],walls=[];
const rooms=[
 {id:'living',num:'01',name:'Living & dining',dim:'3.35 × 5.40 m + dining recess',short:'3.35 × 5.40 m',x:0,z:0,w:3.35,d:5.4,c:[1.8,2.8],label:[2.4,3.15],walk:[2.5,3.6],look:[.7,1.3],desc:'An open living space with an L-shaped sofa, a six-seat dining table, and a balcony.'},
 {id:'kitchen',num:'02',name:'Kitchen & utility',dim:'2.75 × 2.85 m · 0.75 m utility',short:'2.75 × 2.85 m',x:3.55,z:0,w:2.75,d:2.85,c:[4.9,1.4],label:[5,1.6],walk:[4.75,2.1],look:[5.9,.7],desc:'A fitted kitchen with a hob, sink, fridge, and a separate utility strip.'},
 {id:'bed2',num:'03',name:'Bedroom 02',dim:'3.05 × 3.55 m',short:'3.05 × 3.55 m',x:6.5,z:-.95,w:3.05,d:3.55,c:[8, .9],label:[7.2,1.9],walk:[6.92,1.45],look:[8.3,.4],desc:'A double bedroom with warm timber flooring, bedside tables, and a wardrobe.'},
 {id:'master',num:'04',name:'Master bedroom',dim:'3.05 × 4.70 m',short:'3.05 × 4.70 m',x:11.4,z:-.95,w:3.05,d:4.7,c:[12.9,1.3],label:[12.6,2.75],walk:[12,2.6],look:[13,.4],desc:'The main bedroom, with a king-size bed, a generous wardrobe, and an adjoining bathroom.'},
 {id:'bed3',num:'05',name:'Bedroom 03',dim:'4.05 × 3.05 m · private balcony',short:'4.05 × 3.05 m',x:8.7,z:4.15,w:4.05,d:3.05,c:[10.7,5.6],label:[9.5,5],walk:[10.8,4.7],look:[11,6.3],desc:'A third bedroom opening onto a 1.15 m wide balcony, with a desk and wardrobe.'},
 {id:'baths',num:'06',name:'Bathrooms',dim:'3 bathrooms · 2 service ducts',short:'1.45 × 2.45 m',x:5.4,z:4.15,w:3.1,d:2.45,c:[6.95,5.35],label:[6.2,6],walk:[6.1,4.25],look:[6.5,5.75],desc:'Two bathrooms off the passage, plus the 1.45 × 2.80 m bathroom beside the master bedroom.'},
 {id:'balconies',num:'07',name:'The balconies',dim:'1.20 m & 1.15 m wide',short:'1.20 m wide',x:0,z:-1.4,w:3.35,d:1.2,c:[1.7,-.8],label:[1.6,-.85],walk:[1.25,-.65],look:[1.25,-2],desc:'A planted living-room balcony and a second balcony beside Bedroom 03.'}
];
const roomVariants={
 balconies:{living:{name:'Living balcony',dim:'1.20 m wide',desc:'Planted balcony adjoining the living room.'},bedroom:{name:'Bedroom balcony',dim:'1.15 m wide',desc:'Private balcony adjoining Bedroom 03.',x:12.95,z:4.15,w:1.15,d:3.05,c:[13.5,5.65],walk:[13.5,5.1],look:[15.5,7.1]}},
 baths:{common1:{name:'Bathroom 01',dim:'1.45 × 2.45 m',desc:'Stone bathroom with an oak vanity and a walk-in shower.'},common2:{name:'Bathroom 02',dim:'1.45 × 2.45 m',desc:'The second bathroom off the main passage.',x:7.05,z:4.15,w:1.45,d:2.45,c:[7.75,5.35],walk:[7.75,4.25],look:[8.15,5.75]},masterBath:{name:'Master bathroom',dim:'1.45 × 2.80 m',desc:'Bathroom beside the master bedroom and service duct.',x:9.75,z:-.2,w:1.45,d:2.8,c:[10.45,1.2],walk:[10.45,2.45],look:[10.6,.6]}}
};
function selectedRoom(id=selected){const base=rooms.find(r=>r.id===id);return base?{...base,...(id===selected&&chosenVariant?roomVariants[id]?.[chosenVariant]:{})}:null;}
function floor(id,x,z,w,d,type='tile'){const mat=mats.forSurface(type==='wood'?mats.floorWood:type==='stone'?mats.floorBath:mats.tile,w,d);const m=box(architecture,x+w/2,-.035,z+d/2,w,.07,d,mat);m.userData.room=id;floorMeshes.push(m);walkable.push({x,z,w,d});return m;}
const outline=[[0,-1.4],[3.35,-1.4],[3.35,-.95],[14.65,-.95],[14.65,3.95],[14.1,3.95],[14.1,7.4],[8.65,7.4],[8.65,8.35],[5.2,8.35],[5.2,5.6],[0,5.6]];
const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const base=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.23,bevelEnabled:false}),mats.slab);base.rotation.x=-Math.PI/2;base.position.y=-.25;base.receiveShadow=true;base.castShadow=true;architecture.add(base);
floor('living',0,0,3.35,5.4);floor('living',3.35,3.95,1.85,1.45);
floor('kitchen',3.55,0,2.75,2.85);floor('kitchen',3.55,-.95,2.75,.75,'stone');
floor('bed2',6.5,-.95,3.05,3.55,'wood');floor('master',11.4,-.95,3.05,4.7,'wood');
floor('baths',9.75,-.2,1.45,2.8,'stone');floor('passage',3.35,2.94,8.05,1.0);floor('passage',9.55,2.6,1.85,.34);
floor('passage',5.4,3.94,3.1,.21);floor('passage',8.7,3.94,4.05,.21);
floor('passage',6.5,2.6,3.05,.34);
floor('bed3',8.7,4.15,4.05,3.05,'wood');floor('baths',5.4,4.15,1.45,2.45,'stone');floor('baths',7.05,4.15,1.45,2.45,'stone');
floor('balconies',0,-1.4,3.35,1.2,'wood');floor('balconies',12.95,4.15,1.15,3.05,'wood');
// Utility shafts have their own recessed floor and remain outside the walking area.
box(architecture,10.48,-.13,-.625,1.45,.08,.65,mats.charcoal);box(architecture,6.95,-.13,7.14,3.1,.08,.8,mats.charcoal);box(architecture,6.95,-.13,7.92,3.1,.08,.7,mats.bath);
function wall(x1,z1,x2,z2,{height=2.8,thick=.18,low=0,collide=true,mat=mats.wall}={}){const l=Math.hypot(x2-x1,z2-z1);const m=box(architecture,(x1+x2)/2,low+height/2,(z1+z2)/2,l,height,thick,mats.forSurface(mat,l,height));m.rotation.y=-Math.atan2(z2-z1,x2-x1);if(collide&&low<1.7&&low+height>1)walls.push({x1,z1,x2,z2,thick});if(low===0){const sk=box(architecture,(x1+x2)/2,.055,(z1+z2)/2,l,.11,thick+.025,mats.trim);sk.rotation.y=m.rotation.y;}return m;}
function doorway(x,z,width,along='x',rot=0,swing=-1,openAngle=Math.PI/2.8){const g=group(architecture,x,z,rot,'Open doorway');if(along==='z')g.rotation.y-=Math.PI/2;const hinge=new THREE.Group();hinge.rotation.y=swing*openAngle;g.add(hinge);const door=box(hinge,width/2,1.02,0,width,2.04,.042,woodTall);box(hinge,width-.09,1.02,.038,.1,.025,.025,metalTall,.008);box(g,0,1.1,0,.07,2.2,.22,mats.trim);box(g,width,1.1,0,.07,2.2,.22,mats.trim);box(g,width/2,2.18,0,width,.08,.22,mats.trim);const angle=g.rotation.y+hinge.rotation.y;walls.push({x1:x,z1:z,x2:x+Math.cos(angle)*width,z2:z-Math.sin(angle)*width,thick:.042,door:true});}
function windowFrame(x,z,width,rot=0,balcony=false){const g=group(architecture,x,z,rot,'Window');const bottom=balcony?.06:.9,height=balcony?2.35:1.5;const paneWidth=balcony?width*.49:width;
if(balcony){for(const depth of [0,.055])box(g,-width*.25,bottom+height/2,depth,paneWidth,height,.012,mats.glass);for(const a of[-width/2,0])box(g,a,bottom+height/2,0,.045,height,.07,blackTall);}else{box(g,0,bottom+height/2,0,width,height,.012,mats.glass);[-width/2,0,width/2].forEach(a=>box(g,a,bottom+height/2,0,.045,height,.07,blackTall));}
[bottom,bottom+height].forEach(y=>box(g,0,y,0,width,.045,.07,blackTall));if(!balcony)box(g,0,bottom+.3,0,width,.035,.07,blackTall);if(balcony){const ax=x-Math.cos(rot)*width/2,az=z+Math.sin(rot)*width/2;walls.push({x1:ax,z1:az,x2:x,z2:z,thick:.025,glazing:true});}}
// Living room, balcony and entry.
wall(0,-1.4,0,4.25);wall(0,5.2,0,5.5);wall(0,5.5,5.2,5.5);wall(3.45,-1.4,3.45,2.85);
wall(0,-.1,.35,-.1);wall(3.05,-.1,3.45,-.1);wall(.35,-.1,3.05,-.1,{height:.07,collide:false});windowFrame(1.7,-.1,2.7,0,true);doorway(0,4.28,.9,'z',0,1);
// Kitchen is open onto the central passage.
wall(3.45,-.1,3.8,-.1);wall(5.95,-.1,6.4,-.1);windowFrame(4.86,-.1,2.12,0,true);wall(3.45,-.95,6.4,-.95,{height:.8});
wall(6.4,-.95,6.4,2.85);wall(3.45,2.85,4.1,2.85);wall(5.5,2.85,6.4,2.85);
// Bedroom 02.
wall(6.4,-1.03,6.7,-1.03);wall(9.2,-1.03,9.65,-1.03);wall(6.7,-1.03,9.2,-1.03,{height:.9});windowFrame(7.95,-1.03,2.5);wall(9.65,-1.03,9.65,2.7);wall(7.48,2.7,9.65,2.7);doorway(6.5,2.7,.87,'x',0,1);wall(6.4,2.7,6.5,2.7);
// Master bathroom and duct.
wall(9.65,-.95,11.3,-.95);wall(9.65,-.3,11.3,-.3,{height:1.05});wall(11.3,-.95,11.3,2.85);wall(9.65,2.7,9.9,2.7);wall(10.78,2.7,11.3,2.7);doorway(10.73,2.7,.82,'x',Math.PI,-1,Math.PI*11/18);
// Master bedroom.
wall(11.3,-1.03,11.7,-1.03);wall(14.1,-1.03,14.55,-1.03);wall(11.7,-1.03,14.1,-1.03,{height:.9});windowFrame(12.9,-1.03,2.4);wall(14.55,-1.03,14.55,3.85);wall(11.3,3.85,14.55,3.85);doorway(11.3,2.85,.9,'z',0,1,Math.PI/2);
// Two lower bathrooms.
wall(5.3,4.03,5.3,8.35);wall(6.95,4.03,6.95,6.7);wall(8.6,4.7,8.6,8.35);wall(6.3,4.03,6.95,4.03);wall(6.95,4.03,7.2,4.03);wall(8.05,4.03,8.6,4.03);doorway(5.42,4.03,.8,'x',0,1);doorway(7.21,4.03,.8,'x',0,1);
wall(5.3,6.7,6.95,6.7,{height:.9});wall(6.95,6.7,8.6,6.7,{height:.9});windowFrame(6.15,6.7,.7);windowFrame(7.8,6.7,.7);wall(5.3,7.55,8.6,7.55,{height:.65});wall(5.3,8.35,8.6,8.35,{height:.65});wall(6.02,7.55,6.02,8.35,{height:.65});wall(7.95,7.55,7.95,8.35,{height:.65});
// Bedroom 03 and its side balcony.
wall(8.6,4.03,8.85,4.03);wall(9.78,4.03,12.85,4.03);doorway(8.87,4.03,.84);wall(8.6,4.03,8.6,7.3);wall(8.6,7.3,12.85,7.3);wall(12.85,3.95,12.85,4.55);wall(12.85,6.75,12.85,7.3);windowFrame(12.85,5.65,2.2,Math.PI/2,true);
function railing(x,z,w,rot=0){const g=group(architecture,x,z,rot,'Balcony rail');for(let i=0;i<=Math.ceil(w/.55);i++){const px=-w/2+i*w/Math.ceil(w/.55);box(g,px,.51,0,.035,1.02,.035,mats.metal);}box(g,0,1.03,0,w,.04,.05,mats.metal);box(g,0,.5,0,w,.85,.025,mats.glass);}
railing(1.7,-1.4,3.4);railing(14.08,5.65,3.3,Math.PI/2);railing(13.5,4.02,1.1);railing(13.5,7.3,1.1);
const scanned=await loadScannedAssets(window.__ASSET_URLS__||{});
const interior=buildRealisticInterior(THREE,furnishing,mats,{scannedPlants:!!scanned.potted_plant_01&&!!scanned.potted_plant_02,scannedChair:!!scanned.modern_arm_chair_01});
walls.push(...(interior.showerWalls||[]));
interior.scanned=placeScannedAssets(scanned,interior);
const mirrorReflections=addMirrorReflections(THREE,interior.mirrors,Reflector);
interior.lamps.forEach(l=>l.material.emissiveIntensity=.04);
const architecturalView=refineArchitecture(architecture,house,mats);
architecturalView.setSection(.75,false);
const development=createDevelopment(scene);
const exterior=development.root;
const arrival=createArrival();scene.add(arrival.root);arrival.root.visible=false;
camera.far=5000;camera.updateProjectionMatrix();
// Broad, soft daylight gives the model the feel of an architectural maquette.
const ambient=new THREE.HemisphereLight('#edf5fb','#b5a99a',.08);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff1dc',2.1);sun.position.set(2,16,-4);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:50});sun.shadow.bias=-.0003;sun.shadow.normalBias=.015;sun.shadow.radius=8;sun.target.position.set(7,0,3);scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight('#d5e7ee',.12);fill.position.set(15,8,10);scene.add(fill);
const ground=mesh(new THREE.PlaneGeometry(180,180),material('#e6e8de',1),scene,7,-.29,3);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
const warmLights=interior.lights;
RectAreaLightUniformsLib.init();
const windowFill=[];for(const [x,z,w,rot] of [[1.7,-.1,2.7,0],[4.86,-.1,2.1,0],[7.95,-.95,2.5,0],[12.9,-.95,2.4,0],[12.85,5.65,2.2,Math.PI/2],[6.15,6.7,.7,Math.PI],[7.8,6.7,.7,Math.PI],[10.475,-.3,.65,0]]){const light=new THREE.RectAreaLight('#e8f2ff',2.6,w,1.6);light.position.set(x,1.65,z);light.lookAt(x-Math.sin(rot)*2,1.15,z+Math.cos(rot)*2);scene.add(light);windowFill.push(light);}
const floorBounce=[];for(const r of rooms.filter(r=>r.id!=='balconies')){const light=new THREE.RectAreaLight(r.id==='living'||r.id==='kitchen'?'#fff8ec':'#f3e7d2',.45,r.w-.25,r.d-.25);light.name='Approximate diffuse floor bounce';light.userData.viewerHelper=true;light.position.set(r.x+r.w/2,.06,r.z+r.d/2);light.lookAt(light.position.x+.001,2.8,light.position.z);scene.add(light);floorBounce.push(light);}
const realisticRenderer=createRealisticRenderer(renderer,scene,camera,mats.environment);
configureInteractiveGlass(scene);
const photo=createPhotoQuality(renderer,scene,camera,()=>realisticRenderer.render(),state=>{const button=$('#photo-quality');button.classList.toggle('active',state.active);button.textContent=state.active?'× Stop photo rendering':'✧ Photo quality';const status=$('#photo-status');status.hidden=!state.active;status.querySelector('span').textContent=state.preparing?'Preparing realistic light…':state.samples>=1024?'Photo quality ready':`Refining light · ${state.samples} / 1024 samples`;if(state.error){lastRendered='';}if(state.error)notify('Photo rendering is unavailable. Interactive view is ready.');if(!state.supported)notify('Photo quality needs a browser with advanced WebGL support.');});
function cancelPhoto(){if(photo.active){photo.stop();lastRendered='';}}
$('#photo-quality').onclick=()=>{if(scope!=='apartment')return;stopTour();if(transition){camera.position.copy(transition.end);controls.target.copy(transition.targetEnd);transition=null;controls.update();}if(photo.active){photo.stop();lastRendered='';return;}photo.start();};
$('#cancel-photo').onclick=()=>{photo.stop();lastRendered='';};
// Dimension marks are part of the viewer, separate from the exported physical model.
function textSprite(text){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#ffffffed';ctx.fillRect(0,0,512,96);ctx.fillStyle='#355541';ctx.font='36px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,60);const t=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));s.scale.set(1.3,.245,1);return s;}
function dimLine(x,z,w,d){const pts=[new THREE.Vector3(x,.085,z),new THREE.Vector3(x+w,.085,z)];dimensionGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#4a7650'})));for(const px of[x,x+w])dimensionGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px,.085,z-.08),new THREE.Vector3(px,.085,z+.08)]),new THREE.LineBasicMaterial({color:'#4a7650'})));const t=textSprite(d+' m');t.position.set(x+w/2,.18,z);dimensionGroup.add(t);}
rooms.slice(0,6).forEach(r=>{dimLine(r.x+.12,r.z+r.d-.14,r.w-.24,r.w.toFixed(2));const g=new THREE.Group();dimensionGroup.add(g);const t=textSprite(r.d.toFixed(2)+' m');t.position.set(r.x+.17,.2,r.z+r.d/2);g.add(t);});
const overlays={};for(const r of rooms){const m=mesh(new THREE.PlaneGeometry(r.w,r.d),new THREE.MeshBasicMaterial({color:'#719b65',transparent:true,opacity:.14,depthWrite:false}),scene,r.x+r.w/2,.015,r.z+r.d/2);m.rotation.x=-Math.PI/2;m.visible=false;m.userData.viewerHelper=true;overlays[r.id]=m;}
for(const r of rooms){const el=document.createElement('button');el.className='room-btn';el.dataset.room=r.id;el.innerHTML=`<span class="room-num">${r.num}</span><span class="room-text"><strong>${r.name}</strong><span>${r.dim}</span></span><span class="room-arrow">↗</span>`;el.onclick=()=>focusRoom(r.id);$('#room-list').append(el);const label=document.createElement('div');label.className='room-label';label.innerHTML=`${r.name.toUpperCase()}<span>${r.short}</span>`;$('#room-labels').append(label);r.labelEl=label;}
let exporting=false,graphicsPaused=false,lastRendered='';
let mode='dollhouse',selected=null,chosenVariant=null,transition=null,tourTimer=null,tourIndex=0,yaw=0,pitch=-.06,lookDragging=false,lastX=0,lastY=0,previousHeight=.75,clock=new THREE.Clock();
let scope='building',journeyMotion=null,liftTrip=null;
const keys=new Set();const vec=new THREE.Vector3();
function notify(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').style.display='none',3000);}
function moveCamera(pos,target){cancelPhoto();transition={start:camera.position.clone(),end:new THREE.Vector3(...pos),targetStart:controls.target.clone(),targetEnd:new THREE.Vector3(...target),startTime:performance.now(),duration:950};}
function homeDistance(){const reserve=viewport.clientWidth>800?225:0;const aspect=(viewport.clientWidth-reserve)/viewport.clientHeight;return Math.max(24,27/aspect);}
function fitHome(animate=true){const dist=homeDistance();const pos=[7.1+dist*.22,dist*.73,3.1+dist*.57];if(animate)moveCamera(pos,[7.1,0,3.1]);else{camera.position.set(...pos);controls.target.set(7.1,0,3.1);controls.update();}}
function updateSelection(id){if(selected!==id)chosenVariant=null;selected=id;$$('.room-btn').forEach(b=>b.classList.toggle('active',b.dataset.room===id));rooms.forEach(r=>r.labelEl.classList.toggle('selected',r.id===id));Object.entries(overlays).forEach(([k,m])=>m.visible=k===id&&!chosenVariant&&mode!=='walk');const r=selectedRoom(id);const variants=$('#room-variants');variants.innerHTML='';variants.hidden=!roomVariants[id];for(const [key,value]of Object.entries(roomVariants[id]||{})){const button=document.createElement('button');button.textContent=value.name;button.classList.toggle('active',key===(chosenVariant||Object.keys(roomVariants[id])[0]));button.onclick=()=>{chosenVariant=key;focusRoom(id);};variants.append(button);}$('#clear-room').hidden=!r;$('#info-tag').textContent=r?'SPACE / '+r.num:'THE WHOLE HOME';$('#info-name').textContent=r?r.name+' · '+r.dim:'Designed around your everyday.';$('#info-desc').textContent=r?r.desc:'Living, gathering, and a little room to unwind.';$('#info-number').textContent=r?r.num:'06';}
function focusRoom(id){if(scope!=='apartment')enterApartment(false);const r=selectedRoom(id)||rooms.find(r=>r.id===id);updateSelection(id);if(mode==='walk'){enterRoom(r);return;}const a=viewport.clientWidth/viewport.clientHeight;if(mode==='plan'){moveCamera([r.c[0],a<1?13:10,r.c[1]+.005],[...r.c.slice(0,1),0,r.c[1]]);}else{const distance=id==='living'?8.7:7.1;moveCamera([r.c[0]+distance*.2,distance*.82,r.c[1]+distance*.68],[r.c[0],.15,r.c[1]]);}}
function stopTour(){clearInterval(tourTimer);tourTimer=null;$('#tour').textContent='▷ Take a room tour';}
function setMode(next){if(scope!=='apartment')enterApartment(false);cancelPhoto();stopTour();transition=null;if(mode==='walk'&&next!=='walk'){cutPlane.constant=previousHeight;$('#wall-height').value=previousHeight;$('#wall-value').textContent=previousHeight.toFixed(2)+' m';}mode=next;scene.userData.interiorView=mode==='walk';mirrorReflections.forEach(r=>r.visible=mode==='walk');exterior.visible=mode==='walk';development.frame(true);development.mapped.landmarks.visible=false;ground.visible=mode!=='walk';realisticRenderer.setInterior(mode==='walk');camera.fov=mode==='walk'?65:38;camera.updateProjectionMatrix();resize();controls.enabled=mode!=='walk';$('#walking').hidden=mode!=='walk';$('#move-pad').hidden=mode!=='walk';$('#wall-height').disabled=mode==='walk';$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));Object.entries(overlays).forEach(([k,m])=>m.visible=k===selected&&mode!=='walk');if(mode==='walk'){previousHeight=Number($('#wall-height').value);cutPlane.constant=2.8;$('#wall-value').textContent='2.80 m';enterRoom(selectedRoom()||rooms[0]);notify('Drag to look around. Use WASD or the arrows to walk.');}else if(mode==='plan'){controls.maxPolarAngle=.001;controls.minPolarAngle=0;const dist=homeDistance();moveCamera([7.1,dist,3.1+.005],[7.1,0,3.1]);}else{controls.maxPolarAngle=Math.PI/2.04;controls.minPolarAngle=0;fitHome();}architecturalView.setSection(cutPlane.constant,mode==='walk');renderer.shadowMap.needsUpdate=true;}
function enterRoom(r){camera.fov=r.id==='baths'?78:65;camera.updateProjectionMatrix();scene.userData.photoRoom=r;cancelPhoto();transition=null;camera.position.set(r.walk[0],1.6,r.walk[1]);yaw=Math.atan2(-(r.look[0]-r.walk[0]),-(r.look[1]-r.walk[1]));pitch=r.id==='baths'?-.19:r.id==='balconies'?-.14:-.10;
if(r.id==='balconies'){
 // Face outward through the opening, rather than turning into its side wall.
 yaw=chosenVariant==='bedroom'?-Math.PI/2:0;
 const height=development.pose().position.y+camera.position.y;
 pitch=-Math.min(.55,Math.max(.12,Math.atan2(height,100)));
}
updateWalkLook();}
function updateWalkLook(){camera.lookAt(camera.position.x-Math.sin(yaw)*Math.cos(pitch),camera.position.y+Math.sin(pitch),camera.position.z-Math.cos(yaw)*Math.cos(pitch));}
const furnitureBlocks=interior.colliders;
function canWalk(x,z){if(scope==='arrival')return arrival.canWalk(x,z);if(furnishing.visible&&furnitureBlocks.some(r=>x>r.x-.08&&x<r.x+r.w+.08&&z>r.z-.08&&z<r.z+r.d+.08))return false;if(!walkable.some(r=>x>r.x+.1&&x<r.x+r.w-.1&&z>r.z+.1&&z<r.z+r.d-.1)){// Allow passage across connected floor edges and door thresholds.
if(!walkable.some(r=>x>r.x-.13&&x<r.x+r.w+.13&&z>r.z-.13&&z<r.z+r.d+.13))return false;}
for(const w of walls){const dx=w.x2-w.x1,dz=w.z2-w.z1,l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-w.x1)*dx+(z-w.z1)*dz)/l));if(Math.hypot(x-w.x1-dx*t,z-w.z1-dz*t)<w.thick/2+.14)return false;}return true;}
canvas.addEventListener('pointerdown',e=>{cancelPhoto();if(mode==='walk'){lookDragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);}canvas.focus();});canvas.addEventListener('pointermove',e=>{if(mode==='walk'&&lookDragging){yaw-=(e.clientX-lastX)*.005;pitch=Math.max(-1.1,Math.min(1.1,pitch-(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY;}});canvas.addEventListener('pointerup',()=>lookDragging=false);
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(mode==='walk'&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cancelPhoto();keys.add(e.key);}if(e.key==='Escape'&&scope==='arrival')showBuilding();else if(e.key==='Escape'&&mode==='walk')setMode('dollhouse');if(e.key==='Enter'&&scope==='arrival'){if(arrival.stage==='lobby'&&!$('#call-lift').disabled)$('#call-lift').click();else if(arrival.stage==='corridor'&&!$('#enter-home').disabled)$('#enter-home').click();}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
$$('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();keys.add(b.dataset.key);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
$$('[data-view]').forEach(b=>b.onclick=()=>setMode(b.dataset.view));$('#exit-walk').onclick=()=>setMode('dollhouse');$('#reset').onclick=()=>{if(scope==='building'){fitBuilding();return;}if(scope==='arrival'){startArrival();return;}updateSelection(null);setMode('dollhouse');};$('#clear-room').onclick=()=>{updateSelection(null);setMode('dollhouse');};
$('#wall-height').oninput=e=>{cancelPhoto();cutPlane.constant=Number(e.target.value);$('#wall-value').textContent=cutPlane.constant.toFixed(2)+' m';};$('#furniture').onchange=e=>{cancelPhoto();furnishing.visible=e.target.checked;renderer.shadowMap.needsUpdate=true;};$('#labels').onchange=()=>{};$('#dimensions').onchange=e=>dimensionGroup.visible=e.target.checked;
let evening=false;
$$('[data-light]').forEach(b=>b.onclick=()=>{cancelPhoto();evening=b.dataset.light==='evening';renderer.shadowMap.needsUpdate=true;$$('[data-light]').forEach(x=>x.classList.toggle('active',x===b));ambient.intensity=scope==='apartment'?(evening?.04:.08):(evening?.15:.48);windowFill.forEach(l=>l.intensity=evening?.1:2.6);floorBounce.forEach(l=>l.intensity=evening?.16:.45);sun.intensity=evening?.12:2.1;sun.color.set(evening?'#a7bfdc':'#fff1dc');development.setEvening(evening);scene.fog=scope==='building'?new THREE.Fog(evening?'#6a7b86':'#c5d6d0',600,1900):null;fill.intensity=evening?.06:.12;scene.environmentIntensity=evening?.1:.45;scene.backgroundIntensity=evening?.08:1;renderer.toneMappingExposure=evening?1.0:1.05;ground.material.color.set(evening?'#798178':'#e6e8de');viewport.style.background=evening?'radial-gradient(ellipse at 48% 44%,#7f887c,#556558)':'';warmLights.forEach(l=>l.intensity=evening?(l.userData.baseIntensity||l.baseIntensity||12)*.18:0);interior.lamps.forEach(l=>l.material.emissiveIntensity=evening?.65:.04);});
function animateScope(){document.body.classList.remove('scope-changing');void canvas.offsetWidth;document.body.classList.add('scope-changing');}
function resetJourney(){keys.clear();journeyMotion=null;liftTrip=null;$('#lift-progress').hidden=true;for(const id of ['building-floor','building-wing','building-facing','lift-floor'])$('#'+id).disabled=false;}
function setScopeUI(next){
  scope=next;document.body.dataset.scope=next;
  $('#building-panel').hidden=next==='apartment';$('#apartment-panel').hidden=next!=='apartment';
  $('#return-building').hidden=next==='building';$('#arrival-panel').hidden=next!=='arrival';
  $('#location-card').hidden=next!=='building';$('#area-overview').hidden=next!=='building';$('#apartment-marker').hidden=next!=='building';
  $('#room-variants').hidden=true;$('#clear-room').hidden=true;dimensionGroup.visible=next==='apartment'&&$('#dimensions').checked;
  $('#walking').querySelector('span:nth-child(2)').textContent=next==='arrival'?'ARRIVING HOME':'INSIDE YOUR HOME';
  lastRendered='';animateScope();
}
function lightingForScope(){
  const outdoor=scope==='building';ambient.intensity=scope==='apartment'?(evening?.04:.08):(evening?.15:.48);
  windowFill.forEach(l=>l.visible=scope==='apartment');floorBounce.forEach(l=>l.visible=scope==='apartment');warmLights.forEach(l=>l.visible=scope==='apartment');
  sun.position.set(...(outdoor?[130,240,-160]:[2,16,-4]));sun.target.position.set(...(outdoor?[0,50,0]:[7,0,3]));
  Object.assign(sun.shadow.camera,outdoor?{left:-110,right:110,top:130,bottom:-100,near:.5,far:600}:{left:-13,right:13,top:13,bottom:-13,near:.5,far:50});sun.shadow.camera.updateProjectionMatrix();
  scene.environmentIntensity=evening?.1:(outdoor?.65:.45);scene.fog=outdoor?new THREE.Fog(evening?'#6a7b86':'#c5d6d0',600,1900):null;
  realisticRenderer.setQuality(scope!=='building');renderer.shadowMap.needsUpdate=true;
}
function fitBuilding(animate=true){
  const distance=Math.max(240,210/Math.max(.35,camera.aspect)),site=development.building.position;const pos=[site.x-distance*.45,46+distance*.36,site.z-distance*.73];
  if(animate)moveCamera(pos,[site.x,49,site.z]);else{camera.position.set(...pos);controls.target.set(site.x,49,site.z);controls.update();}
}
function buildingInfo(){
  const v=development.selection;
  $('#info-tag').textContent='THE REDEVELOPMENT / CHARKOP';$('#info-name').textContent=`Your future home · Section ${v.wing} / Floor ${v.floor}`;
  $('#info-desc').textContent='Exterior estimated from your photo. Explore the building or enter the furnished sample apartment.';$('#info-number').textContent='32';
}
function showBuilding(){
  cancelPhoto();stopTour();resetJourney();transition=null;updateSelection(null);setScopeUI('building');mode='dollhouse';
  house.visible=false;arrival.root.visible=false;exterior.visible=true;development.frame(false);development.mapped.landmarks.visible=true;ground.visible=false;
  Object.values(overlays).forEach(o=>o.visible=false);mirrorReflections.forEach(r=>r.visible=false);scene.userData.interiorView=false;delete scene.userData.photoRoom;
  $('#walking').hidden=true;$('#move-pad').hidden=true;controls.enabled=true;controls.minDistance=45;controls.maxDistance=1500;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2.05;
  camera.fov=42;camera.far=5000;camera.clearViewOffset();camera.updateProjectionMatrix();realisticRenderer.setInterior(false);lightingForScope();buildingInfo();fitBuilding(false);
}
function enterApartment(walk=true){
  cancelPhoto();stopTour();resetJourney();transition=null;setScopeUI('apartment');house.visible=true;arrival.root.visible=false;development.frame(true);
  controls.minDistance=3;controls.maxDistance=65;camera.far=5000;camera.updateProjectionMatrix();lightingForScope();
  mode='dollhouse';cutPlane.constant=.75;previousHeight=.75;$('#wall-height').value=.75;$('#wall-value').textContent='0.75 m';
  updateSelection(walk?'living':null);setMode(walk?'walk':'dollhouse');
  if(!walk){transition=null;fitHome(false);}
  const v=development.selection;$('#info-tag').textContent=`SECTION ${v.wing} / FLOOR ${v.floor} / ${v.facing.toUpperCase()} FACING`;
}
function chooseApartment(next){
  cancelPhoto();const wasIndoor=scope==='apartment';development.setSelection(next);development.frame(wasIndoor);
  $('#building-floor').value=String(next.floor);$('#building-wing').value=next.wing;$('#building-facing').value=next.facing;$('#lift-floor').value=String(next.floor);
  $('#selection-summary').textContent=`Section ${next.wing} · Floor ${next.floor} · ${next.facing==='north'?'North toward the park and cricket ground':'South toward the nearby buildings'}\nSample layout · Position is adjustable.`;
  renderer.shadowMap.needsUpdate=true;lastRendered='';if(scope==='building')buildingInfo();
}
function setArrivalStage(stage){
  resetJourney();arrival.setStage(stage);$('#call-lift').hidden=stage!=='lobby';$('#approach-lift').hidden=stage!=='lobby';
  $('#lift-floor-label').hidden=stage!=='lift';$('#ride-lift').hidden=stage!=='lift';$('#ride-lift').disabled=false;
  $('#approach-door').hidden=stage!=='corridor';$('#enter-home').hidden=stage!=='corridor';
  $('#arrival-step').textContent={lobby:'01 / ARRIVAL',lift:'02 / THE LIFT',corridor:'03 / YOUR FLOOR'}[stage];
  $('#arrival-title').textContent={lobby:'Welcome to the lobby',lift:'Choose your floor',corridor:`Floor ${development.selection.floor} · Section ${development.selection.wing}`}[stage];
  $('#arrival-description').textContent={lobby:'Walk to the lift using WASD or arrows, or use the button below.',lift:'Take the lift to your selected residential floor.',corridor:'Follow the corridor to your apartment. Press Enter at the door.'}[stage];
  camera.position.set(0,1.6,stage==='lift'?1.5:6.5);yaw=0;pitch=-.04;updateWalkLook();lastRendered='';
}
function startArrival(){
  cancelPhoto();stopTour();transition=null;updateSelection(null);setScopeUI('arrival');mode='walk';house.visible=false;exterior.visible=false;ground.visible=false;arrival.root.visible=true;
  Object.values(overlays).forEach(o=>o.visible=false);mirrorReflections.forEach(r=>r.visible=false);scene.userData.interiorView=true;delete scene.userData.photoRoom;realisticRenderer.setInterior(true);lightingForScope();
  controls.enabled=false;camera.fov=65;camera.clearViewOffset();camera.updateProjectionMatrix();$('#walking').hidden=false;$('#move-pad').hidden=false;
  $('#info-tag').textContent='YOUR ARRIVAL / ILLUSTRATIVE COMMON AREAS';$('#info-name').textContent='From the entrance to your front door';$('#info-desc').textContent='Explore the lobby, ride the lift, and enter your existing apartment model.';$('#info-number').textContent='01';setArrivalStage('lobby');
}
function approach(target){if(journeyMotion||liftTrip)return;keys.clear();yaw=0;pitch=-.04;journeyMotion={start:camera.position.clone(),end:new THREE.Vector3(...target),startTime:performance.now(),duration:2100};}
function updateArrival(){
  if(scope!=='arrival')return;
  if(journeyMotion){let t=Math.min(1,(performance.now()-journeyMotion.startTime)/journeyMotion.duration);t=t*t*(3-2*t);camera.position.lerpVectors(journeyMotion.start,journeyMotion.end,t);updateWalkLook();if(t===1)journeyMotion=null;}
  $('#call-lift').disabled=arrival.stage!=='lobby'||camera.position.z>-6||Math.abs(camera.position.x)>1.7||!!journeyMotion;
  $('#enter-home').disabled=arrival.stage!=='corridor'||camera.position.z>-6||!!journeyMotion;
  if(liftTrip){const t=Math.min(1,(performance.now()-liftTrip.startTime)/liftTrip.duration);if(liftTrip.type==='open'){arrival.openLift(t);lastRendered='';if(t===1)setArrivalStage('lift');}else{liftTrip.display=Math.round(t*liftTrip.floor);$('#lift-progress').textContent=`↑ ${liftTrip.display} / ${liftTrip.floor}`;if(t===1)setArrivalStage('corridor');}}
}
function updateMarker(){
  const el=$('#apartment-marker');if(scope!=='building'){el.hidden=true;return;}
  const center=development.highlight.getWorldPosition(vec);center.z+=development.selection.facing==='north'?-9:9;center.project(camera);
  const visible=center.z>-1&&center.z<1&&Math.abs(center.x)<.95&&Math.abs(center.y)<.85;el.hidden=!visible;
  if(visible){el.style.left=(center.x*.5+.5)*viewport.clientWidth+'px';el.style.top=(-center.y*.5+.5)*viewport.clientHeight+'px';}
}
for(let f=1;f<=development.config.floors;f++){for(const id of ['building-floor','lift-floor']){const option=document.createElement('option');option.value=f;option.textContent=`Floor ${f}`;$(('#'+id)).append(option);}}
for(const wing of 'ABCDEFG'){const option=document.createElement('option');option.value=wing;option.textContent=wing;$('#building-wing').append(option);}
chooseApartment(development.selection);
for(const id of ['building-floor','building-wing','building-facing'])$('#'+id).onchange=()=>chooseApartment({floor:Number($('#building-floor').value),wing:$('#building-wing').value,facing:$('#building-facing').value});
$('#my-apartment').onclick=$('#marker-enter').onclick=()=>enterApartment(true);
$('#choose-floor').onclick=()=>{$('#building-floor').focus();notify('Choose a floor and facing, then select My apartment.');};
$('#building-overview').onclick=$('#return-building').onclick=showBuilding;
$('#area-overview').onclick=()=>{if(scope!=='building')showBuilding();const height=Math.max(370,300/Math.max(.35,camera.aspect));moveCamera([30,height,50.005],[30,0,50]);$('#info-tag').textContent='AREA LAYOUT / CORRECTED LOCATION';$('#info-name').textContent='Ground in front · Buildings behind';$('#info-desc').textContent='Park and cricket ground across the northern lane; nearby societies and Boraspada Road to the south.';};
$('#start-arrival').onclick=startArrival;$('#skip-arrival').onclick=()=>enterApartment(true);
$('#approach-lift').onclick=()=>approach([0,1.6,-6.7]);$('#approach-door').onclick=()=>approach([0,1.6,-6.7]);
$('#call-lift').onclick=()=>{if($('#call-lift').disabled)return;$('#call-lift').disabled=true;for(const id of ['building-floor','building-wing','building-facing','lift-floor'])$('#'+id).disabled=true;liftTrip={type:'open',startTime:performance.now(),duration:800};};
$('#lift-floor').onchange=()=>chooseApartment({...development.selection,floor:Number($('#lift-floor').value)});
$('#ride-lift').onclick=()=>{if(liftTrip)return;keys.clear();$('#ride-lift').disabled=true;for(const id of ['building-floor','building-wing','building-facing','lift-floor'])$('#'+id).disabled=true;$('#lift-progress').hidden=false;liftTrip={type:'ride',floor:development.selection.floor,startTime:performance.now(),duration:2200,display:0};};
$('#enter-home').onclick=()=>{if(!$('#enter-home').disabled)enterApartment(true);};

$('#tour').onclick=()=>{if(tourTimer){stopTour();return;}setMode('dollhouse');tourIndex=0;focusRoom(rooms[tourIndex].id);$('#tour').textContent='Ⅱ Pause room tour';tourTimer=setInterval(()=>{tourIndex++;if(tourIndex>=rooms.length){stopTour();updateSelection(null);fitHome();return;}focusRoom(rooms[tourIndex].id);},4300);};
$('#settings-open').onclick=()=>$('#settings').classList.toggle('open');$('#settings-close').onclick=()=>$('#settings').classList.remove('open');
const refImages={plan:'__PLAN_IMAGE__',interior:'__INTERIOR_IMAGE__',building:'__BUILDING_IMAGE__',location:'__LOCATION_IMAGE__'};$('#reference-btn').onclick=()=>$('#reference').showModal();$('#close-reference').onclick=()=>$('#reference').close();$('#reference').addEventListener('click',e=>{if(e.target===$('#reference')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});$$('[data-ref]').forEach(b=>b.onclick=()=>{$$('[data-ref]').forEach(x=>x.classList.toggle('active',x===b));$('#reference-image').src=refImages[b.dataset.ref];});
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('#snapshot').onclick=()=>{if(!photo.active)realisticRenderer.render();canvas.toBlob(blob=>{if(blob){download(blob,'my-home-3d.png');notify('Your view has been saved.');}});};
$('#download-model').onclick=async()=>{const button=$('#download-model'),wasVisible=furnishing.visible;let exportCopy=null;button.disabled=true;button.textContent='Preparing…';cancelPhoto();try{exporting=true;furnishing.visible=true;architecturalView.setSection(2.8,true);exportCopy=prepareExportModel(house);const raw=await new GLTFExporter().parseAsync(exportCopy.root,{binary:true,onlyVisible:true});const result=await deduplicateGlbImages(raw);download(new Blob([result],{type:'model/gltf-binary'}),'my-home.glb');notify('3D model saved as my-home.glb (units: metres).');}catch(e){console.error(e);notify('Could not export. Please try again.');}finally{exportCopy?.dispose();exporting=false;furnishing.visible=wasVisible;architecturalView.setSection(cutPlane.constant,mode==='walk');renderer.shadowMap.needsUpdate=true;button.disabled=false;button.textContent='↓ 3D file';}};
const raycaster=new THREE.Raycaster();let downPos;canvas.addEventListener('pointerdown',e=>downPos=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(mode==='walk'||!downPos||Math.hypot(e.clientX-downPos[0],e.clientY-downPos[1])>5)return;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);if(scope==='building'){const hit=raycaster.intersectObject(development.highlight,true)[0];if(hit)enterApartment(true);return;}const hit=raycaster.intersectObjects(floorMeshes)[0];if(hit&&rooms.some(r=>r.id===hit.object.userData.room))focusRoom(hit.object.userData.room);});
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;cancelPhoto();renderer.setSize(w,h,false);realisticRenderer.resize(w,h);camera.aspect=w/h;if(w>800&&mode!=='walk'&&scope==='apartment')camera.setViewOffset(w,h,105,0,w,h);else camera.clearViewOffset();camera.updateProjectionMatrix();if(scope==='building'){transition=null;fitBuilding(false);}else if(mode==='dollhouse'&&!selected){transition=null;fitHome(false);}else if(mode==='plan'&&!selected){camera.position.set(7.1,homeDistance(),3.105);controls.target.set(7.1,0,3.1);controls.update();}}new ResizeObserver(resize).observe(viewport);resize();showBuilding();
function animate(){requestAnimationFrame(animate);if(graphicsPaused||exporting)return;const dt=Math.min(clock.getDelta(),.05);
if(mode==='walk'){let forward=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0),side=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);const len=Math.hypot(forward,side)||1;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*dt*1.8/len,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*dt*1.8/len;if(!journeyMotion&&!liftTrip){if(canWalk(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(canWalk(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}updateWalkLook();}
else{if(transition){let t=Math.min(1,(performance.now()-transition.startTime)/transition.duration);t=t*t*(3-2*t);camera.position.lerpVectors(transition.start,transition.end,t);controls.target.lerpVectors(transition.targetStart,transition.targetEnd,t);if(t>=1)transition=null;}controls.update();}
updateArrival();updateMarker();
const changed=architecturalView.setSection(cutPlane.constant,mode==='walk');if(changed)renderer.shadowMap.needsUpdate=true;const signature=[scope,development.selection.floor,development.selection.wing,development.selection.facing,arrival.stage,liftTrip?.display,journeyMotion?.startTime,mode,selected,cutPlane.constant,furnishing.visible,evening,dimensionGroup.visible,$('#labels').checked,viewport.clientWidth,viewport.clientHeight,camera.fov,...camera.position.toArray().map(v=>v.toFixed(5)),...camera.quaternion.toArray().map(v=>v.toFixed(5))].join('|');if(photo.active||changed||signature!==lastRendered){photo.render();lastRendered=signature;}
rooms.forEach(r=>{vec.set(r.label[0],.13,r.label[1]);vec.project(camera);const visible=scope==='apartment'&&$('#labels').checked&&!photo.active&&mode!=='walk'&&vec.z<1&&vec.x>=-1&&vec.x<=1&&vec.y>=-1&&vec.y<=1;r.labelEl.style.display=visible?'block':'none';if(visible){r.labelEl.style.left=(vec.x*.5+.5)*viewport.clientWidth+'px';r.labelEl.style.top=(-vec.y*.5+.5)*viewport.clientHeight+'px';}});
const scale=1/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(controls.target))*viewport.clientHeight;$('.scale').firstChild.textContent=scope==='building'?'10 metres':'1 metre';$('.scale').style.width=Math.max(18,Math.min(120,scale*(scope==='building'?10:1)))+'px';const heading=(mode==='walk'?yaw:Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z))+(scope==='apartment'?development.pose().rotation:0);$('.compass svg').style.transform=`rotate(${THREE.MathUtils.radToDeg(heading)}deg)`;
}
animate();$('#loading').style.opacity=0;setTimeout(()=>$('#loading').remove(),650);window.__home={scene,camera,renderer,rooms,house,walls,walkable,canWalk,get mode(){return mode;},get selected(){return selected;},get wallHeight(){return cutPlane.constant;},get furnitureVisible(){return furnishing.visible;},photo,architecturalView,interior,realisticRenderer,development,arrival,get scope(){return scope;},showBuilding,enterApartment,startArrival,chooseApartment,focusRoom,setMode,setWalkView(position,target){cancelPhoto();transition=null;camera.position.set(...position);const dx=target[0]-position[0],dy=target[1]-position[1],dz=target[2]-position[2];yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));updateWalkLook();},get evening(){return evening;}};
canvas.addEventListener('wheel',cancelPhoto,{passive:true});
controls.addEventListener('start',cancelPhoto);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsPaused=true;photo.disable();notify('Restoring your 3D view…');setTimeout(()=>{try{contextRecovery?.restoreContext();}catch(error){console.warn('Context restoration will be retried by the browser.',error);}},1000);});
canvas.addEventListener('webglcontextrestored',()=>{graphicsPaused=false;lastRendered='';renderer.shadowMap.needsUpdate=true;resize();notify('3D view restored. Photo quality is unavailable on this device.');});

}
init().catch(error=>{console.error(error);const loading=document.querySelector('#loading');loading.style.opacity=1;loading.querySelector('h2').textContent='The model could not load';loading.querySelector('p').textContent='Try a current browser with hardware acceleration enabled. '+error.message;});
