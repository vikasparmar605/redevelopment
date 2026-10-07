import * as THREE from 'three';
import location from '../assets/location/neighborhood.json';
import localLayout from '../assets/location/site-layout.json';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Provisional geometry, not an approved site/floor plan. Metres; +X east, +Z south.
export const buildingConfig = Object.freeze({
  latitude:19.216288, longitude:72.817758, sections:7, floors:32,
  sectionWidth:18, depth:24, floorHeight:3, podiumLevels:3, podiumFloorHeight:3.5,
  defaultFloor:20, defaultWing:'D', defaultFacing:'north',
});
const C=buildingConfig, PODIUM=C.podiumLevels*C.podiumFloorHeight, TOP=PODIUM+C.floors*C.floorHeight;
const unitBox=new THREE.BoxGeometry(1,1,1), transform=new THREE.Object3D();
function paint(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.75,...extra});}
function box(parent,mat,x,y,z,w,h,d){const m=new THREE.Mesh(unitBox,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function label(parent,text,x,y,z,width=12,ink='#f7eddd',background='#26382e'){
  const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=ink;ctx.font='500 48px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,82);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;
}
function polygon(points,mat,y=.005,depth=0){
  const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const geo=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);
  const m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;m.castShadow=!!depth;return m;
}
function batches(parent){
  const buckets=new Map(),parts=[];
  return {
    add(mat,x,y,z,w,h,d,key=null,rot=0){
      if(!buckets.has(mat))buckets.set(mat,[]);
      buckets.get(mat).push({x,y,z,w,h,d,key,rot});
    },
    finish(){
      for(const [mat,items]of buckets){const m=new THREE.InstancedMesh(unitBox,mat,items.length);m.castShadow=m.receiveShadow=true;
        items.forEach((v,i)=>{transform.position.set(v.x,v.y,v.z);transform.rotation.set(0,v.rot,0);transform.scale.set(v.w,v.h,v.d);transform.updateMatrix();m.setMatrixAt(i,transform.matrix);if(v.key)parts.push({mesh:m,index:i,key:v.key,matrix:transform.matrix.clone()});});
        m.computeBoundingSphere();parent.add(m);
      }
      return parts;
    }
  };
}
export function apartmentPose(selection){
  const i=selection.wing.charCodeAt(0)-65, center=(i-3)*C.sectionWidth;
  const north=selection.facing==='north';
  const position=new THREE.Vector3(north?center-7.325:center+7.325,PODIUM+(selection.floor-1)*C.floorHeight,north?-10.7:10.7);position.applyAxisAngle(new THREE.Vector3(0,1,0),localLayout.site.rotation);position.x+=localLayout.site.x;position.z+=localLayout.site.z;return {position,rotation:(north?0:Math.PI)+localLayout.site.rotation};
}
export function createDevelopment(scene){
  const root=new THREE.Group();root.name='Charkop redevelopment and mapped surroundings';scene.add(root);
  const neighborhood=new THREE.Group();neighborhood.name='OSM Charkop neighborhood';root.add(neighborhood);
  const building=new THREE.Group();building.name='Proposed building — illustrative';root.add(building);building.position.set(localLayout.site.x,0,localLayout.site.z);building.rotation.y=localLayout.site.rotation;
  const white=paint('#e9e6da'),stone=paint('#c6b9a7'),terracotta=paint('#814838'),dark=paint('#384248'),glass=paint('#46666f',{metalness:.35,roughness:.28}),lit=paint('#81999b',{emissive:'#ffcc83',emissiveIntensity:.03}),rail=paint('#a5b5b0',{metalness:.2}),gold=paint('#b6a079',{metalness:.45}),wood=paint('#77594b');
  const materialSet=[white,stone,terracotta,dark,glass,lit,rail,gold,wood];
  const batch=batches(building);
  // A shared podium and seven equal-height facade sections.
  batch.add(stone,0,PODIUM/2,0,132,PODIUM,28);
  batch.add(dark,0,1.8,14.15,131,3.6,.18);batch.add(dark,0,1.8,-14.15,131,3.6,.18);
  for(let floor=1;floor<=3;floor++){
    const y=floor*3.5;
    batch.add(white,0,y,14.6,134,.32,1.2);batch.add(white,0,y,-14.6,134,.32,1.2);
    if(floor<3)for(let x=-64;x<65;x+=5.1){batch.add(dark,x,y-1.55,14.24,4.5,.56,.16);batch.add(dark,x,y-1.55,-14.24,4.5,.56,.16);}
  }
  for(let x=-61;x<=61;x+=7.2){batch.add(white,x,1.7,14.36,.32,3.4,.38);batch.add(x%2?glass:lit,x+3.3,1.55,14.25,6.2,2.9,.12);batch.add(gold,x+3.3,3.2,14.44,6.1,.38,.22);batch.add(white,x,1.7,-14.36,.32,3.4,.38);batch.add(glass,x+3.3,1.55,-14.25,6.2,2.9,.12);batch.add(gold,x+3.3,3.2,-14.44,6.1,.38,.22);}
  for(let i=0;i<C.sections;i++){
    const center=(i-3)*18;
    for(let f=1;f<=C.floors;f++)for(const facing of ['north','south']){
      const s=facing==='north'?-1:1,y=PODIUM+(f-1)*3, key=`${i}:${f}:${facing}`;
      batch.add(stone,center,y+1.42,s*5.95,15.8,2.84,9.5,key);
      batch.add(dark,center,y+1.45,s*10.77,15.5,2.7,.12,key);
      batch.add(white,center,y,s*11.7,16.25,.20,2.3,key);
      for(let col=0;col<4;col++){
        const x=center-5.75+col*3.82;
        batch.add((f+col+i)%6===0?lit:glass,x,y+1.52,s*10.86,3.12,2.35,.13,key);
        batch.add(white,x,y+.14,s*12.1,3.48,.16,1.28,key);
        batch.add(rail,x,y+.80,s*12.67,3.4,.86,.06,key);
        batch.add(white,x,y+1.26,s*12.69,3.52,.12,.13,key);
        for(const offset of[-1.68,1.68])batch.add(white,x+offset,y+.73,s*12.64,.10,1.22,.16,key);
        batch.add(dark,x,y+1.5,s*10.99,.07,2.45,.08,key);
      }
      // End and recess windows articulate both side elevations.
      for(const side of[-1,1])for(let col=0;col<3;col++){
        batch.add(glass,center+side*8.02,y+1.5,s*(2.1+col*3),.10,1.9,2.1,key);
        batch.add(white,center+side*8.10,y+.48,s*(2.1+col*3),.24,.14,2.35,key);
      }
    }
    for(const side of[-1,1]){
      batch.add(terracotta,center+side*8.35,PODIUM+48,-10.5,.85,96,1.3);batch.add(terracotta,center+side*8.35,PODIUM+48,10.5,.85,96,1.3);
      batch.add(white,center+side*7.81,PODIUM+48,-11.3,.34,96,.55);
      batch.add(white,center+side*7.81,PODIUM+48,11.3,.34,96,.55);
    }
    batch.add(white,center,TOP+.2,0,17,.4,23);
    batch.add(terracotta,center,TOP+1.9,-9.95,15.6,3.2,.75);
    batch.add(terracotta,center,TOP+1.9,9.95,15.6,3.2,.75);
    batch.add(white,center,TOP+3.5,-9.95,16.4,.28,1.05);
    batch.add(white,center,TOP+3.5,9.95,16.4,.28,1.05);
    batch.add(dark,center,TOP+1.15,0,8,1.9,7);
  }
  const parts=batch.finish();
  // Entrance canopy, signage, gardens, and a forecourt.
  box(building,dark,0,4.05,-18,18,.36,9);box(building,gold,-8,1.95,-21,.22,3.9,.22);box(building,gold,8,1.95,-21,.22,3.9,.22);
  label(building,'CHARKOP  /  NEW BEGINNINGS',0,4.85,-14.8,28).rotation.y=Math.PI;
  label(building,'RESIDENTS’ ENTRANCE',0,3.0,-19.2,8).rotation.y=Math.PI;
  label(building,'MAMTA · VEDANT · OM ATHARV · OM SAI DARSHAN',0,9.4,-14.8,58).rotation.y=Math.PI;
  const paving=paint('#bdbeb3'),leaves=paint('#526f4a'),trunk=paint('#6a5846');
  box(building,paving,0,-.04,0,136,.16,36);
  for(const side of[-1,1])for(let i=0;i<5;i++){
    const x=side*(19+i*9.3);box(building,white,x,.43,-20,5,.85,3);box(building,leaves,x,.88,-20,4.7,.18,2.7);
    palm(building,x,-20,0,trunk,leaves,5.5+i%2);
  }
  for(const x of[-61,-43,-25,25,43,61])palm(building,x,-13.3,PODIUM,trunk,leaves,4.5);
  const highlight=new THREE.Mesh(new THREE.BoxGeometry(16.6,2.85,11.2),new THREE.MeshBasicMaterial({color:'#e7b65d',transparent:true,opacity:.12,depthWrite:false,depthTest:false}));
  highlight.name='Selected apartment';highlight.renderOrder=999;building.add(highlight);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(highlight.geometry),new THREE.LineBasicMaterial({color:'#eab85c',depthTest:false,transparent:true,opacity:.95}));edge.renderOrder=1000;highlight.add(edge);
  const selectedLabel=label(building,'YOUR APARTMENT · D / 20',0,0,0,14,'#fff7dd','#3b5744');
  const sky=skyDome(root);
  const mapped=buildNeighborhood(neighborhood);
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  let selection={floor:C.defaultFloor,wing:C.defaultWing,facing:C.defaultFacing},aperture=null;
  function setSelection(next){
    if(!Number.isInteger(next.floor)||next.floor<1||next.floor>C.floors||! /^[A-G]$/.test(next.wing)||!['north','south'].includes(next.facing))throw new Error('Invalid apartment selection');
    selection={...next};const pose=apartmentPose(selection),i=next.wing.charCodeAt(0)-65,s=next.facing==='north'?-1:1;
    highlight.position.set((i-3)*18,pose.position.y+1.45,s*6.2);
    selectedLabel.position.set((i-3)*18,pose.position.y+4.5,s*15.0);selectedLabel.rotation.y=s<0?Math.PI:0;
    // Reuse the label texture; there is no allocation per selection.
    const ctx=selectedLabel.material.map.image.getContext('2d');ctx.fillStyle='#3b5744';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff7dd';ctx.font='500 48px sans-serif';ctx.textAlign='center';ctx.fillText(`YOUR APARTMENT · ${next.wing} / ${next.floor}`,512,82);selectedLabel.material.map.needsUpdate=true;
    setAperture(aperture!==null);
    return pose;
  }
  function setAperture(enabled){
    const wanted=enabled?`${selection.wing.charCodeAt(0)-65}:${selection.floor}:${selection.facing}`:null;
    const touched=new Set();
    for(const p of parts)if(p.key===aperture||p.key===wanted){p.mesh.setMatrixAt(p.index,p.key===wanted?zero:p.matrix);touched.add(p.mesh);}
    for(const m of touched)m.instanceMatrix.needsUpdate=true;
    aperture=wanted;highlight.visible=selectedLabel.visible=!enabled;
  }
  function frame(indoor){
    root.matrixAutoUpdate=false;
    if(indoor){const pose=apartmentPose(selection);root.matrix.compose(pose.position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),pose.rotation),new THREE.Vector3(1,1,1)).invert();}
    else root.matrix.identity();
    root.matrixWorldNeedsUpdate=true;setAperture(indoor);root.updateMatrixWorld(true);
  }
  function setEvening(value){lit.emissiveIntensity=value?.7:.03;glass.emissive.set(value?'#b88753':'#000000');glass.emissiveIntensity=value?.055:0;sky.material.color.set(value?'#46526b':'#ffffff');}
  setSelection(selection);
  return {root,building,neighborhood,highlight,sky,mapped,config:C,get selection(){return {...selection};},get aperture(){return aperture;},setSelection,frame,setEvening,materials:materialSet,pose:()=>apartmentPose(selection)};
}
function skyDome(parent){
  const c=document.createElement('canvas');c.width=8;c.height=256;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#76a5c5');g.addColorStop(.48,'#b7d0de');g.addColorStop(.65,'#e1e6dc');g.addColorStop(1,'#8caa82');ctx.fillStyle=g;ctx.fillRect(0,0,8,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.SphereGeometry(2400,32,16),new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,depthWrite:false,fog:false}));m.position.y=100;m.name='Local sky';parent.add(m);return m;
}
function palm(parent,x,z,base,trunk,leaf,height){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,height,7),trunk);m.position.set(x,base+height/2,z);parent.add(m);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const l=new THREE.Mesh(new THREE.SphereGeometry(1,7,4),leaf);l.scale.set(.43,.17,2.7);l.rotation.set(.24,a,0);l.position.set(x+Math.sin(a)*1.4,base+height,z+Math.cos(a)*1.4);parent.add(l);}
}
function buildNeighborhood(parent){
  const soil=paint('#979782'),mangrove=paint('#3e614a'),water=paint('#596f62',{roughness:.48,metalness:.08}),asphalt=paint('#606362'),footpath=paint('#aaa99b'),groundDirt=paint('#ad9270'),dryGrass=paint('#b5a889'),windows=paint('#50686c',{roughness:.5});
  parent.add(polygon([[-1700,-1700],[1700,-1700],[1700,1700],[-1700,1700]],soil,-.25));
  const near=new THREE.Group(),far=new THREE.Group();near.name='Charkop roads, park and nearby buildings';far.name='Distant mapped context';parent.add(near,far);
  const roadBatch=batches(near),urbanBatch=batches(near),treeBatch=batches(near);
  const random=seed=>{const v=Math.sin(seed*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const inside=(x,z,p)=>{let result=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
  const siteLocal=(x,z)=>{const dx=x-localLayout.site.x,dz=z-localLayout.site.z,a=localLayout.site.rotation;return [Math.cos(a)*dx-Math.sin(a)*dz,Math.sin(a)*dx+Math.cos(a)*dz];};
  const inSite=(x,z)=>{const [a,b]=siteLocal(x,z);return Math.abs(a)<74&&b>-27&&b<21;};
  const occupied=[],roadSegments=[],waterPolygons=[],greenPolygons=[];
  const wallColors=['#d6cdb9','#c8c3b3','#c9c5b9','#b9b7aa','#d4cab7'];const roofColors=['#967f71','#b0aaa0','#8a8f91','#9d7b66','#798f9b'];
  const wallMats=wallColors.map(c=>paint(c)),roofMats=roofColors.map(c=>paint(c));
  const geometryBuckets=new Map();let footprints=0,roadCount=0,areas=0,supplemental=0;
  function queue(m,mat,distant=false){m.updateMatrix();m.geometry.applyMatrix4(m.matrix);const key=`${mat.uuid}:${distant}`;if(!geometryBuckets.has(key))geometryBuckets.set(key,{material:mat,distant,geos:[]});geometryBuckets.get(key).geos.push(m.geometry);}
  function buildingFootprint(p,height,seed,detailed=false,name=''){
    const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length;
    const distant=Math.hypot(cx,cz)>650,mat=wallMats[seed%wallMats.length],roof=roofMats[seed%roofMats.length];
    queue(polygon(p,mat,0,height),mat,distant);queue(polygon(p,roof,height+.02),roof,distant);
    occupied.push({x1:Math.min(...p.map(v=>v[0]))-1,x2:Math.max(...p.map(v=>v[0]))+1,z1:Math.min(...p.map(v=>v[1]))-1,z2:Math.max(...p.map(v=>v[1]))+1});
    if(detailed)for(let i=1;i<p.length;i++){
      const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),count=Math.min(16,Math.floor(length/2.4)),rot=-Math.atan2(dz,dx);
      for(let f=1;f<height/3;f++)for(let col=0;col<count;col++){const s=(col+.5)/count;urbanBatch.add(windows,a[0]+dx*s,f*3-1.25,a[1]+dz*s,1.1,1.4,.11,null,rot);urbanBatch.add(roof,a[0]+dx*s,f*3-.45,a[1]+dz*s,1.28,.12,.35,null,rot);}
      if(height>13)for(let f=1;f<height/3;f++)urbanBatch.add(mat,(a[0]+b[0])/2,f*3-.22,(a[1]+b[1])/2,length,.16,.48,null,rot);
    }
    if(detailed){urbanBatch.add(roof,cx,height+.9,cz,1.7,1.7,1.7);urbanBatch.add(mat,cx+2.4,height+.35,cz,2.5,.7,2.8);}
  }
  function road(points,width,marking=false){
    for(let i=1;i<points.length;i++){
      const [a,b]=[points[i-1],points[i]],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,rot=-Math.atan2(dz,dx);if(length<.1)continue;
      roadSegments.push({a,b,width});if(inSite(x,z))continue;
      roadBatch.add(footpath,x,-.06,z,length+.3,.1,width+1.6,null,rot);roadBatch.add(asphalt,x,.014,z,length+.1,.05,width,null,rot);
      if(marking)for(let t=2;t<length;t+=7)roadBatch.add(dryGrass,a[0]+dx*t/length,.05,a[1]+dz*t/length,3,.02,.10,null,rot);
    }
  }
  for(const f of location.features){
    const {points:p,tags:t}=f;if(p.length<2)continue;
    if(t.natural||t.landuse||t.leisure){
      if(p.length<4||p[0][0]!==p.at(-1)[0]||p[0][1]!==p.at(-1)[1])continue;
      if(f.id===821248092)continue; // The park is dry ground with pitches, not a forest canopy.
      const wet=t.natural==='water'||t.water,green=['wood','wetland','scrub','grassland'].includes(t.natural)||t.landuse==='forest';
      if(wet||green){near.add(polygon(p,wet?water:mangrove,wet?-.08:-.16));(wet?waterPolygons:greenPolygons).push(p);areas++;}
    }
    if(t.highway){const widths={primary:17,secondary:12,tertiary:9,residential:5.5,service:3.2,footway:1.4,path:1.2};road(p,parseFloat(t.width)||widths[t.highway]||4,t.highway==='tertiary');roadCount++;}
    if(t.building&&p.length>=4){
      const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length;if(inSite(cx,cz)||Math.hypot(cx,cz)>1250)continue;
      if(inside(cx,cz,localLayout.park)&&Math.hypot(cx-localLayout.hall[0],cz-localLayout.hall[1])>14)continue;
      // Roof heights close to the site follow the visible low-rise / mid-rise pattern.
      const close=Math.hypot(cx,cz)<350;
      const height=Math.max(3,Math.min(110,parseFloat(t.height)||(parseFloat(t['building:levels'])||(close?((f.id%3)+2):(f.id%5+2)))*3));
      buildingFootprint(p,height,f.id,Math.hypot(cx,cz)<450,t.name);footprints++;
    }
  }
  // User reference: the open park and cricket ground immediately across the northern lane.
  const park=polygon(localLayout.park,groundDirt,.035);park.name='Shree Duttguru Sangharsh Udhyan — open ground';near.add(park);
  const field=polygon(localLayout.cricketGround,dryGrass,.045);field.name='Vishal’s Magic Cricket Academy ground';near.add(field);
  const details=batches(near),chalk=paint('#dfd6bb'),net=paint('#6b7060',{transparent:true,opacity:.48}),brown=paint('#a67956');
  for(const x of[20,53,84]){details.add(brown,x,.060,-31,3.2,.025,18);for(const z of[-39,-23])details.add(chalk,x,.080,z,3.4,.015,.08);}
  // Cricket practice nets in the right-hand part of the ground, as in the screenshot.
  for(let i=0;i<5;i++){const x=106+i*4;for(const z of[-48,-23])details.add(net,x,2.6,z,.06,5.2,.06);details.add(net,x,2.6,-35,.035,5.2,25);details.add(net,x,5.2,-35,.06,.06,25);}
  for(const z of[-48,-23])details.add(net,114,2.6,z,20,5.2,.035);
  details.add(footpath,-18,.05,-20,2.3,.045,52);details.add(footpath,43,.052,-61,118,.035,1.7);
  // The temple hall and small park pavilion are recognizable reference landmarks.
  const hall=[[-53,-8],[-38,-8],[-38,6],[-53,6],[-53,-8]];buildingFootprint(hall,4.2,4,false,'Duttguru hall');
  const pavilion=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,.18,8),paint('#a34f35'));pavilion.position.set(...[localLayout.gazebo[0],3.0,localLayout.gazebo[1]]);near.add(pavilion);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;details.add(wallMats[0],localLayout.gazebo[0]+Math.cos(a)*3.3,1.45,localLayout.gazebo[1]+Math.sin(a)*3.3,.12,2.9,.12);}
  const pavilionFloor=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,.12,8),footpath);pavilionFloor.position.set(localLayout.gazebo[0],.09,localLayout.gazebo[1]);near.add(pavilionFloor);
  // Retain the second row of buildings between the societies and Boraspada Road.
  // OSM has gaps here: footprint placement follows the screenshot, with estimated facade details.
  const rear=[{name:'Ruby Tower',x:-51,z:80,w:24,d:17,h:19},{name:'Yoshodhan Society',x:8,z:77,w:30,d:15,h:15},{name:'Silver Sea View',x:68,z:67,w:29,d:16,h:21},{name:'Shreeji frontage',x:118,z:62,w:26,d:15,h:18}];
  const rect=(x,z,w,d,a=.108)=>{const c=Math.cos(a),s=Math.sin(a);return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]].map(([u,v])=>[x+c*u+s*v,z-s*u+c*v]);};
  const isOccupied=(x,z,pad=0)=>occupied.some(b=>x>b.x1-pad&&x<b.x2+pad&&z>b.z1-pad&&z<b.z2+pad);
  for(let i=0;i<rear.length;i++){const b=rear[i];if(!isOccupied(b.x,b.z,2)){buildingFootprint(rect(b.x,b.z,b.w,b.d),b.h,20+i,true,b.name);supplemental++;}}
  // Fine-grained house clusters at both ends of the redevelopment; varied sheet and tiled roofs.
  for(let i=0;i<260;i++){
    const x=-131+random(i+131)*345,z=24+random(i+583)*59;
    if(inSite(x,z)||inside(x,z,localLayout.park)||isOccupied(x,z,3))continue;
    if(roadSegments.some(r=>distanceToSegment(x,z,r.a,r.b)<r.width/2+2.5))continue;
    const w=4+random(i+788)*5,d=5+random(i+1020)*6,h=3+Math.floor(random(i+1377)*2)*2.6;
    buildingFootprint(rect(x,z,w,d),h,100+i,true);supplemental++;
  }
  // Sidewalk trees and dense mangrove patches, with the cricket ground kept open.
  const patches=[localLayout.westernTrees,localLayout.northernTrees,localLayout.southernTrees,localLayout.easternTrees];
  for(const p of patches)near.add(polygon(p,mangrove,-.10));
  const treePositions=[];const trunk=paint('#5c5840'),crownMaterial=paint('#ffffff',{roughness:1});
  for(let i=0;i<42000;i++){
    const x=-900+random(i+1)*1800,z=-900+random(i+22001)*1700,close=Math.hypot(x,z)<450;if(i>=21000&&!close)continue;
    if(!(close?patches:greenPolygons).some(p=>inside(x,z,p)))continue;
    if(inSite(x,z)||inside(x,z,localLayout.park)||isOccupied(x,z,2)||waterPolygons.some(p=>inside(x,z,p)))continue;
    if(roadSegments.some(r=>distanceToSegment(x,z,r.a,r.b)<r.width/2+2.4))continue;
    const h=4+random(i+43222)*5.6;treePositions.push({x,z,h});treeBatch.add(trunk,x,h*.43,z,.23,h*.86,.23);
  }
  // Shade trees at the park boundary; none obstruct the open playing area.
  for(let i=0;i<42;i++){const x=-24+i*4,z=13-x*.102;const h=5.2+random(i+11811)*2.5;treePositions.push({x,z,h});treeBatch.add(trunk,x,h*.43,z,.24,h*.86,.24);}
  const crownGeometry=new THREE.SphereGeometry(1,9,6),pos=crownGeometry.attributes.position;
  for(let i=0;i<pos.count;i++){const f=1+Math.sin(pos.getX(i)*4+pos.getY(i)*7+pos.getZ(i)*3)*.16;pos.setXYZ(i,pos.getX(i)*f,pos.getY(i)*f,pos.getZ(i)*f);}crownGeometry.computeVertexNormals();
  const crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,treePositions.length*3),color=new THREE.Color();
  treePositions.forEach((p,i)=>{for(let l=0;l<3;l++){const a=(i+l)*2.3;transform.position.set(p.x+Math.cos(a)*p.h*.18,p.h*(.78+l*.07),p.z+Math.sin(a)*p.h*.18);transform.rotation.set(0,i*.3+l,0);transform.scale.set(p.h*.60,p.h*.40,p.h*.60);transform.updateMatrix();crowns.setMatrixAt(i*3+l,transform.matrix);color.setHSL(.29+random(i+l)*.035,.34,.25+random(i+100+l)*.10,THREE.SRGBColorSpace);crowns.setColorAt(i*3+l,color);}});crowns.receiveShadow=true;near.add(crowns);
  // Street activity follows the two real lanes rather than an invented forecourt road.
  const carPaint=['#dddcd0','#a49c8e','#687a81','#9a766b'].map(c=>paint(c));
  for(let i=0;i<28;i++){
    const rear=i%2===0,x=-110+(i%14)*23,z=(rear?104:17)-x*.108+(i%3===0?2.0:-1.7),a=.108;
    details.add(carPaint[i%4],x,.68,z,3.7,.86,1.5,null,a);details.add(windows,x,.98,z,1.9,.60,1.37,null,a);details.add(asphalt,x,.28,z,3.45,.25,1.55,null,a);
  }
  details.finish();roadBatch.finish();urbanBatch.finish();treeBatch.finish();
  for(const {material,distant,geos}of geometryBuckets.values()){if(!geos.length)continue;const m=new THREE.Mesh(mergeGeometries(geos,false),material);m.castShadow=m.receiveShadow=true;(distant?far:near).add(m);geos.forEach(g=>g.dispose());}
  const landmarkGroup=new THREE.Group();landmarkGroup.name='Local landmarks';near.add(landmarkGroup);
  for(const b of localLayout.landmarks){const c=document.createElement('canvas');c.width=1024;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#f8f4e8ed';ctx.fillRect(0,0,1024,100);ctx.font='500 34px sans-serif';ctx.fillStyle='#3d5342';ctx.textAlign='center';ctx.fillText(b.name,512,63);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));sp.position.set(b.x,b.z>40?26:8,b.z);sp.scale.set(b.name.length*.46,2.2,1);sp.userData.viewerHelper=true;landmarkGroup.add(sp);}
  return {roads:roadCount,buildings:footprints,supplementalBuildings:supplemental,landAreas:areas,source:location.source,timestamp:location.osmTimestamp,near,far,landmarks:landmarkGroup,estimatedLandscape:true,layout:localLayout,trees:treePositions.length,treeCenters:treePositions.map(({x,z})=>[x,z])};
}
function distanceToSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;if(length===0)return Math.hypot(x-a[0],z-a[1]);const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}

