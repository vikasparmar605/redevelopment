import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadScannedAssets(assetUrls) {
 const loader=new GLTFLoader();const names=['modern_arm_chair_01','potted_plant_01','potted_plant_02'];const assets={};
 const results=await Promise.allSettled(names.map(async name=>{const path=`assets/models/${name}/${name}_2k.gltf`;const entry=assetUrls[path];const gltf=entry&&typeof entry==='object'?await loader.parseAsync(JSON.stringify(entry),''):await loader.loadAsync(entry||path);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.scanned=true;}});assets[name]=gltf.scene;}));
 results.forEach((r,i)=>{if(r.status==='rejected')console.warn('Scanned asset unavailable:',names[i],r.reason);});return assets;
}
export function placeScannedAssets(assets,interior) {
 const counts={plants:0,chairs:0};
 function place(source,parent,x,y,z,height,width,rotation=0,planter=false){const g=source.clone(true);const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3());const scale=height?height/size.y:width/size.x;let potTop=bounds.min.y;if(planter){g.traverse(o=>{if(o.isMesh&&/_(pot|pebbles|dirt)(_|$)/i.test(o.name)){const potBounds=new THREE.Box3().setFromObject(o);potTop=Math.max(potTop,potBounds.max.y);o.visible=false;}});}const normalized=new THREE.Group();normalized.name='Scanned '+source.name;normalized.userData.scanned=true;g.position.x-=(bounds.min.x+bounds.max.x)/2;g.position.z-=(bounds.min.z+bounds.max.z)/2;g.position.y-=planter?potTop:bounds.min.y;normalized.add(g);normalized.scale.setScalar(scale);normalized.rotation.y=rotation;normalized.position.set(x,y,z);parent.add(normalized);return normalized;}
 for(const anchor of interior.plantAnchors||[]){const model=anchor.type==='olive'?assets.potted_plant_01:assets.potted_plant_02;if(!model)continue;place(model,anchor.parent,anchor.x,anchor.y||0,anchor.z,anchor.size*1.35,undefined,anchor.rotation||0,anchor.y>.2);counts.plants++;}
 for(const anchor of interior.chairAnchors||[]){if(!assets.modern_arm_chair_01)continue;place(assets.modern_arm_chair_01,anchor.parent,anchor.x,0,anchor.z,undefined,anchor.width||.68,anchor.rotation||0);counts.chairs++;}
 return counts;
}
