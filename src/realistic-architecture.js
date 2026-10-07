import * as THREE from 'three';

// Real geometry sections work with both rasterization and path tracing.
function sectionGeometry(source, cut) {
 const original = source.index ? source.toNonIndexed() : source;
 const pos=original.attributes.position,norm=original.attributes.normal,uv=original.attributes.uv;
 const pp=[],nn=[],tt=[];
 const read=i=>({p:new THREE.Vector3().fromBufferAttribute(pos,i),n:norm?new THREE.Vector3().fromBufferAttribute(norm,i):new THREE.Vector3(0,1,0),u:uv?new THREE.Vector2().fromBufferAttribute(uv,i):new THREE.Vector2()});
 const mix=(a,b)=>{const t=(cut-a.p.y)/(b.p.y-a.p.y);return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),u:a.u.clone().lerp(b.u,t)};};
 const add=v=>{pp.push(v.p.x,v.p.y,v.p.z);nn.push(v.n.x,v.n.y,v.n.z);tt.push(v.u.x,v.u.y);};
 for(let i=0;i<pos.count;i+=3){const input=[read(i),read(i+1),read(i+2)],out=[];for(let j=0;j<3;j++){const a=input[j],b=input[(j+1)%3];const ia=a.p.y<=cut,ib=b.p.y<=cut;if(ia)out.push(a);if(ia!==ib)out.push(mix(a,b));}for(let j=1;j<out.length-1;j++){add(out[0]);add(out[j]);add(out[j+1]);}}
 source.computeBoundingBox();const b=source.boundingBox;
 // All architectural section meshes are upright rectangular solids.
 if(cut>b.min.y&&cut<b.max.y){const corners=[[b.min.x,b.min.z],[b.min.x,b.max.z],[b.max.x,b.max.z],[b.max.x,b.min.z]];for(const i of[0,1,2,0,2,3]){const [x,z]=corners[i];add({p:new THREE.Vector3(x,cut,z),n:new THREE.Vector3(0,1,0),u:new THREE.Vector2(x,z)});}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nn,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tt,2));g.computeBoundingSphere();if(original!==source)original.dispose();return g;
}
export function refineArchitecture(architecture,house,mats) {
 const infill=(x,y,z,w,h,d,rot=0,mat=mats.wall)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.y=rot;m.castShadow=m.receiveShadow=true;architecture.add(m);return m;};
 // Complete the enclosures around openings before generating section geometry.
 [[0,4.28,.9,-Math.PI/2],[6.5,2.7,.87,0],[9.91,2.7,.82,0],[11.3,2.85,.9,-Math.PI/2],[5.42,4.03,.8,0],[7.21,4.03,.8,0],[8.87,4.03,.84,0]].forEach(([x,z,w,rot])=>infill(x+Math.cos(rot)*w/2,2.51,z-Math.sin(rot)*w/2,w,.58,.18,rot));
 // Close bathroom duct façades around their ventilation windows.
 for(const [x,z] of [[5.3,6.7],[6.95,6.7]]){infill(x+.245,1.85,z,.49,1.9,.18);infill(x+1.405,1.85,z,.49,1.9,.18);infill(x+.825,2.6,z,.67,.4,.18);}
 infill(9.9,1.925,-.3,.5,1.75,.18);infill(11.05,1.925,-.3,.5,1.75,.18);infill(10.475,2.575,-.3,.65,.45,.18);
 infill(10.475,1.7,-.3,.65,1.3,.025,0,mats.glass);
 const sections=[];house.updateMatrixWorld(true);
 architecture.traverse(o=>{if(!o.isMesh)return;const mat=o.material;if(mat.clippingPlanes?.length){const clean=mat.clone();clean.clippingPlanes=[];clean.clipShadows=false;o.material=clean;o.geometry.computeBoundingBox();const world=o.getWorldPosition(new THREE.Vector3());const keepFull=world.z<0||world.x<.12;sections.push({mesh:o,original:o.geometry,bounds:o.geometry.boundingBox.clone(),keepFull});}});
 const ceilings=new THREE.Group();ceilings.name='Interior ceilings';house.add(ceilings);ceilings.visible=false;
 // One continuous roof footprint avoids coplanar seams between adjacent rooms.
 const roofOutline=[[0,-.1],[3.45,-.1],[3.45,-1.03],[9.65,-1.03],[9.65,-.3],[11.3,-.3],[11.3,-1.03],[14.55,-1.03],[14.55,3.94],[12.85,3.94],[12.85,7.3],[8.6,7.3],[8.6,6.7],[5.3,6.7],[5.3,5.5],[0,5.5]];
 const shape=new THREE.Shape();roofOutline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false}),mats.wall.clone());roof.material.clippingPlanes=[];roof.rotation.x=-Math.PI/2;roof.position.y=2.8;roof.castShadow=roof.receiveShadow=true;ceilings.add(roof);
 const hardware=new THREE.Group();hardware.name='Architectural hardware';house.add(hardware);
 const detail=(x,y,z,w,h,d,mat=mats.white)=>{const clean=mat.clone();clean.clippingPlanes=[];const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),clean);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;hardware.add(o);return o;};
 // Reveal headers close window and balcony openings at ceiling height.
 [[1.7,-.1,2.7,0],[4.86,-.1,2.12,0],[7.95,-1.03,2.5,0],[12.9,-1.03,2.4,0],[12.85,5.65,2.2,Math.PI/2]].forEach(([x,z,w,rot])=>{const o=infill(x,2.6,z,w,.4,.18,rot,mats.wall);o.geometry.computeBoundingBox();const clean=o.material.clone();clean.clippingPlanes=[];o.material=clean;sections.push({mesh:o,original:o.geometry,bounds:o.geometry.boundingBox.clone(),keepFull:z<0});});
 // Switches and double sockets adjacent to doorways and beds.
 [[.102,3.55,Math.PI/2],[6.51,1.83,Math.PI/2],[11.41,2.3,Math.PI/2],[8.72,4.53,Math.PI/2],[5.65,2.48,-Math.PI/2]].forEach(([x,z,rot])=>{const plate=detail(x,1.1,z,.08,.12,.016);plate.rotation.y=rot;const key=detail(x+Math.sin(rot)*.012,1.105,z+Math.cos(rot)*.012,.046,.056,.014,mats.trim);key.rotation.y=rot;});
 [[.105,2.1,Math.PI/2],[6.515,.6,Math.PI/2],[14.44,1.92,-Math.PI/2],[12.74,6.43,-Math.PI/2]].forEach(([x,z,rot])=>{const plate=detail(x,.29,z,.13,.08,.015);plate.rotation.y=rot;for(const offset of[-.025,.025])for(const dy of[-.009,.009]){const hole=detail(x+Math.sin(rot)*.01+Math.cos(rot)*offset,.29+dy,z+Math.cos(rot)*.01-Math.sin(rot)*offset,.007,.011,.01,mats.black);hole.rotation.y=rot;}});
 let last=-1;
 function setSection(height,interior=false){if(height===last&&ceilings.visible===interior)return false;last=height;house.updateMatrixWorld(true);for(const s of sections){const worldY=s.mesh.getWorldPosition(new THREE.Vector3()).y,scale=s.mesh.getWorldScale(new THREE.Vector3()).y;const effectiveHeight=(!interior&&s.keepFull)?2.8:height;const local=(effectiveHeight-worldY)/scale;const old=s.mesh.geometry;const visible=local>s.bounds.min.y+.001;s.mesh.visible=visible;if(visible)s.mesh.geometry=local>=s.bounds.max.y-.001?s.original:sectionGeometry(s.original,local);if(old!==s.original&&old!==s.mesh.geometry)old.dispose();}ceilings.visible=interior;hardware.visible=interior||height>2.5;return true;}
 return {ceilings,sections,setSection};
}