// Journey uses local coordinates so existing walk/look controls can operate unchanged.
export function createArrival(){
  const root=new THREE.Group();root.name='Illustrative residents’ lobby, lift, corridor';
  const stone=paint('#d9cfbb'),floor=paint('#b8ad98'),dark=paint('#45584c'),wood=paint('#8c6b51'),brass=paint('#bba27b',{metalness:.45}),glass=paint('#88a8ae',{roughness:.28}),white=paint('#f2ebdd');
  const lobby=new THREE.Group(),lift=new THREE.Group(),corridor=new THREE.Group();root.add(lobby,lift,corridor);
  box(lobby,floor,0,-.07,0,12,.14,18);box(lobby,white,0,3.25,0,12,.15,18);
  box(lobby,stone,-6,1.6,0,.2,3.2,18);box(lobby,stone,6,1.6,0,.2,3.2,18);
  box(lobby,dark,0,1.6,-9,12,3.2,.15);
  box(lobby,brass,0,2.86,-8.87,3.2,.14,.2);box(lobby,brass,-1.58,1.4,-8.87,.12,2.8,.2);box(lobby,brass,1.58,1.4,-8.87,.12,2.8,.2);
  const liftDoors=[box(lobby,glass,-.72,1.37,-8.8,1.4,2.7,.10),box(lobby,glass,.72,1.37,-8.8,1.4,2.7,.1)];
  label(lobby,'LIFT  /  RESIDENTIAL FLOORS',0,3.04,-8.78,4.4,'#e9ddc5','#45584c');
  box(lobby,wood,4.2,.55,1,2.4,1.1,3.6);box(lobby,stone,4.2,1.14,1,2.6,.12,3.8);label(lobby,'WELCOME HOME',5.86,2.3,3,3.3);
  for(const z of[0,4]){box(lobby,dark,-4.5,.37,z,2,.7,2.7);box(lobby,stone,-4.5,.8,z,2,.2,2.7);}
  label(lobby,'CHARKOP  /  A NEW CHAPTER',0,2.8,8.9,7);for(const x of[-3,3]){box(lobby,brass,x,3.12,-1,2.5,.055,.12);}
  box(lift,wood,0,1.5,-3,4.2,3,.16);box(lift,glass,-2.1,1.5,0,.16,3,6);box(lift,wood,2.1,1.5,0,.16,3,6);box(lift,floor,0,-.08,0,4.2,.16,6);box(lift,white,0,3,0,4.2,.16,6);box(lift,brass,0,1,-2.87,3.7,.06,.07);label(lift,'YOUR FLOOR IS WAITING',0,2.45,-2.89,3);
  box(corridor,floor,0,-.07,0,3.6,.14,16);box(corridor,white,0,3,0,3.6,.15,16);box(corridor,stone,-1.8,1.5,0,.16,3,16);box(corridor,stone,1.8,1.5,0,.16,3,16);box(corridor,wood,0,1.35,-8,1.2,2.7,.12);box(corridor,brass,0,2.75,-7.88,1.4,.12,.15);label(corridor,'YOUR APARTMENT',0,2.45,-7.89,1.1);
  const light=new THREE.HemisphereLight('#fff7e5','#746453',.65);root.add(light);
  for(const room of [lobby,lift,corridor]){const glow=new THREE.RectAreaLight('#fff0d4',3.2,room===lobby?8:2,room===lobby?10:4);glow.position.set(0,2.94,0);glow.lookAt(0,0,.001);room.add(glow);}
  for(let z=-8;z<=8;z+=1.5){box(lobby,stone,0,.006,z,12,.012,.025);}
  for(let x=-6;x<=6;x+=1.5){box(lobby,stone,x,.006,0,.025,.012,18);}
  for(const [x,z]of [[-4.5,-6],[4.5,6]]){box(lobby,wood,x,.3,z,.7,.6,.7);const foliage=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,1),paint('#647c52'));foliage.position.set(x,1.2,z);foliage.scale.y=1.4;lobby.add(foliage);}
  for(const z of [-5,0,5]){box(corridor,brass,0,2.88,z,1.3,.04,.35);}
  box(corridor,brass,.42,1.12,-7.89,.04,.25,.04);

  let stage='lobby';
  const bounds={lobby:[-5.6,5.6,-8.4,8.6],lift:[-1.8,1.8,-2.65,2.7],corridor:[-1.5,1.5,-7.6,7.6]};
  function setStage(next){if(!bounds[next])throw new Error('Invalid arrival stage');stage=next;lobby.visible=next==='lobby';lift.visible=next==='lift';corridor.visible=next==='corridor';liftDoors.forEach((d,i)=>d.position.x=i?.72:-.72);}
  setStage('lobby');
  return {root,lobby,lift,corridor,setStage,get stage(){return stage;},canWalk(x,z){const [x1,x2,z1,z2]=bounds[stage];if(x<=x1||x>=x2||z<=z1||z>=z2)return false;if(stage==='lobby'&&(x>2.7&&z>-.95&&z<2.95||x<-3.35&&z>-1.5&&z<5.5))return false;return true;},openLift(t){liftDoors[0].position.x=-.72-t*1.35;liftDoors[1].position.x=.72+t*1.35;}};
}
