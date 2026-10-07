import * as THREE from 'three';

// Bake UV transforms into a detached export copy so texture pixels can be
// shared across all furniture. This avoids exporting identical maps repeatedly.
export function prepareExportModel(house){
 const root=house.clone(true),textures=new Map(),materials=new Map(),geometries=new Map();
 root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const original=o.material;const maps=Object.entries(original).filter(([,v])=>v?.isTexture);const reference=original.map||original.normalMap||original.roughnessMap;let compatible=!!reference&&!!o.geometry.attributes.uv;
 reference?.updateMatrix();if(reference)for(const [,t]of maps){t.updateMatrix();if(t.channel!==0||!t.matrix.equals(reference.matrix))compatible=false;}
 if(!compatible){if(original.userData.photoTransmission!==undefined){o.material=original.clone();o.material.transmission=original.userData.photoTransmission;o.material.opacity=original.userData.photoOpacity;}return;}
 const key=original.uuid;if(!materials.has(key)){const m=original.clone();m.clippingPlanes=[];if(m.userData.photoTransmission!==undefined){m.transmission=m.userData.photoTransmission;m.opacity=m.userData.photoOpacity;}for(const [field,t]of maps){const textureKey=[t.source.uuid,t.colorSpace,t.flipY,t.wrapS,t.wrapT,t.magFilter,t.minFilter].join(':');if(!textures.has(textureKey)){const copy=t.clone();copy.repeat.set(1,1);copy.offset.set(0,0);copy.rotation=0;copy.center.set(0,0);copy.updateMatrix();textures.set(textureKey,copy);}m[field]=textures.get(textureKey);}materials.set(key,m);}
 const geoKey=o.geometry.uuid+':'+reference.matrix.elements.join(',');if(!geometries.has(geoKey)){const g=o.geometry.clone(),uv=g.attributes.uv,v=new THREE.Vector2();for(let i=0;i<uv.count;i++){v.fromBufferAttribute(uv,i).applyMatrix3(reference.matrix);uv.setXY(i,v.x,v.y);}geometries.set(geoKey,g);}o.geometry=geometries.get(geoKey);o.material=materials.get(key);
 });return {root,dispose(){for(const g of geometries.values())g.dispose();for(const t of textures.values())t.dispose();for(const m of materials.values())m.dispose();}};
}

export async function deduplicateGlbImages(buffer){
 const header=new DataView(buffer),jsonLength=header.getUint32(12,true),decoder=new TextDecoder(),encoder=new TextEncoder();const json=JSON.parse(decoder.decode(new Uint8Array(buffer,20,jsonLength)));const binary=new Uint8Array(buffer,28+jsonLength);if(!json.images?.length)return buffer;
 const imageViews=new Set(json.images.filter(i=>i.bufferView!==undefined).map(i=>i.bufferView)),viewMap=[],newViews=[],chunks=[],hashes=new Map();let total=0;
 async function fingerprint(bytes){if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}let n=2166136261;for(const byte of bytes)n=Math.imul(n^byte,16777619);return bytes.length+':'+(n>>>0);}
 for(let i=0;i<json.bufferViews.length;i++){const view=json.bufferViews[i],bytes=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);let match;
 if(imageViews.has(i)){const key=await fingerprint(bytes);const candidates=hashes.get(key)||[];match=candidates.find(c=>c.bytes.length===bytes.length&&c.bytes.every((value,index)=>value===bytes[index]));if(!match){match={index:newViews.length,bytes};candidates.push(match);hashes.set(key,candidates);}else{viewMap[i]=match.index;continue;}}
 viewMap[i]=newViews.length;newViews.push({...view,byteOffset:total});chunks.push({offset:total,bytes});total+=Math.ceil(bytes.length/4)*4;
 }
 const imageMap=[],images=[],seenImages=new Map();for(let i=0;i<json.images.length;i++){const image=json.images[i];if(image.bufferView===undefined){imageMap[i]=images.length;images.push(image);continue;}const view=viewMap[image.bufferView],key=view+':'+image.mimeType;if(seenImages.has(key)){imageMap[i]=seenImages.get(key);}else{const index=images.length;seenImages.set(key,index);imageMap[i]=index;images.push({...image,bufferView:view});}}
 function rewrite(object){if(!object||typeof object!=='object')return;for(const [key,value]of Object.entries(object)){if(key==='bufferView'&&typeof value==='number')object[key]=viewMap[value];else rewrite(value);}}
 rewrite(json);json.images=images;json.bufferViews=newViews;for(const texture of json.textures||[]){if(texture.source!==undefined)texture.source=imageMap[texture.source];}json.buffers[0].byteLength=total;
 const encoded=encoder.encode(JSON.stringify(json)),jsonPadded=Math.ceil(encoded.length/4)*4;const result=new ArrayBuffer(28+jsonPadded+total),out=new DataView(result),data=new Uint8Array(result);out.setUint32(0,0x46546c67,true);out.setUint32(4,2,true);out.setUint32(8,result.byteLength,true);out.setUint32(12,jsonPadded,true);out.setUint32(16,0x4e4f534a,true);data.fill(32,20,20+jsonPadded);data.set(encoded,20);out.setUint32(20+jsonPadded,total,true);out.setUint32(24+jsonPadded,0x004e4942,true);for(const chunk of chunks)data.set(chunk.bytes,28+jsonPadded+chunk.offset);return result;
}
