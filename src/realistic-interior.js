import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Furnished, full-scale interior. All dimensions are metres. */
export function buildRealisticInterior(THREE, furnishing, mats, options = {}) {
  const colliders = [], lights = [], lamps = [], mirrors = [];
  const plantAnchors = [], chairAnchors = [];
  const showerWalls = [];
  const stats = { sourceMeshes: 0, meshes: 0, triangles: 0, plants: 0 };
  const surfaceCache = new Map();
  let randomSeed = 871;
  const rnd = () => { randomSeed = (randomSeed * 16807) % 2147483647; return (randomSeed - 1) / 2147483646; };
  const clamp = THREE.MathUtils.clamp;
  const tinted = (source, color, extra = {}) => {
    const material = source.clone(); material.color.set(color);
    material.clippingPlanes = null; Object.assign(material, extra); return material;
  };
  const fabricWarm = tinted(mats.cushion, '#d9c9b2');
  const fabricIvory = tinted(mats.linen, '#ede7db');
  const fabricTaupe = tinted(mats.cushion, '#aaa08f');
  const fabricOlive = tinted(mats.sage, '#7b856c');
  const fabricClay = tinted(mats.cushion, '#b58c72');
  const fabricStripe = tinted(mats.linen, '#ddd6c7');
  const knittedOlive = tinted(mats.rug, '#a5ac96', { roughness: .99, sheen: .38, sheenRoughness: .92 });
  const knittedOatmeal = tinted(mats.rug, '#c4b7a3', { roughness: .99, sheen: .30, sheenRoughness: .94 });
  const steel = new THREE.MeshPhysicalMaterial({ color: '#c3c7c5', metalness: 1, roughness: .24 });
  const bronze = tinted(mats.metal, '#806b48', { roughness: .36 });
  const ceramicSand = tinted(mats.ceramic, '#c4b197', { roughness: .54, clearcoat: .08 });
  const ceramicRust = tinted(mats.ceramic, '#9f7960', { roughness: .72, clearcoat: 0 });
  const sheer = tinted(mats.linen, '#fffdf3', { transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false });
  const paper = new THREE.MeshStandardMaterial({ color: '#eee9de', roughness: .93 });
  const bookBrown = new THREE.MeshStandardMaterial({ color: '#7a5c48', roughness: .86 });
  const bookOlive = new THREE.MeshStandardMaterial({ color: '#737762', roughness: .82 });
  const bookCream = new THREE.MeshStandardMaterial({ color: '#d2c4ae', roughness: .92 });
  const blackScreen = new THREE.MeshPhysicalMaterial({ color: '#10191b', roughness: .11, metalness: .25, clearcoat: 1, clearcoatRoughness: .13 });
  const glassSmoke = tinted(mats.glass, '#b5ad97', { opacity: .40, transmission: .48, roughness: .12 });
  const floorGrout = new THREE.MeshStandardMaterial({ color: '#989c94', roughness: 1 });
  const deepWater = new THREE.MeshPhysicalMaterial({ color: '#b9cec6', roughness: .05, transmission: .85, transparent: true, opacity: .35, thickness: .03 });
  const mat = (source, width = 1, height = 1) => {
    if (!source.map && !source.normalMap && !source.roughnessMap) return source;
    const w = Math.round(width * 20) / 20, h = Math.round(height * 20) / 20;
    const key = `${source.uuid}/${w}/${h}`;
    if (!surfaceCache.has(key)) {
      const m = mats.forSurface ? mats.forSurface(source, w, h) : source;
      m.clippingPlanes = null; surfaceCache.set(key, m);
    }
    return surfaceCache.get(key);
  };
  const group = (parent, x = 0, z = 0, rotation = 0, name = '') => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; g.name = name; parent.add(g); return g;
  };
  const mesh = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); stats.sourceMeshes++; return m;
  };
  const box = (parent, x, y, z, w, h, d, material = mats.white, radius = .012) => {
    const geometry=radius>0?new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d);
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    // UV distances are metres, independently on each physical face. A thin
    // table's .06 m edge must never scale the same image across its .86 m top.
    for(let i=0;i<p.count;i++) {
      const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i),ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
      let u,v;
      if(ay>=ax&&ay>=az){u=p.getX(i)+w/2;v=(ny>=0?-p.getZ(i):p.getZ(i))+d/2;}
      else if(ax>=az){u=(nx>=0?-p.getZ(i):p.getZ(i))+d/2;v=p.getY(i)+h/2;}
      else{u=(nz>=0?p.getX(i):-p.getX(i))+w/2;v=p.getY(i)+h/2;}
      uv.setXY(i,u,v);
    }
    uv.needsUpdate=true;
    return mesh(parent,geometry,mat(material,1,1),x,y,z);
  };
  const cyl = (parent, x, y, z, radius, height, material = mats.wood, topRadius = radius, radialSegments = 32) => {
    const geometry=new THREE.CylinderGeometry(topRadius,radius,height,radialSegments,1);
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    const capRadius=Math.max(radius,topRadius);
    for(let i=0;i<p.count;i++) {
      if(Math.abs(n.getY(i))>.999){uv.setXY(i,p.getX(i)+capRadius,(n.getY(i)>=0?-p.getZ(i):p.getZ(i))+capRadius);}
      else {
        // Keep the source U angle, including its two separate seam vertices.
        // At each height the cone's own local radius gives true arc length.
        const angle=uv.getX(i)*Math.PI*2,localRadius=Math.hypot(p.getX(i),p.getZ(i));
        uv.setXY(i,angle*localRadius,p.getY(i)+height/2);
      }
    }
    uv.needsUpdate=true;
    return mesh(parent,geometry,mat(material,1,1),x,y,z);
  };
  const sphere = (parent, x, y, z, radius, material, sx = 1, sy = 1, sz = 1) => {
    const m = mesh(parent, new THREE.SphereGeometry(radius, 28, 16), material, x, y, z); m.scale.set(sx, sy, sz); return m;
  };
  const tube = (parent, points, radius, material, segments = Math.max(16, points.length * 5), closed = false) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
    return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 7, closed), material);
  };
  const rod = (parent, a, b, radius, material = mats.metal) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const m = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 10), material);
    m.position.copy(start.add(end).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  };
  const torus = (parent, x, y, z, radius, thickness, material = mats.metal, rotation = [-Math.PI / 2, 0, 0], arc = Math.PI * 2) => {
    const m = mesh(parent, new THREE.TorusGeometry(radius, thickness, 8, 40, arc), material, x, y, z); m.rotation.set(...rotation); return m;
  };
  const blocker = (x, z, w, d) => colliders.push({ x, z, w, d });

  // A subdivided superellipsoid has rounded, compressed faces instead of a
  // rigid box silhouette. Very small folds break the uniform edge highlights.
  function softGeometry(w, h, d, phase = 0, compression = .025) {
    const geometry = new THREE.SphereGeometry(1, 48, 28);
    const positions = geometry.attributes.position, uvs = geometry.attributes.uv;
    const pow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i);
      const x = pow(px, .35), y = pow(py, .46), z = pow(pz, .35);
      const fold = Math.sin(x * 23 + phase) * Math.sin(z * 16 - phase) * .003;
      const centerDepression = Math.exp(-x * x * 5 - z * z * 5) * compression;
      positions.setXYZ(i, x * w / 2 + Math.sin(z * 19 + phase) * .0025 * Math.abs(x), y * h / 2 + fold - centerDepression * Math.max(0, y), z * d / 2 + Math.sin(x * 22 + phase) * .002 * Math.abs(z));
      // UVs remain continuous around the cushion; textile repeat is in metres.
      uvs.setXY(i, uvs.getX(i), uvs.getY(i));
    }
    geometry.computeVertexNormals(); return geometry;
  }
  function soft(parent, x, y, z, w, h, d, material, phase = 0, compression = .022) {
    return mesh(parent, softGeometry(w, h, d, phase, compression), mat(material, Math.max(w, d), Math.max(h, d)), x, y, z);
  }
  function pillow(parent, x, y, z, w, h, d, material, rotation = [0, 0, 0], phase = 0) {
    const g = group(parent, x, z, rotation[1], 'Sewn soft cushion'); g.position.y = y; g.rotation.x = rotation[0]; g.rotation.z = rotation[2];
    const geometry=new THREE.SphereGeometry(1,48,32),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const sx=p.getX(i),sy=p.getY(i),sz=p.getZ(i);
      const px=Math.sign(sx)*Math.pow(Math.abs(sx),.46),py=Math.sign(sy)*Math.pow(Math.abs(sy),.48),pz=Math.sign(sz)*Math.pow(Math.abs(sz),.53);
      const cornerA=(px+.60)*(px+.60)*8+(py+.60)*(py+.60)*12;
      const cornerB=(px-.72)*(px-.72)*12+(py-.54)*(py-.54)*8;
      const cornerC=(px-.67)*(px-.67)*11+(py+.68)*(py+.68)*11;
      const wrinkle=.0045*Math.sin(px*17+py*9+phase)*(Math.exp(-cornerA)+Math.exp(-cornerB)+Math.exp(-cornerC));
      const center=.005*Math.exp(-px*px*7-py*py*7);
      p.setXYZ(i,px*w/2,py*h/2+Math.sin(px*11+phase)*.0015*(1-Math.abs(py)),pz*d/2+Math.sign(pz)*(wrinkle-center));
    }
    geometry.computeVertexNormals();mesh(g,geometry,mat(material,w,h));
    const points = [];
    // The seam follows the exact neutral-depth section of the soft cushion.
    // An ellipse interpolated through box corners floated above the fabric.
    for (let i=0;i<96;i++) {
      const t=i/96*Math.PI*2,px=Math.cos(t),py=Math.sin(t);
      points.push([Math.sign(px)*Math.pow(Math.abs(px),.46)*(w/2-.001),Math.sign(py)*Math.pow(Math.abs(py),.48)*(h/2-.001),.0005]);
    }
    tube(g, points, .0010, material, 144, true);
    return g;
  }
  function cloth(parent, x, y, z, w, d, material, { sag = .12, foot = .13, phase = 0, segmentsX = 54, segmentsZ = 50, thickness = .015 } = {}) {
    const onBed=parent.name.includes('bedroom bed'),duvet=onBed&&d>1.3,folded=onBed&&d<.4;
    // Bed sheets share the real mattress boundary, rather than beginning an
    // arbitrary sag at 78% of the cloth width. Source coordinates measure the
    // textile's available length before it wraps over that support boundary.
    const supportHalf=onBed?(w-(duvet?.21:folded?.105:.245))/2:w*.39;
    const supportFoot=onBed?1.00-z:d*.39;
    const bendRadius=folded?.050:clamp(thickness*1.5+.007,.023,.035);
    const quarterArc=bendRadius*Math.PI/2;
    const samples=(min,max,count,inserts)=>{
      const values=Array.from({length:count+1},(_,i)=>min+(max-min)*i/count);
      for(const value of inserts)if(value>min+.00001&&value<max-.00001)values.push(value);
      return [...new Set(values.map(value=>Math.round(value*1e6)/1e6))].sort((a,b)=>a-b);
    };
    const edgeDistances=[0,.25,.5,.75,1].map(t=>t*quarterArc);
    const xSamples=samples(-w/2,w/2,segmentsX,edgeDistances.flatMap(s=>[-supportHalf-s,supportHalf+s]));
    const zSamples=samples(-d/2,d/2,segmentsZ,edgeDistances.map(s=>supportFoot+s));
    segmentsX=xSamples.length-1;segmentsZ=zSamples.length-1;
    const geometry = new THREE.PlaneGeometry(w, d, segmentsX, segmentsZ);
    const p = geometry.attributes.position,uv=geometry.attributes.uv;
    const hash=n=>{const value=Math.sin(n*127.17+phase*53.73)*43758.5453;return value-Math.floor(value);};
    const folds=Array.from({length:6},(_,i)=>({
      x:(hash(i*7+1)-.5)*w*.76,z:(hash(i*7+2)-.5)*d*.76,
      width:.027+hash(i*7+3)*.024,length:.105+hash(i*7+4)*Math.min(.26,d*.38),
      amp:.0028+hash(i*7+5)*.0039,angle:(hash(i*7+6)-.5)*1.36,
      bend:(hash(i*7+7)-.5)*.045
    }));
    const drape=(distance)=>{
      if(distance<=0)return {spread:distance,drop:0};
      if(distance<=quarterArc){const angle=distance/bendRadius;return {spread:bendRadius*Math.sin(angle),drop:bendRadius*(1-Math.cos(angle))};}
      return {spread:bendRadius,drop:bendRadius+distance-quarterArc};
    };
    const restingHeight=onBed?(duvet?-.021:folded?-.023:-.020):0;
    for (let i = 0; i < p.count; i++) {
      const px=xSamples[i%(segmentsX+1)],pz=zSamples[Math.floor(i/(segmentsX+1))];
      const sideLength=Math.max(0,Math.abs(px)-supportHalf),footLength=Math.max(0,pz-supportFoot);
      const side=drape(sideLength),end=drape(footLength);
      let crease=0;
      for(const f of folds){
        const dx=px-f.x,dz=pz-f.z,c=Math.cos(f.angle),s=Math.sin(f.angle);
        const along=dx*s+dz*c,across=dx*c-dz*s-f.bend*along*along;
        const transverse=across/f.width,longitudinal=along/f.length;
        crease+=f.amp*Math.exp(-transverse*transverse*1.75-longitudinal*longitudinal*2.8);
      }
      const edgeDamping=Math.exp(-(sideLength+footLength)*13);
      const loftZ=(pz+.07)/.75;
      const loft=duvet?.0028*Math.max(0,1-(px/supportHalf)**2)*Math.exp(-loftZ*loftZ):0;
      // Combine the two corner hangs smoothly. Their drop remains shorter
      // than the available diagonal cloth length, avoiding pointed flaps.
      const drop=Math.pow(side.drop**4+end.drop**4,.25);
      const outX=sideLength>0?Math.sign(px)*(supportHalf+side.spread):px;
      const outZ=footLength>0?supportFoot+end.spread:pz;
      p.setXYZ(i,outX,restingHeight+crease*edgeDamping+loft-drop,outZ);
      uv.setXY(i,px/w+.5,.5-pz/d);
    }
    geometry.computeVertexNormals();
    // The duvet and woven throw have a backed, sealed textile edge. This is
    // deliberately subtle: a 15 mm soft shell rather than paper-thin sheets.
    const backing=geometry.clone(),bp=backing.attributes.position,bi=backing.index.array;
    for(let i=0;i<bp.count;i++)bp.setY(i,bp.getY(i)-thickness);
    for(let i=0;i<bi.length;i+=3){const swap=bi[i+1];bi[i+1]=bi[i+2];bi[i+2]=swap;}
    backing.computeVertexNormals();
    const edge=[];
    for(let i=0;i<=segmentsX;i++)edge.push(i);
    for(let j=1;j<=segmentsZ;j++)edge.push(j*(segmentsX+1)+segmentsX);
    for(let i=segmentsX-1;i>=0;i--)edge.push(segmentsZ*(segmentsX+1)+i);
    for(let j=segmentsZ-1;j>0;j--)edge.push(j*(segmentsX+1));
    const vertices=[],uvs=[];
    const push=(index,below,u,v)=>{vertices.push(p.getX(index),p.getY(index)-(below?thickness:0),p.getZ(index));uvs.push(u,v);};
    for(let i=0;i<edge.length;i++){
      const a=edge[i],b=edge[(i+1)%edge.length],u=i/edge.length,v=(i+1)/edge.length;
      push(a,false,u,1);push(b,true,v,0);push(a,true,u,0);push(a,false,u,1);push(b,false,v,1);push(b,true,v,0);
    }
    const hem=new THREE.BufferGeometry();hem.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));hem.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));hem.computeVertexNormals();
    const sealed=mergeGeometries([geometry.toNonIndexed(),backing.toNonIndexed(),hem],false);
    geometry.dispose();backing.dispose();hem.dispose();
    const m = mesh(parent, sealed, mat(material, w, d), x, y, z); m.material.side = THREE.DoubleSide;
    return m;
  }
  function rug(parent, x, z, w, d, color = mats.rug) {
    box(parent, x, .011, z, w, .017, d, color, .008);
    const binding = tinted(color, '#c8bdab');
    for (const s of [-1, 1]) {
      box(parent, x + s * (w / 2 - .014), .022, z, .02, .008, d - .03, binding, .003);
      box(parent, x, .022, z + s * (d / 2 - .018), w - .025, .008, .025, binding, .003);
    }
    for (let i = 0; i < Math.floor(w / .026); i++) for (const s of [-1, 1])
      rod(parent, [x - w / 2 + .02 + i * .026, .017, z + s * d / 2], [x - w / 2 + .022 + i * .026, .012, z + s * (d / 2 + .025)], .0014, color);
  }
  function book(parent, x, y, z, w, d, h, cover, rotation = 0) {
    const g = group(parent, x, z, rotation, 'Cloth bound book'); g.position.y = y;
    box(g, 0, 0, 0, w - .008, h, d - .012, paper, .001);
    box(g, 0, -h / 2, 0, w, .004, d, cover, .001); box(g, 0, h / 2, 0, w, .004, d, cover, .001);
    box(g, -w / 2 + .002, 0, 0, .006, h, d, cover, .001);
    for (let i = 1; i < 5; i++) box(g, w / 2 - .002, -h / 2 + h * i / 5, 0, .001, .001, d - .014, bookCream, 0);
    return g;
  }
  function bowl(parent, x, y, z, radius, height, material = mats.ceramic) {
    const points = [new THREE.Vector2(0, .006), new THREE.Vector2(radius * .25, .006), new THREE.Vector2(radius * .65, height * .14), new THREE.Vector2(radius * .9, height * .55), new THREE.Vector2(radius, height), new THREE.Vector2(radius - .008, height), new THREE.Vector2(radius * .85, height * .5), new THREE.Vector2(radius * .58, height * .18), new THREE.Vector2(0, height * .11)];
    return mesh(parent, new THREE.LatheGeometry(points, 48), material, x, y, z);
  }
  function mug(parent, x, y, z, material = mats.ceramic) {
    const p = [[0,0],[.033,0],[.038,.012],[.039,.084],[.035,.086],[.033,.017],[0,.013]].map(([a,b]) => new THREE.Vector2(a,b));
    mesh(parent, new THREE.LatheGeometry(p, 28), material, x, y, z);
    torus(parent, x + .049, y + .043, z, .025, .006, material, [0, 0, 0]);
  }
  function vase(parent, x, y, z, radius = .10, height = .25, material = ceramicSand) {
    const profile = [[0,0],[radius*.65,0],[radius*.88,height*.05],[radius,height*.35],[radius*.88,height*.67],[radius*.45,height*.90],[radius*.44,height],[radius*.35,height],[radius*.35,height*.92],[radius*.77,height*.63],[radius*.84,height*.32],[radius*.6,height*.08],[0,height*.08]].map(([a,b]) => new THREE.Vector2(a,b));
    return mesh(parent, new THREE.LatheGeometry(profile, 36), material, x, y, z);
  }

  // Leaves are curved blade meshes with a raised central vein, attached to
  // real stems. No spherical foliage or uniformly spaced leaf blobs.
  function leafGeometry(length, width, curvature = .05, pointed = true) {
    const geometry = new THREE.PlaneGeometry(width, length, 6, 10), p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) / width + .5) * 2 - 1, t = clamp(p.getY(i) / length + .5, 0, 1);
      const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), pointed ? .72 : .42);
      p.setXYZ(i, u * width * .5 * envelope, t * length, curvature * Math.sin(Math.PI * t) + width * .18 * Math.abs(u) * Math.sin(Math.PI * t));
    }
    geometry.computeVertexNormals(); return geometry;
  }
  function plant(parent, x, z, size = .65, type = 'broad', baseY = 0, potMaterial = ceramicSand) {
    stats.plants++; const g = group(parent, x, z, 0, `${type} leaf houseplant`); g.position.y = baseY;
    if(options.scannedPlants){plantAnchors.push({parent,x,y:baseY,z,size,type});return g;}
    const potH = size * .34, potR = size * .23;
    const profile = [[0,0],[potR*.70,0],[potR*.76,.018],[potR*.96,potH*.91],[potR,potH],[potR*.84,potH],[potR*.8,potH*.86],[potR*.67,.035],[0,.035]].map(([a,b]) => new THREE.Vector2(a,b));
    mesh(g, new THREE.LatheGeometry(profile, 32), potMaterial);
    cyl(g, 0, potH - .022, 0, potR * .82, .012, mats.soil);
    if (type === 'olive') {
      tube(g,[[0,potH,0],[.012,size*.87,-.006],[.024,size*1.43,-.012],[.018,size*1.89,-.008]],.010,bookBrown,22);
      for (let i = 0; i < 13; i++) {
        const angle=i*2.39+.18*rnd(),level=size*(.64+i/13*1.13),reach=size*(.23+rnd()*.23)*(i>9?.72:1);
        const end=[Math.cos(angle)*reach,level+size*.19,Math.sin(angle)*reach];
        rod(g,[.016,level-size*.13,-.01],end,.0038,bookBrown);
        for(let twig=0;twig<3;twig++) {
          const t=.44+twig*.25,base=[end[0]*t,level+(end[1]-level)*t,end[2]*t];
          const twigAngle=angle+(twig%2?-.69:.63),twigLength=size*(.20+rnd()*.08);
          const tip=[base[0]+Math.cos(twigAngle)*twigLength,base[1]+size*.07,base[2]+Math.sin(twigAngle)*twigLength];
          rod(g,base,tip,.0018,bookBrown);
          for(let j=0;j<4;j++)for(const side of[-1,1]) {
            const q=.16+j*.235,leaf=mesh(g,leafGeometry(size*(.13+rnd()*.035),size*.039,.008,false),j%3?mats.leaves:mats.leaves2,base[0]+(tip[0]-base[0])*q,base[1]+(tip[1]-base[1])*q,base[2]+(tip[2]-base[2])*q);
            leaf.rotation.set(.9+side*.18,twigAngle+side*1.08,.52*side);leaf.castShadow=true;
          }
        }
      }
    } else if (type === 'grass') {
      for (let i = 0; i < 34; i++) {
        const angle = i * 2.399, spread = size * (.08 + rnd() * .17);
        const blade = mesh(g, leafGeometry(size*(.65+rnd()*.55),size*.032,size*.18,true), i%3 ? mats.leaves : mats.leaves2, Math.cos(angle)*spread*.35,potH-.01,Math.sin(angle)*spread*.35);
        blade.rotation.set(Math.cos(angle)*.22,angle,Math.sin(angle)*.22);
      }
    } else {
      for (let i=0;i<15;i++) {
        const angle = i*2.399, reach = size*(.18+rnd()*.18), y = potH + size*(.20+rnd()*.58);
        const end = [Math.cos(angle)*reach,y,Math.sin(angle)*reach];
        tube(g, [[0,potH-.03,0],[end[0]*.3,y*.76,end[2]*.3],end], .0045, mats.leaves, 16);
        const blade = mesh(g,leafGeometry(size*(.27+rnd()*.1),size*(.13+rnd()*.04),size*.04),i%3?mats.leaves:mats.leaves2,...end);
        blade.rotation.set(.65+Math.cos(angle)*.5,angle,-.2+Math.sin(angle)*.35);
      }
    }
    return g;
  }
  function smallBranch(parent,x,y,z,height=.35) {
    rod(parent,[x,y,z],[x+.02,y+height,z-.01],.0035,bookBrown);
    for (let i=0;i<7;i++) {
      const angle=i*2.4, py=y+height*(.2+i*.105), leaf=mesh(parent,leafGeometry(.09,.032,.012,false),i%2?mats.leaves:mats.leaves2,x+.018,py,z);
      leaf.rotation.set(.7,angle,.6);
    }
  }
  function addLight(parent, x, y, z, power = 24, color = '#ffd7a1', distance = 6) {
    const l = new THREE.PointLight(color, 0, distance, 2); l.position.set(x,y,z); l.userData.baseIntensity=power; l.baseIntensity=power; parent.add(l); lights.push(l); return l;
  }
  function glow(parent, geometry, x, y, z, name='Lamp diffuser') {
    const material = mats.emissive.clone(); material.emissiveIntensity=.035; material.userData.dayEmissive=.035; material.userData.eveningEmissive=3;
    const m=mesh(parent,geometry,material,x,y,z);m.name=name;m.castShadow=false;m.userData.keepSeparate=true;lamps.push(m);return m;
  }
  function tableLamp(parent,x,z,y=.5,style='ceramic') {
    const g=group(parent,x,z,0,'Warm bedside lamp');g.position.y=y;
    cyl(g,0,.015,0,.10,.025,bronze);
    if(style==='ceramic') {
      const p=[[0,0],[.075,0],[.095,.05],[.085,.14],[.045,.23],[.035,.27]].map(([a,b])=>new THREE.Vector2(a,b));
      mesh(g,new THREE.LatheGeometry(p,32),ceramicSand,0,.02,0);
    } else {
      rod(g,[0,.025,0],[0,.29,0],.014,bronze);sphere(g,0,.11,0,.065,bronze,1,1.4,1);
    }
    const shade = mesh(g,new THREE.CylinderGeometry(.115,.175,.21,48,1,true),mat(fabricIvory,1,.21),0,.35,0);shade.material.side=THREE.DoubleSide;
    torus(g,0,.455,0,.115,.002,bronze);torus(g,0,.245,0,.175,.002,bronze);
    glow(g,new THREE.SphereGeometry(.035,16,12),0,.34,0);addLight(g,0,.33,0,13,'#ffd7a1',4);
    return g;
  }
  function ceilingPendant(parent,x,z,y=2.14,style='linen',scale=1) {
    const g=group(parent,x,z,0,'Pendant light');
    cyl(g,0,2.73,0,.07,.035,mats.black);
    rod(g,[0,2.74,0],[0,y+.19*scale,0],.003,mats.black);
    if(style==='linen') {
      const radius=.25*scale,h=.23*scale;
      const shade=mesh(g,new THREE.CylinderGeometry(radius*.89,radius,h,64,1,true),mat(fabricIvory,radius*6.3,h),0,y,0);shade.material.side=THREE.DoubleSide;
      torus(g,0,y-h/2,0,radius,.003,bronze);torus(g,0,y+h/2,0,radius*.89,.003,bronze);
      glow(g,new THREE.CircleGeometry(radius*.94,48),0,y-h/2+.006,0).rotation.x=Math.PI/2;
      addLight(g,0,y-h/2-.01,0,40,'#ffd8a5',8);
    } else {
      const radius=.21*scale;
      const s=mesh(g,new THREE.SphereGeometry(radius,48,28,0,Math.PI*2,0,Math.PI*.58),bronze,0,y,0);s.scale.y=.57;
      glow(g,new THREE.CircleGeometry(radius*.92,48),0,y-.022,0).rotation.x=Math.PI/2;
      addLight(g,0,y-.08,0,34,'#ffd8a5',7);
    }
    return g;
  }
  function curtain(parent,x,z,width,rotation=0,style='ivory') {
    const g=group(parent,x,z,rotation,'Pleated floor-length curtains');
    const fabric=style==='sage'?fabricOlive:style==='taupe'?fabricTaupe:fabricIvory;
    rod(g,[-width/2-.16,2.62,.14],[width/2+.16,2.62,.14],.011,bronze);
    for(const s of[-1,1]) sphere(g,s*(width/2+.185),2.62,.14,.024,bronze);
    const panel=(px,pw,material,wave=.038,phase=0)=>{
      const geo=new THREE.PlaneGeometry(pw,2.47,Math.max(24,Math.round(pw*120)),65),p=geo.attributes.position;
      for(let i=0;i<p.count;i++) {
        const vx=p.getX(i),vy=p.getY(i),t=(vy+1.235)/2.47;
        const depth=wave*Math.sin(vx*83+phase)+wave*.18*Math.sin(vx*166+phase);
        p.setXYZ(i,vx+.011*Math.sin(vy*3)*Math.sin(vx*8),vy+.006*Math.sin(vx*41)*(1-t),depth+.006*Math.sin(vy*8+vx*6));
      }
      geo.computeVertexNormals();const m=mesh(g,geo,mat(material,pw,2.47),px,1.30,.20);m.material.side=THREE.DoubleSide;
      for(let i=0;i<9;i++) torus(g,px-pw/2+(i+.5)*pw/9,2.575,.14,.012,.002,bronze,[0,Math.PI/2,0]);
      // Hem and top band follow the same pleats; visible at eye level.
      const hem=[];for(let i=0;i<=36;i++){const vx=-pw/2+pw*i/36;hem.push([px+vx,.085,.2+wave*Math.sin(vx*83+phase)]);}tube(g,hem,.003,material,90);
      return m;
    };
    panel(0,width*.99,sheer,.018,.9);
    const stackWidth=.40+width*.055;
    panel(-width/2+.12,stackWidth,fabric,.043,.2);panel(width/2-.12,stackWidth,fabric,.043,1.1);
  }
  function art(parent,x,z,w=.72,h=.87,rotation=0,theme='olive',y=1.64) {
    const g=group(parent,x,z,rotation,'Framed art');g.position.y=y;
    box(g,0,0,0,w,h,.037,mats.darkwood,.007);box(g,0,0,.020,w-.039,h-.039,.010,paper,.002);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*h/w);const ctx=canvas.getContext('2d');
    ctx.fillStyle='#e9e3d7';ctx.fillRect(0,0,canvas.width,canvas.height);
    const palette=theme==='clay'?['#ad8170','#c4a894','#7c7962']:['#77816a','#aaa990','#c0b49c'];
    ctx.fillStyle=palette[0];ctx.beginPath();ctx.ellipse(245,canvas.height*.48,140,canvas.height*.32,-.17,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=palette[1];ctx.beginPath();ctx.moveTo(45,canvas.height*.74);ctx.bezierCurveTo(100,canvas.height*.35,210,canvas.height*.86,425,canvas.height*.53);ctx.lineTo(440,canvas.height*.93);ctx.lineTo(55,canvas.height*.93);ctx.closePath();ctx.fill();
    ctx.strokeStyle=palette[2];ctx.lineWidth=2;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(120+i*15,canvas.height*.87);ctx.bezierCurveTo(105+i*20,canvas.height*.46,345+i*8,canvas.height*.6,380,canvas.height*.15+i*8);ctx.stroke();}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
    mesh(g,new THREE.PlaneGeometry(w-.09,h-.09),new THREE.MeshStandardMaterial({map:t,roughness:.93}),0,0,.028);
    return g;
  }
  function cabinet(parent,x,z,w,d=.57,rotation=0,style='oak',h=2.42) {
    const g=group(parent,x,z,rotation,'Fitted wardrobe');const timber=style==='white'?mats.white:mats.wood;
    box(g,0,h/2,0,w,h,d,timber,.010);box(g,0,.035,0,w-.06,.07,d-.035,mats.darkwood,.006);
    const count=Math.max(2,Math.round(w/.52));
    for(let i=0;i<count;i++) {
      const cx=-w/2+(i+.5)*w/count;
      box(g,cx,h/2+.005,-d/2-.016,w/count-.012,h-.10,.033,timber,.005);
      rod(g,[cx+w/count*.30,1.06,-d/2-.047],[cx+w/count*.30,1.35,-d/2-.047],.006,bronze);
    }
    return g;
  }

  const living=group(furnishing,0,0,0,'Living and dining — soft ivory and oak');
  rug(living,1.83,1.55,2.14,2.72);
  // Upholstered sectional on slim recessed feet, deeply rounded armrests and
  // loose cushions. The chaise turns into the room beside the dining space.
  const sofa=group(living,.64,1.54,0,'Ivory linen sectional sofa');
  for(const x of[-.33,.28])for(const z of[-1.08,.98]) cyl(sofa,x,.09,z,.022,.18,mats.darkwood);
  for(const x of[.64,1.19]) cyl(sofa,x,.09,1.1,.022,.18,mats.darkwood);
  soft(sofa,0,.255,0,.91,.30,2.54,fabricWarm,2,.004);
  soft(sofa,.53,.255,1.01,1.72,.30,.78,fabricWarm,1,.006);
  soft(sofa,-.37,.56,-.03,.24,.71,2.49,fabricIvory,3,.001);
  soft(sofa,.01,.48,-1.20,.96,.48,.21,fabricIvory,1,.002);
  soft(sofa,.55,.56,1.31,1.82,.69,.21,fabricIvory,2,.002);
  soft(sofa,1.30,.46,1.03,.19,.48,.73,fabricIvory,2,.001);
  for(let i=0;i<3;i++) {
    const zz=-.83+i*.72;soft(sofa,.03,.47,zz,.74,.23,.71,fabricIvory,i,.035);
    const back=soft(sofa,-.21,.725,zz,.19,.46,.74,fabricIvory,i,.021);back.rotation.z=-.15;
    tube(sofa,[[.36,.477,zz-.29],[.398,.48,zz-.2],[.398,.479,zz+.2],[.36,.477,zz+.30]],.0018,fabricWarm,32);
  }
  soft(sofa,.86,.475,1.02,.73,.225,.66,fabricIvory,3,.027);
  const returnBack=soft(sofa,.86,.73,1.19,.75,.45,.19,fabricIvory,4,.014);returnBack.rotation.x=.12;
  pillow(sofa,-.03,.76,-.91,.42,.39,.15,fabricOlive,[.07,Math.PI/2,-.14],1);
  pillow(sofa,.03,.72,-.61,.33,.30,.12,fabricStripe,[.17,Math.PI/2,.06],2);
  pillow(sofa,.14,.74,.57,.40,.37,.15,fabricClay,[-.08,Math.PI/2,-.18],3);
  pillow(sofa,.84,.75,1.05,.41,.38,.15,fabricWarm,[-.15,0,.15],2);
  const throwCloth=cloth(sofa,.95,.611,1.04,.52,.91,knittedOlive,{sag:.10,foot:.22,phase:3});throwCloth.rotation.y=.16;
  for(let i=0;i<19;i++) rod(sofa,[.67+i*.027,.391,1.51],[.67+i*.027,.337,1.53],.0016,knittedOlive);
  blocker(.14,.29,1.00,2.56);blocker(.62,2.23,1.43,.72);
  // Low oval timber and stone coffee table: beveled rim, turned pedestal.
  const coffee=group(living,1.90,1.50,0,'Oval oak coffee table');
  const top=cyl(coffee,0,.39,0,.48,.045,mats.wood);top.scale.z=.68;
  const edge=cyl(coffee,0,.366,0,.463,.025,mats.darkwood);edge.scale.z=.69;
  for(const x of[-.25,.25]) {const leg=cyl(coffee,x,.185,0,.115,.34,mats.wood,.10);leg.scale.z=.8;}
  book(coffee,.12,.431,.05,.21,.26,.023,bookCream,.16);book(coffee,.10,.458,.035,.20,.25,.027,bookOlive,-.03);
  bowl(coffee,-.17,.417,-.035,.103,.06,ceramicSand);sphere(coffee,-.145,.45,-.047,.030,bookBrown);
  mug(coffee,-.14,.417,.16,ceramicRust);blocker(1.43,1.16,.93,.67);
  // Low wall-mounted media console with oak louvers and a dark reflective TV.
  box(living,3.14,.245,1.40,.31,.36,2.13,mats.wood,.016);
  box(living,3.13,.43,1.40,.34,.031,2.18,mats.wood,.009);
  for(let i=0;i<54;i++) box(living,2.978,.247,.355+i*.0388,.026,.31,.018,mats.darkwood,.003);
  box(living,3.282,1.18,1.4,.038,.87,1.51,mats.black,.020);
  box(living,3.255,1.18,1.4,.011,.816,1.445,blackScreen,.012);
  box(living,3.242,.770,1.40,.008,.008,.032,steel,.001);
  for(const zz of[.72,2.03]) box(living,3.10,.467,zz,.13,.032,.24,mats.black,.010);
  vase(living,3.12,.45,.56,.062,.15,ceramicSand);smallBranch(living,3.12,.59,.56,.22);
  book(living,3.12,.46,2.12,.21,.25,.03,bookBrown,Math.PI/2);
  blocker(2.97,.32,.35,2.15);
  // Contemporary dining table and six curved upholstered timber chairs.
  const dining=group(living,3.35,4.58,0,'Six-seat oak dining setting');
  box(dining,0,.748,0,1.72,.062,.86,mats.wood,.055);
  box(dining,0,.68,0,1.53,.09,.66,mats.darkwood,.012);
  for(const x of[-.63,.63])for(const z of[-.28,.28]) {
    const leg=box(dining,x,.357,z,.065,.715,.065,mats.wood,.011);leg.rotation.z=-Math.sign(x)*.075;leg.rotation.x=Math.sign(z)*.045;
  }
  function chair(parent,x,z,rotation=0,style='linen') {
    const g=group(parent,x,z,rotation,'Curved oak dining chair');
    const upholstery=style==='sage'?fabricOlive:fabricIvory;
    for(const sx of[-1,1])for(const sz of[-1,1]) rod(g,[sx*.188,.025,sz*.185],[sx*.158,.43,sz*.154],.019,mats.wood);
    box(g,0,.406,0,.43,.036,.44,mats.wood,.062);
    soft(g,0,.449,.008,.445,.082,.455,upholstery,2,.015);
    for(const sx of[-1,1]) rod(g,[sx*.175,.40,-.168],[sx*.206,.846,-.205],.017,mats.wood);
    const backGeo=new THREE.PlaneGeometry(.46,.29,24,14),p=backGeo.attributes.position;
    for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i);p.setXYZ(i,px,py,-.035*(1-(px/.23)**2));}backGeo.computeVertexNormals();
    const back=mesh(g,backGeo,mat(upholstery,.46,.29),0,.704,-.206);back.material.side=THREE.DoubleSide;
    soft(g,0,.704,-.225,.48,.315,.062,upholstery,1,.003);
    tube(g,[[-.215,.837,-.203],[-.12,.857,-.230],[0,.862,-.239],[.12,.857,-.230],[.215,.837,-.203]],.017,mats.wood,38);
    rod(g,[-.17,.235,-.17],[.17,.235,-.17],.011,mats.wood);return g;
  }
  for(const x of[-.48,.48]) {chair(dining,x,-.65,Math.PI);chair(dining,x,.65,0);}
  chair(dining,-1.12,0,-Math.PI/2);chair(dining,1.12,0,Math.PI/2);
  vase(dining,.10,.785,-.015,.065,.19,ceramicSand);smallBranch(dining,.10,.948,-.015,.26);
  bowl(dining,-.22,.785,.01,.118,.045,ceramicRust);
  for(const sx of[-1,1])for(const sz of[-1,1]) {
    const place=cyl(dining,sx*.48,.787,sz*.235,.129,.004,ceramicSand);place.scale.z=.8;
    cyl(dining,sx*.48,.794,sz*.235,.104,.008,mats.ceramic);
    rod(dining,[sx*.48+.148,.793,sz*.235-.055],[sx*.48+.148,.793,sz*.235+.06],.003,steel);
    cyl(dining,sx*.48-.158,.820,sz*.235-.065,.028,.065,glassSmoke,.024);
  }
  blocker(2.49,4.14,1.72,.86);
  ceilingPendant(living,3.35,4.58,2.09,'linen',1.20);
  // A floor lamp and small side table finish the sitting room.
  cyl(living,1.24,.038,.23,.12,.045,bronze);rod(living,[1.24,.05,.23],[1.24,1.37,.23],.012,bronze);
  const floorShade=mesh(living,new THREE.CylinderGeometry(.17,.25,.30,48,1,true),mat(fabricIvory,1.45,.3),1.24,1.45,.23);floorShade.material.side=THREE.DoubleSide;
  glow(living,new THREE.CircleGeometry(.22,32),1.24,1.305,.23).rotation.x=Math.PI/2;addLight(living,1.24,1.35,.23,23,'#ffd9ab',5);
  box(living,.29,.55,4.26,.41,1.01,.67,mats.wood,.019);box(living,.30,1.07,4.26,.44,.032,.70,mats.wood,.015);
  bowl(living,.30,1.085,4.27,.115,.045,ceramicSand);vase(living,.28,1.087,4.06,.074,.22,ceramicRust);smallBranch(living,.28,1.28,4.06,.43);
  art(living,.105,3.66,.72,.96,Math.PI/2,'olive');
  art(living,.106,1.54,1.61,.82,Math.PI/2,'clay',1.77);
  curtain(living,1.70,-.095,2.7,0,'ivory');

  // Kitchen joinery: shaker-free flush doors with true inset gaps, drawers,
  // integrated appliances and stone worktops split around an open sink.
  const kitchen=group(furnishing,0,0,0,'Kitchen and utility — oak, warm stone and brass');
  const east=group(kitchen,5.985,1.425,-Math.PI/2,'East kitchen run');
  box(east,0,.40,0,2.85,.78,.56,mats.white,.005);box(east,0,.073,0,2.80,.145,.47,mats.darkwood,.003);
  for(let i=0;i<5;i++) {
    const xx=-1.425+(i+.5)*.57;
    if(i===3) {
      for(let j=0;j<3;j++) {box(east,xx,.215+j*.215,.291,.554,.195,.029,mats.wood,.004);rod(east,[xx-.12,.275+j*.215,.320],[xx+.12,.275+j*.215,.320],.0045,bronze);}
    } else {box(east,xx,.450,.291,.553,.699,.029,mats.wood,.004);rod(east,[xx-.12,.738,.321],[xx+.12,.738,.321],.0045,bronze);}
  }
  // Counter is genuinely open over the inset sink, with four surrounding
  // pieces, so the basin is a visible cavity rather than a dark painted disc.
  const counterY=.907, sinkZ=.54, sinkLength=.52, sinkWidth=.40;
  const sinkStart=sinkZ-sinkLength/2,sinkEnd=sinkZ+sinkLength/2;
  box(kitchen,5.985,counterY,sinkStart/2,.655,.052,sinkStart,mats.slab,0);
  box(kitchen,5.985,counterY,(sinkEnd+2.85)/2,.655,.052,2.85-sinkEnd,mats.slab,0);
  box(kitchen,5.985-sinkWidth/2-(.655-sinkWidth)/4,counterY,sinkZ,(.655-sinkWidth)/2,.052,sinkLength,mats.slab,0);
  box(kitchen,5.985+sinkWidth/2+(.655-sinkWidth)/4,counterY,sinkZ,(.655-sinkWidth)/2,.052,sinkLength,mats.slab,0);
  box(kitchen,5.985,.765,sinkZ,sinkWidth,.035,sinkLength,steel,.035);
  box(kitchen,5.985-sinkWidth/2+.009,.833,sinkZ,.017,.115,sinkLength,steel,.008);
  box(kitchen,5.985+sinkWidth/2-.009,.833,sinkZ,.017,.115,sinkLength,steel,.008);
  box(kitchen,5.985,.833,sinkZ-sinkLength/2+.009,sinkWidth,.115,.018,steel,.008);
  box(kitchen,5.985,.833,sinkZ+sinkLength/2-.009,sinkWidth,.115,.018,steel,.008);
  cyl(kitchen,5.985,.788,sinkZ,.027,.004,mats.black);torus(kitchen,5.985,.792,sinkZ,.027,.003,steel);
  tube(kitchen,[[6.205,.934,.53],[6.205,1.12,.53],[6.185,1.20,.53],[6.065,1.23,.53],[6.015,1.19,.53],[6.015,1.14,.53]],.0125,bronze,45);
  cyl(kitchen,6.205,.954,.53,.027,.035,bronze);rod(kitchen,[6.205,.998,.53],[6.205,1.07,.61],.007,bronze);
  // Low splash and stone backsplash with joints, wall cupboards clear sink.
  box(kitchen,6.276,1.235,1.425,.025,.61,2.83,mats.slab,.002);
  const upper=group(kitchen,6.09,1.35,-Math.PI/2,'Kitchen upper cupboards');
  box(upper,0,2.035,0,2.50,.75,.375,mats.white,.005);
  for(let i=0;i<5;i++) box(upper,-1.25+(i+.5)*.5,2.035,.20,.487,.729,.035,mats.white,.004);
  box(kitchen,5.92,1.64,1.35,.022,.012,2.48,bronze,.003);
  const strip=glow(kitchen,new THREE.BoxGeometry(.011,.010,2.35),5.98,1.637,1.35,'Kitchen undercabinet diffuser');strip.userData.eveningEmissive=4;
  addLight(kitchen,5.95,1.60,1.2,26,'#ffdda8',4);
  // Induction glass, visible burner etching and real oven fascia.
  box(kitchen,5.985,.941,1.99,.51,.017,.62,blackScreen,.016);
  for(const xx of[5.86,6.10])for(const zz of[1.80,2.14]) {
    torus(kitchen,xx,.953,zz,.082,.0015,steel);torus(kitchen,xx,.953,zz,.055,.001,steel);
  }
  for(let i=0;i<5;i++) cyl(kitchen,5.797,.955,1.81+i*.06,.004,.001,steel);
  box(kitchen,5.672,.45,2.00,.030,.55,.54,mats.black,.010);
  box(kitchen,5.650,.45,2.00,.016,.375,.43,blackScreen,.014);
  rod(kitchen,[5.620,.660,1.77],[5.620,.660,2.23],.013,steel);
  box(kitchen,5.635,.712,2.00,.009,.070,.51,steel,.004);
  for(const zz of[1.84,2.17]) {const knob=cyl(kitchen,5.621,.716,zz,.021,.019,steel);knob.rotation.z=Math.PI/2;}
  box(kitchen,6.017,1.531,2.02,.54,.065,.65,mats.white,.008);
  box(kitchen,6.235,1.84,2.02,.105,.61,.32,mats.white,.003);
  for(let i=0;i<10;i++) box(kitchen,5.973+i*.037,1.494,2.02,.020,.004,.37,steel,.001);
  // West run and full-height refrigerator terminate before the open passage.
  box(kitchen,3.87,.404,1.08,.54,.80,2.08,mats.white,.006);box(kitchen,3.87,.057,1.08,.47,.114,2.05,mats.darkwood,.003);
  box(kitchen,3.88,.919,1.08,.626,.05,2.10,mats.slab,.008);
  for(let i=0;i<4;i++) {const zz=.295+i*.52;box(kitchen,4.158,.45,zz,.030,.70,.50,mats.white,.004);rod(kitchen,[4.182,.746,zz-.115],[4.182,.746,zz+.115],.0045,bronze);}
  box(kitchen,3.91,1.015,2.445,.65,1.94,.65,mats.white,.035);
  box(kitchen,3.91,.680,2.780,.593,1.185,.021,mats.white,.012);box(kitchen,3.91,1.666,2.780,.593,.753,.021,mats.white,.012);
  rod(kitchen,[4.10,.57,2.804],[4.10,1.14,2.804],.012,steel);rod(kitchen,[4.10,1.41,2.804],[4.10,1.88,2.804],.012,steel);
  box(kitchen,3.912,1.691,2.794,.080,.088,.011,mats.black,.003);
  // Everyday items have useful scale and individual silhouettes.
  box(kitchen,3.88,.974,.38,.23,.035,.31,mats.wood,.018);
  bowl(kitchen,3.88,.989,.38,.095,.055,ceramicSand);
  for(let i=0;i<4;i++)sphere(kitchen,3.85+(i%2)*.043,1.034+Math.floor(i/2)*.025,.36+(i%2)*.036,.030,tinted(mats.ceramic,i%2?'#ce9e52':'#9d9e59'));
  cyl(kitchen,5.96,1.019,1.12,.051,.165,ceramicSand);for(let i=0;i<6;i++){const px=5.96+(rnd()-.5)*.055,pz=1.12+(rnd()-.5)*.06;rod(kitchen,[px,1.02,pz],[px+(rnd()-.5)*.022,1.29,pz],.004,mats.wood);sphere(kitchen,px,1.28,pz,.018,mats.wood,1,.65,1.6);}
  mug(kitchen,3.89,.945,.91,ceramicRust);vase(kitchen,3.89,.945,.09,.055,.135,ceramicSand);smallBranch(kitchen,3.89,1.056,.09,.20);
  blocker(5.66,0,.66,2.85);blocker(3.58,0,.61,2.13);blocker(3.575,2.13,.66,.65);
  // Front-loading washer in the separate service strip, plus folded towels.
  box(kitchen,5.97,.438,-.58,.58,.87,.65,mats.white,.018);
  box(kitchen,5.674,.44,-.58,.015,.58,.54,mats.white,.008);
  torus(kitchen,5.655,.407,-.58,.174,.026,steel,[0,Math.PI/2,0]);
  const washerGlass=cyl(kitchen,5.650,.407,-.58,.148,.015,blackScreen);washerGlass.rotation.z=Math.PI/2;
  const washerInside=cyl(kitchen,5.638,.407,-.58,.110,.017,steel);washerInside.rotation.z=Math.PI/2;
  torus(kitchen,5.627,.407,-.58,.105,.009,mats.black,[0,Math.PI/2,0]);
  box(kitchen,5.650,.764,-.65,.015,.065,.20,mats.black,.002);const washerKnob=cyl(kitchen,5.632,.764,-.43,.025,.019,steel);washerKnob.rotation.z=Math.PI/2;
  for(let i=0;i<3;i++) soft(kitchen,5.97,.899+i*.044,-.56,.40,.042,.43,i%2?fabricOlive:fabricIvory,i,.002);
  blocker(5.67,-.90,.61,.65);
  ceilingPendant(kitchen,4.87,1.40,2.44,'brass',.70);

  function bedside(parent,x,z,w=.44,style='oak') {
    const g=group(parent,x,z,0,'Bedside cabinet');const material=style==='white'?mats.white:mats.wood;
    for(const sx of[-1,1])for(const sz of[-1,1])rod(g,[sx*(w/2-.06),.015,sz*.16],[sx*(w/2-.065),.16,sz*.15],.015,mats.darkwood);
    box(g,0,.32,0,w,.34,.43,material,.018);box(g,0,.5,0,w+.018,.024,.446,material,.008);
    for(let i=0;i<2;i++){box(g,0,.239+i*.159,.224,w-.023,.143,.015,material,.005);rod(g,[-.06,.25+i*.16,.238],[.06,.25+i*.16,.238],.004,bronze);}
    return g;
  }
  function bed(parent,x,z,w=1.56,rotation=0,style='sage') {
    const g=group(parent,x,z,rotation,`${style} bedroom bed`);
    const headMat=style==='clay'?fabricTaupe:style==='oak'?fabricWarm:fabricIvory;
    const cover=style==='clay'?fabricClay:style==='oak'?fabricWarm:fabricIvory;
    const runner=style==='clay'?knittedOatmeal:style==='oak'?knittedOatmeal:knittedOlive;
    rug(g,0,.04,w+.74,2.48);
    for(const sx of[-1,1])for(const sz of[-1,1])cyl(g,sx*(w/2-.08),.085,sz*.86,.024,.17,mats.darkwood);
    soft(g,0,.24,0,w+.085,.32,2.07,headMat,2,.001);
    soft(g,0,.469,-.015,w,.23,2.02,fabricIvory,1,.003);
    const piping=[];for(let i=0;i<64;i++){const t=i/64*Math.PI*2;const cx=Math.sign(Math.cos(t))*Math.pow(Math.abs(Math.cos(t)),.25)*(w/2-.005),cz=Math.sign(Math.sin(t))*Math.pow(Math.abs(Math.sin(t)),.25)*1.004;piping.push([cx,.51,cz]);}tube(g,piping,.0035,fabricWarm,128,true);
    if(style==='oak') {
      box(g,0,.68,-1.074,w+.20,1.23,.075,mats.wood,.023);
      for(let i=0;i<34;i++)box(g,-(w+.15)/2+i*(w+.15)/33,.69,-1.027,.012,1.16,.010,mats.darkwood,.003);
      soft(g,0,.86,-.994,w+.06,.65,.079,headMat,2,.001);
    } else {
      soft(g,0,.77,-1.080,w+.18,1.28,.16,headMat,1,.003);
      for(let i=0;i<5;i++) {const px=-w/2+(i+.5)*w/5;tube(g,[[px,.235,-.994],[px,.61,-.998],[px,1.02,-.997],[px,1.325,-1.006]],.0027,fabricWarm,36);}
    }
    cloth(g,0,.621,.25,w+.21,1.76,cover,{sag:.16,foot:.21,phase:style==='clay'?3:1});
    // Turned top edge, textile thickness and natural longitudinal folds.
    cloth(g,0,.648,-.53,w+.105,.31,fabricIvory,{sag:.025,foot:.01,phase:4,segmentsZ:18});
    cloth(g,.013,.646,.585,w+.245,.57,runner,{sag:.18,foot:.04,phase:2,segmentsZ:20});
    for(const sx of[-1,1]) {
      const p=pillow(g,sx*w*.237,.683,-.71,w*.45,.15,.43,fabricIvory,[-.04,sx*.05,0],sx+2);
      pillow(g,sx*w*.237,.801,-.43,w*.37,.34,.135,headMat,[-.24,sx*.04,sx*.025],sx+3);
      const sideX=sx*(w/2+.285);bedside(g,sideX,-.74,.42,style==='clay'?'white':'oak');tableLamp(g,sideX,-.75,.518,style==='oak'?'brass':'ceramic');
      if(sx===1)book(g,sideX,.540,-.50,.17,.21,.025,bookOlive,.11);
    }
    pillow(g,.03,.81,-.19,.45,.29,.13,runner,[-.28,-.05,.04],7);
    return g;
  }
  const bed2=group(furnishing,0,0,0,'Bedroom 02 — sage, ivory and oak');
  bed(bed2,8.03,.44,1.50,0,'sage');cabinet(bed2,8.37,2.292,2.05,.55,0,'white');
  blocker(7.23,-.70,1.62,2.17);blocker(6.785,-.535,.43,.44);blocker(8.85,-.535,.43,.44);blocker(7.345,2.00,2.05,.59);
  // Slim console beneath wall art; it leaves the entrance aisle open.
  box(bed2,6.682,.51,.40,.26,.06,1.22,mats.wood,.016);for(const z of[-.08,.88])rod(bed2,[6.67,.03,z],[6.67,.48,z],.018,bronze);
  art(bed2,6.52,.40,.70,.93,Math.PI/2,'olive');vase(bed2,6.68,.546,.01,.055,.155,ceramicRust);smallBranch(bed2,6.68,.68,.01,.24);
  curtain(bed2,7.95,-.94,2.5,0,'sage');ceilingPendant(bed2,7.35,1.52,2.40,'linen',.67);

  const master=group(furnishing,0,0,0,'Master bedroom — smoked oak and oatmeal linen');
  bed(master,12.93,.42,1.68,0,'oak');cabinet(master,12.975,3.443,2.48,.56,0,'oak');
  blocker(12.03,-.73,1.80,2.18);blocker(11.61,-.55,.44,.45);blocker(13.805,-.55,.44,.45);blocker(11.735,3.16,2.48,.59);
  art(master,14.43,2.17,.83,1.05,-Math.PI/2,'clay');
  // Upholstered reading chair and side table in the long bedroom's free end.
  if(options.scannedChair)chairAnchors.push({parent:master,x:13.73,z:2.34,rotation:-.36,width:.68});
  else {
    const reading=group(master,13.73,2.34,-.36,'Master reading chair');
    for(const sx of[-1,1])for(const sz of[-1,1])rod(reading,[sx*.23,.02,sz*.23],[sx*.20,.38,sz*.20],.017,mats.darkwood);
    soft(reading,0,.43,0,.58,.18,.58,fabricWarm,1,.025);soft(reading,0,.70,-.245,.60,.58,.16,fabricWarm,3,.005);
    for(const sx of[-1,1])soft(reading,sx*.29,.52,0,.12,.29,.65,fabricWarm,sx+1,.002);
    pillow(reading,.035,.682,-.095,.31,.30,.11,fabricOlive,[-.22,-.03,.1],3);
  }
  cyl(master,13.12,.465,2.36,.18,.028,mats.wood);cyl(master,13.12,.242,2.36,.032,.46,bronze);cyl(master,13.12,.020,2.36,.115,.027,bronze);
  book(master,13.12,.50,2.36,.18,.21,.029,bookCream,.1);mug(master,13.13,.485,2.32,ceramicRust);
  blocker(13.27,1.94,.87,.83);
  plant(master,11.66,.79,.58,'olive');
  curtain(master,12.90,-.94,2.4,0,'taupe');ceilingPendant(master,12.32,2.28,2.43,'linen',.73);

  const bed3=group(furnishing,0,0,0,'Bedroom 03 — muted clay and ivory');
  bed(bed3,11.22,6.015,1.52,Math.PI,'clay');cabinet(bed3,9.03,6.21,1.76,.53,-Math.PI/2,'white');
  blocker(10.40,4.91,1.64,2.18);blocker(10.00,6.53,.44,.45);blocker(12.04,6.53,.44,.45);blocker(8.76,5.33,.58,1.76);
  // Desk is on the north wall. Its shallow depth leaves room to stand at the
  // bedroom entrance, with a separate clear route around the bed to balcony.
  const desk=group(bed3,11.30,4.405,0,'Oak writing desk');
  box(desk,0,.746,0,1.57,.048,.43,mats.wood,.014);
  for(const x of[-.66,.66])for(const z of[-.155,.155])rod(desk,[x,.02,z],[x,.722,z],.018,bronze);
  box(desk,-.40,.671,0,.58,.10,.35,mats.wood,.008);rod(desk,[-.47,.673,.191],[-.34,.673,.191],.004,bronze);
  chair(bed3,11.04,4.842,0,'sage');
  book(desk,.42,.788,0,.20,.27,.027,bookCream,.05);mug(desk,.62,.775,.045,ceramicSand);
  box(desk,-.15,.781,-.035,.37,.027,.245,mats.black,.009);
  const laptop=box(desk,-.15,.919,-.139,.37,.277,.012,mats.black,.007);laptop.rotation.x=-.16;
  const laptopScreen=box(desk,-.15,.919,-.130,.334,.232,.004,blackScreen,.002);laptopScreen.rotation.x=-.16;
  tableLamp(desk,-.56,-.025,.774,'brass');
  // Desk and chair avoid the parent walk spawn (10.8,4.7).
  blocker(10.515,4.19,1.57,.43);
  art(bed3,8.72,4.72,.60,.75,Math.PI/2,'clay');
  curtain(bed3,12.86,5.65,2.2,-Math.PI/2,'ivory');ceilingPendant(bed3,9.76,4.82,2.40,'linen',.72);

  function basin(parent,x,y,z,width=.43,depth=.34) {
    // Open bowl profile with elliptical cross-section and real interior.
    const radius=width/2,height=.105;
    const p=[[0,.005],[radius*.55,.005],[radius*.84,.03],[radius,.105],[radius-.010,.112],[radius-.022,.107],[radius*.77,.04],[radius*.42,.023],[0,.023]].map(([a,b])=>new THREE.Vector2(a,b));
    const b=mesh(parent,new THREE.LatheGeometry(p,48),mats.ceramic,x,y,z);b.scale.z=depth/width;
    cyl(parent,x,y+.026,z,.022,.004,steel);
    return b;
  }
  function mirror(parent,x,y,z,w=.60,h=.77,rotation=0) {
    const g=group(parent,x,z,rotation,'Brass framed bathroom mirror');g.position.y=y;
    box(g,0,0,0,w+.031,h+.030,.022,bronze,.044);
    const m=mesh(g,new THREE.PlaneGeometry(w,h),mats.mirror,0,0,.014);m.name='Reflective bathroom mirror';m.userData.keepSeparate=true;mirrors.push(m);
    return m;
  }
  function toilet(parent,x,z) {
    const g=group(parent,x,z,0,'Porcelain toilet');
    // Continuous curved pedestal and bowl, including a hollow inside and seat.
    const pedestal=mesh(g,new THREE.LatheGeometry([[0,0],[.115,0],[.139,.015],[.130,.105],[.108,.20],[.142,.30],[.180,.355]].map(([a,b])=>new THREE.Vector2(a,b)),48),mats.ceramic,0,.03,0);pedestal.scale.z=1.28;
    const profile=[[.117,.28],[.161,.29],[.201,.36],[.209,.405],[.204,.422],[.171,.422],[.152,.383],[.120,.334],[.063,.32],[.025,.335]].map(([a,b])=>new THREE.Vector2(a,b));
    const bowlMesh=mesh(g,new THREE.LatheGeometry(profile,56),mats.ceramic,0,0,.072);bowlMesh.scale.z=1.31;
    const water=cyl(g,0,.331,.072,.065,.003,deepWater);water.scale.z=1.15;
    const seat=torus(g,0,.440,.072,.178,.017,mats.ceramic);seat.scale.y=1.31;
    const rim=torus(g,0,.411,.072,.201,.009,mats.ceramic);rim.scale.y=1.31;
    soft(g,0,.636,-.180,.38,.48,.125,mats.ceramic,1,0);
    box(g,0,.886,-.18,.38,.024,.148,mats.ceramic,.016);cyl(g,0,.902,-.18,.027,.005,steel);
    const lid=soft(g,0,.617,-.080,.34,.36,.042,mats.ceramic,2,0);lid.rotation.x=.13;
    for(const sx of[-1,1])cyl(g,sx*.085,.452,-.108,.012,.018,steel);
    return g;
  }
  function towel(parent,x,y,z,w=.29,h=.46,rotation=0,color=fabricIvory) {
    const g=group(parent,x,z,rotation,'Hanging woven towel');g.position.y=y;
    const geo=new THREE.PlaneGeometry(w,h,22,35),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i);p.setXYZ(i,px,py,.006*Math.sin(px*80)+.006*Math.sin(py*13));}geo.computeVertexNormals();
    const m=mesh(g,geo,mat(color,w,h));m.material.side=THREE.DoubleSide;
    tube(g,[[-w/2,-h/2+.028,.009],[0,-h/2+.028,.009],[w/2,-h/2+.028,.009]],.002,color,20);
    return g;
  }
  function bathroom(parent,x,z,d=2.45,flipDepth=false) {
    const g=group(parent,x,flipDepth?z+d:z,0,'Stone bathroom with walk-in shower');
    if(flipDepth)g.scale.z=-1;
    const worldZ=localZ=>flipDepth?z+d-localZ:z+localZ;
    const bathBlocker=(localX,localZ,w,depth)=>blocker(x+localX,flipDepth?z+d-localZ-depth:z+localZ,w,depth);
    // The north edge is the doorway. A side-wall vanity keeps its mirror on
    // real architecture and the door threshold open, as in a built bathroom.
    const vanity=group(g,.038,.51,Math.PI/2,'Side-wall oak vanity');
    box(vanity,0,.423,.255,.67,.55,.47,mats.wood,.017);box(vanity,0,.721,.255,.706,.037,.511,mats.slab,.012);
    box(vanity,0,.423,.504,.62,.496,.023,mats.wood,.007);rod(vanity,[-.12,.568,.527],[.12,.568,.527],.004,bronze);
    basin(vanity,0,.743,.265,.438,.335);
    tube(vanity,[[0,.746,.017],[0,.94,.017],[0,.98,.045],[0,.98,.155],[0,.945,.170]],.009,bronze,35);
    cyl(vanity,0,.755,.017,.020,.020,bronze);rod(vanity,[0,.79,.018],[.040,.84,.018],.004,bronze);
    mirror(vanity,0,1.46,.010,.604,.745);
    rod(vanity,[-.18,1.96,.033],[.18,1.96,.033],.010,bronze);
    glow(vanity,new THREE.CylinderGeometry(.008,.008,.32,12),0,1.96,.033,'Mirror wall light').rotation.z=Math.PI/2;addLight(vanity,0,1.88,.11,11,'#ffe1ba',3);
    cyl(vanity,.281,.772,.285,.025,.085,ceramicRust);rod(vanity,[.281,.815,.285],[.281,.872,.285],.005,bronze);rod(vanity,[.281,.87,.285],[.245,.87,.285],.005,bronze);
    toilet(g,1.094,.960);
    rod(g,[1.34,.718,.75],[1.34,.718,.97],.008,bronze);
    const roll=cyl(g,1.34,.718,.863,.045,.105,paper);roll.rotation.x=Math.PI/2;
    towel(g,.040,1.018,1.015,.245,.414,Math.PI/2,fabricOlive);
    rod(g,[.034,1.24,.87],[.034,1.24,1.16],.009,bronze);
    const showerZ=d-.49;
    box(g,.73,.040,showerZ,1.30,.049,.92,mats.bath,.004);
    // Tile joints and a long recessed linear drain give shower floor scale.
    for(let i=1;i<4;i++)box(g,.12+i*.31,.067,showerZ,.003,.001,.90,floorGrout,0);
    box(g,.73,.068,d-.105,.89,.003,.040,mats.black,.002);
    for(let i=0;i<22;i++)box(g,.295+i*.041,.070,d-.105,.012,.001,.027,steel,0);
    // Right-hand fixed glass plus a genuinely open inward-hinged left door.
    // Their 1.26 m total frontage leaves a .71 m entrance on the left.
    const screenZ=d-1.015,hingeX=.78,doorWidth=.71,fixedWidth=.55;
    const screen=box(g,hingeX+fixedWidth/2,1.075,screenZ,fixedWidth,2.09,.012,mats.glass,.003);screen.userData.keepSeparate=true;
    for(const sx of[hingeX,hingeX+fixedWidth])rod(g,[sx,.052,screenZ],[sx,2.14,screenZ],.009,bronze);
    rod(g,[hingeX,2.14,screenZ],[hingeX+fixedWidth,2.14,screenZ],.009,bronze);
    const showerDoor=group(g,hingeX,screenZ,Math.PI/2,'Open inward-hinged shower door');
    const doorGlass=box(showerDoor,-doorWidth/2,1.075,0,doorWidth,2.09,.012,mats.glass,.003);doorGlass.userData.keepSeparate=true;
    for(const yy of[.53,1.62])box(g,hingeX,yy,screenZ,.035,.06,.025,bronze,.004);
    rod(showerDoor,[-doorWidth+.115,.98,-.024],[-doorWidth+.115,1.23,-.024],.006,bronze);
    rod(showerDoor,[-doorWidth+.115,.98,.024],[-doorWidth+.115,1.23,.024],.006,bronze);
    for(const yy of[.98,1.23])rod(showerDoor,[-doorWidth+.115,yy,-.024],[-doorWidth+.115,yy,.024],.0035,bronze);
    showerWalls.push({x1:x+hingeX,z1:worldZ(screenZ),x2:x+hingeX+fixedWidth,z2:worldZ(screenZ),thick:.012});
    showerWalls.push({x1:x+hingeX,z1:worldZ(screenZ),x2:x+hingeX,z2:worldZ(screenZ+doorWidth),thick:.012});
    box(g,.72,1.122,d-.045,.188,.108,.033,bronze,.015);
    for(const xx of[.674,.766]) {const c=cyl(g,xx,1.122,d-.071,.030,.024,bronze);c.rotation.x=Math.PI/2;}
    tube(g,[[.72,1.18,d-.075],[.72,1.79,d-.075],[.72,2.10,d-.075],[.72,2.155,d-.17],[.72,2.155,d-.37]],.011,bronze,42);
    cyl(g,.72,2.138,d-.37,.115,.019,bronze);
    for(let i=0;i<22;i++){const ang=i*2.4,r=.02+Math.sqrt(i/22)*.083;cyl(g,.72+Math.cos(ang)*r,2.126,d-.37+Math.sin(ang)*r,.002,.002,mats.black,undefined,8);}
    // Hand shower and flexible hose as a continuously curved tube.
    rod(g,[.99,1.42,d-.08],[.99,1.69,d-.11],.012,bronze);sphere(g,.99,1.705,d-.11,.037,bronze,1,.68,1);
    tube(g,[[.99,1.43,d-.08],[1.065,1.11,d-.12],[.98,.72,d-.12],[.86,.82,d-.12],[.88,1.16,d-.078]],.006,steel,44);
    box(g,.267,1.085,d-.042,.277,.017,.076,bronze,.004);
    for(let i=0;i<3;i++) {cyl(g,.17+i*.07,1.162,d-.06,.022,.14,i===1?ceramicRust:mats.white);cyl(g,.17+i*.07,1.235,d-.06,.011,.012,bronze);}
    // Bath mat clear of the walk spawn between vanity and shower.
    rug(g,.51,1.145,.58,.47,fabricIvory);
    bathBlocker(.040,.160,.54,.70);bathBlocker(.87,.705,.44,.565);
    // The glass shower itself stays navigable through its left-hand side.
    return g;
  }
  const baths=group(furnishing,0,0,0,'Three bathrooms — stone, oak and champagne brass');
  bathroom(baths,5.4,4.15,2.45);bathroom(baths,7.05,4.15,2.45);bathroom(baths,9.75,-.2,2.80,true);

  const balconies=group(furnishing,0,0,0,'Planted timber balconies');
  // Continuous planter holds separate growing plants, varying height and type.
  box(balconies,1.69,.152,-1.13,2.87,.285,.35,mats.darkwood,.020);
  box(balconies,1.69,.299,-1.13,2.75,.018,.273,mats.soil,.004);
  for(let i=0;i<8;i++) {
    const p=plant(balconies,.47+i*.345,-1.135,.265+rnd()*.08,i%3?'grass':'broad',.286,ceramicRust);
    // Remove individual pots inside the built-in planter, retain live foliage.
    const pots=p.children.slice(0,2);pots.forEach(m=>p.remove(m));
  }
  plant(balconies,.34,-.63,.45,'olive');plant(balconies,3.02,-.63,.38,'broad');
  blocker(.245,-1.31,2.88,.36);
  // Compact outdoor bistro table/chair without blocking the sliding door.
  const bt=group(balconies,1.85,-.76,0,'Balcony bistro table');cyl(bt,0,.655,0,.225,.023,mats.wood);cyl(bt,0,.328,0,.022,.63,mats.black);cyl(bt,0,.025,0,.13,.025,mats.black);
  mug(bt,.055,.675,0,ceramicSand);
  plant(balconies,13.55,4.45,.42,'grass');plant(balconies,13.54,6.95,.43,'olive');
  // Slatted bench along the far end of the bedroom balcony.
  for(let i=0;i<5;i++)box(balconies,13.47,.424,6.645+i*.052,.85,.024,.037,mats.wood,.005);
  for(const sx of[-1,1])for(const sz of[-1,1])rod(balconies,[13.47+sx*.345,.02,6.75+sz*.09],[13.47+sx*.345,.41,6.75+sz*.09],.012,mats.black);
  pillow(balconies,13.55,.48,6.75,.36,.085,.26,fabricOlive,[Math.PI/2,0,.08],2);
  blocker(13.02,6.64,.90,.30);

  // Merge only static opaque meshes by material in each room. Detailed stems,
  // seams, chair legs and tile joints stay affordable on ordinary browsers.
  // Diffusers, mirror surfaces, and transparent screens remain independently
  // addressable by the lighting and reflector controllers.
  furnishing.updateMatrixWorld(true);
  for (const room of furnishing.children.slice()) {
    if (!room.isGroup) continue;
    const inverse = new THREE.Matrix4().copy(room.matrixWorld).invert();
    const buckets = new Map(), originals = [];
    room.traverse(object => {
      if (!object.isMesh || object.userData.keepSeparate || Array.isArray(object.material) || object.material.transparent || object.material.transmission > 0) return;
      const key=object.material.uuid;
      if(!buckets.has(key))buckets.set(key,{material:object.material,geometries:[]});
      let geometry=object.geometry.clone();
      const localMatrix=new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld);
      geometry.applyMatrix4(localMatrix);
      if(geometry.index)geometry=geometry.toNonIndexed();
      // A reflected room reverses triangle winding. Once baked into a merged
      // identity mesh, preserve outward faces as well as transformed normals.
      if(localMatrix.determinant()<0) {
        for(const attribute of Object.values(geometry.attributes)) {
          const array=attribute.array,size=attribute.itemSize;
          for(let i=0;i<attribute.count;i+=3)for(let k=0;k<size;k++){
            const a=(i+1)*size+k,b=(i+2)*size+k,tmp=array[a];array[a]=array[b];array[b]=tmp;
          }
        }
      }
      // RoundedBox, Lathe and Tube all carry normal/UV attributes; ensure
      // custom geometry agrees before merging without material groups.
      for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
      if(!geometry.attributes.normal)geometry.computeVertexNormals();
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      buckets.get(key).geometries.push(geometry);originals.push(object);
    });
    for(const bucket of buckets.values()) {
      const merged=mergeGeometries(bucket.geometries,false);
      if(!merged)continue;
      const indexed=mergeVertices(merged,1e-5);merged.dispose();
      const m=new THREE.Mesh(indexed,bucket.material);m.name=`${room.name} — ${bucket.material.name || 'material'}`;m.castShadow=true;m.receiveShadow=true;room.add(m);
      bucket.geometries.forEach(g=>g.dispose());
    }
    originals.forEach(object=>{object.removeFromParent();object.geometry.dispose();});
  }
  furnishing.traverse(m=>{if(m.isMesh){stats.meshes++;stats.triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}});
  furnishing.userData.realisticInterior=true;
  return {colliders,lights,lamps,mirrors,stats,plantAnchors,chairAnchors,showerWalls};
}
