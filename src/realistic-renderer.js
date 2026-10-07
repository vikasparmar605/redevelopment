import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export function createRealisticRenderer(renderer,scene,camera,environment) {
 const pmrem=new THREE.PMREMGenerator(renderer);const env=environment?pmrem.fromEquirectangular(environment):pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=environment||env.texture;scene.environmentIntensity=.45;
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.samples=renderer.capabilities.maxSamples>=4?4:0;
 const composer=new EffectComposer(renderer,target);const renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);const ao=new GTAOPass(scene,camera,1,1);ao.output=GTAOPass.OUTPUT.Default;ao.blendIntensity=.38;ao.updateGtaoMaterial({radius:.23,distanceExponent:1.5,thickness:.3,scale:1,samples:12});composer.addPass(ao);composer.addPass(new SMAAPass());composer.addPass(new OutputPass());
 return {composer,ao,render(){composer.render();},resize(w,h){composer.setSize(w,h);ao.setSize(w,h);},setInterior(interior){ao.blendIntensity=interior?.34:.38;},setQuality(high){ao.enabled=high;}};
}
export function addExteriorContext(scene,mats){
 const group=new THREE.Group();group.name='Surrounding neighbourhood';group.userData.viewerHelper=true;scene.add(group);group.visible=false;
 const sky=document.createElement('canvas');sky.width=32;sky.height=256;const ctx=sky.getContext('2d'),grad=ctx.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#83b4cb');grad.addColorStop(.6,'#c7d9de');grad.addColorStop(1,'#eef0e5');ctx.fillStyle=grad;ctx.fillRect(0,0,32,256);const t=new THREE.CanvasTexture(sky);t.colorSpace=THREE.SRGBColorSpace;
 const backdropGeometry=new THREE.SphereGeometry(85,32,24);const panoramaUV=backdropGeometry.attributes.uv;for(let i=0;i<panoramaUV.count;i++)panoramaUV.setX(i,1-panoramaUV.getX(i));const backdrop=new THREE.Mesh(backdropGeometry,new THREE.MeshBasicMaterial({map:mats.environment||t,side:THREE.BackSide}));backdrop.position.set(7,0,3);group.add(backdrop);
 const concrete=new THREE.MeshStandardMaterial({color:'#d4d3c7',roughness:.96}),window=new THREE.MeshStandardMaterial({color:'#687e82',roughness:.28,metalness:.35});
 for(const [x,z,w,d,h] of[]){const building=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),concrete);building.position.set(x,h/2-7,z);group.add(building);for(let level=0;level<Math.floor(h/2.7);level++)for(let col=0;col<Math.floor(w/2);col++){const pane=new THREE.Mesh(new THREE.PlaneGeometry(1.17,1.5),window);pane.position.set(x-w/2+1.3+col*2.1,level*2.7-5.5,z+d/2+.012);group.add(pane);const sill=new THREE.Mesh(new THREE.BoxGeometry(1.3,.1,.23),concrete);sill.position.set(pane.position.x,pane.position.y-.78,pane.position.z+.08);group.add(sill);}}
 const lawn=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({color:'#7f9168',roughness:1}));lawn.rotation.x=-Math.PI/2;lawn.position.y=-7.01;return group;
}

export function addMirrorReflections(THREE,mirrors,Reflector) {
 const reflectors=[];let reflecting=false;
 for(const physical of mirrors){physical.geometry.computeBoundingBox();const size=physical.geometry.boundingBox.getSize(new THREE.Vector3());if(size.x<.02||size.y<.02)continue;const r=new Reflector(new THREE.PlaneGeometry(size.x*.99,size.y*.99),{textureWidth:512,textureHeight:512,clipBias:.002,color:new THREE.Color(.5,.5,.5)});const originalRender=r.onBeforeRender;r.onBeforeRender=function(renderer,scene,camera,...args){if(reflecting||scene.overrideMaterial)return;reflecting=true;try{return originalRender.call(this,renderer,scene,camera,...args);}finally{reflecting=false;}};r.name='Interactive mirror reflection';r.position.copy(physical.position);r.position.z+=size.z/2+.002;r.rotation.copy(physical.rotation);r.userData.viewerHelper=true;r.visible=false;physical.parent.add(r);reflectors.push(r);}
 return reflectors;
}

export function configureInteractiveGlass(scene){
 const handled=new Set();scene.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){if(handled.has(material)||!material.isMeshPhysicalMaterial||material.transmission<=0)continue;handled.add(material);material.userData.photoTransmission=material.transmission;material.userData.photoOpacity=material.opacity;material.transmission=0;material.opacity=Math.min(material.opacity,.17);material.transparent=true;material.depthWrite=false;}});
}
