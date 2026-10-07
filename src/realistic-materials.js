import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

// Every external image is bundled locally. The offline build passes a table of
// assets-relative filenames to data URLs, so opening the HTML needs no network.
const ASSET_ROOT = 'materials/';

export async function createRealisticMaterials(THREE, renderer, assetUrls = {}) {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const resolve = name => assetUrls[ASSET_ROOT + name] ||
    assetUrls['assets/' + ASSET_ROOT + name] || 'assets/' + ASSET_ROOT + name;
  const failures = [];
  const load = async (name, color = false) => {
    try {
      const t = await loader.loadAsync(resolve(name));
      t.name = name;
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = anisotropy;
      t.userData.source = 'https://polyhaven.com/';
      return t;
    } catch (error) {
      failures.push(name);
      console.warn('Using a plain material because a bundled texture could not load:', name);
      return null;
    }
  };
  const family = async (prefix, diffuse, scale, rotation = 0, roughnessFile = null) => {
    const [map, normalMap, roughnessMap] = await Promise.all([
      diffuse ? load(diffuse, true) : Promise.resolve(null),
      load(prefix + '_nor_gl_1k.jpg'),
      load(roughnessFile || prefix + '_rough_1k.jpg')
    ]);
    const maps = { map, normalMap, roughnessMap };
    for (const t of Object.values(maps)) {
      if (!t) continue;
      t.center.set(.5, .5);
      t.rotation = rotation;
    }
    return { maps, scale, rotation };
  };
  const [oak, planks, linen, wool, plaster, limestone, bathStone, environment] = await Promise.all([
    family('oak_veneer_01', 'oak_veneer_01_diff_2k.jpg', [1.83, 1.83], Math.PI / 2),
    family('laminate_floor_02', 'laminate_floor_02_diff_2k.jpg', [1.70, 1.70], 0, 'laminate_floor_02_honed_rough_1k.jpg'),
    family('rough_linen', 'rough_linen_ivory_diff_1k.jpg', [.271, .271]),
    family('poly_wool_herringbone', 'poly_wool_herringbone_ivory_diff_1k.jpg', [.270, .276]),
    family('white_plaster_02', null, [1, 1]),
    family('marble_01', 'marble_01_ivory_diff_1k.jpg', [1.5, 1.5], 0, 'marble_01_honed_rough_1k.jpg'),
    family('large_floor_tiles_02', 'large_floor_tiles_02_diff_1k.jpg', [3, 3]),
    new HDRLoader().setDataType(THREE.HalfFloatType)
      .loadAsync(resolve('residential_garden_2k.hdr'))
      .then(t => {
        t.name = 'Poly Haven — Residential Garden courtyard daylight';
        t.mapping = THREE.EquirectangularReflectionMapping;
        return t;
      })
      .catch(() => {
        failures.push('residential_garden_2k.hdr');
        console.warn('Bundled daylight environment failed to load; keeping direct illumination.');
        return null;
      })
  ]);

  const physical = (name, color, roughness, extra = {}, textureFamily = null) => {
    const options = { name, color, roughness, metalness: 0, ...extra };
    if (textureFamily) {
      for (const [key, t] of Object.entries(textureFamily.maps)) if (t) options[key] = t;
    }
    const m = new THREE.MeshPhysicalMaterial(options);
    m.userData.textureScale = textureFamily ? [...textureFamily.scale] : [1, 1];
    m.userData.textureRotation = textureFamily ? textureFamily.rotation : 0;
    return m;
  };
  const fabric = (name, color, roughness = .93, family = linen) => physical(name, color, roughness, {
    normalScale: new THREE.Vector2(.25, .25),
    sheen: .30, sheenColor: new THREE.Color('#faf6ed'), sheenRoughness: .87
  }, family);

  const materials = {
    wall: physical('Ivory painted plaster', '#f4f1e8', .88, {
      normalScale: new THREE.Vector2(.07, .07)
    }, plaster),
    trim: physical('Satin painted timber trim', '#eeebe3', .44, { clearcoat: .12, clearcoatRoughness: .55 }),
    wood: physical('Natural oiled oak veneer', '#ffffff', .82, {
      normalScale: new THREE.Vector2(.20, .20), clearcoat: .16, clearcoatRoughness: .56
    }, oak),
    darkwood: physical('Smoked oak joinery', '#968571', .69, {
      normalScale: new THREE.Vector2(.17, .17), clearcoat: .10, clearcoatRoughness: .58
    }, oak),
    white: physical('Warm satin lacquer', '#ebe8e0', .46, { clearcoat: .10, clearcoatRoughness: .57 }),
    linen: fabric('Ivory woven linen upholstery', '#f1ebdd'),
    cushion: fabric('Oatmeal linen upholstery', '#d4c5aa'),
    sage: fabric('Muted sage woven textile', '#86917b'),
    charcoal: fabric('Charcoal woven textile', '#51514b'),
    metal: physical('Brushed champagne brass', '#c0a16a', .33, { metalness: 1 }),
    black: physical('Powder coated dark bronze', '#242b2b', .36, { metalness: .25 }),
    ceramic: physical('Glazed ivory porcelain', '#fcfbf6', .18, { clearcoat: .65, clearcoatRoughness: .16 }),
    glass: physical('Clear architectural glass', '#ffffff', .035, {
      transmission: .90, thickness: .018, ior: 1.5, transparent: true,
      opacity: .38, depthWrite: false, metalness: 0,
      attenuationColor: new THREE.Color('#dce8dc'), attenuationDistance: 5,
      side: THREE.DoubleSide
    }),
    leaves: physical('Fresh deep green leaves', '#3d6235', .60, {
      side: THREE.DoubleSide, sheen: .12, sheenColor: new THREE.Color('#607640')
    }),
    leaves2: physical('Young olive green leaves', '#667d48', .63, { side: THREE.DoubleSide, sheen: .12 }),
    soil: physical('Potting soil', '#3c2d20', 1),
    rug: fabric('Warm herringbone wool rug', '#f4ead7', 1, wool),
    bath: physical('Honed warm grey stone', '#ffffff', .86, {
      normalScale: new THREE.Vector2(.20, .20)
    }, bathStone),
    slab: physical('Fine ivory quartz', '#e5e2d8', .38, { clearcoat: .12, clearcoatRoughness: .38 }),
    tile: physical('Pale honed limestone floor', '#ffffff', 1, {
      normalScale: new THREE.Vector2(.19, .19), clearcoat: .07, clearcoatRoughness: .60
    }, limestone),
    mirror: physical('Silver backed mirror', '#ffffff', .015, { metalness: 1 }),
    emissive: physical('Warm visible light diffuser', '#fff4d8', .30, {
      emissive: '#ffdca0', emissiveIntensity: 1.25
    }),
    floorWood: physical('Natural oak plank flooring', '#ffffff', 1, {
      normalScale: new THREE.Vector2(.20, .20), clearcoat: .13, clearcoatRoughness: .65
    }, planks),
    floorBath: physical('Honed grey stone floor', '#ffffff', .85, {
      normalScale: new THREE.Vector2(.24, .24)
    }, bathStone)
  };

  // The geometry passed by the caller has unit-square UVs. Width and height
  // are the actual dimensions of that UV face in metres, including furniture.
  // Map clones share image pixels but have independent repeat/rotation.
  function forSurface(material, width, height, rotation = 0) {
    const m = material.clone();
    const [scaleX, scaleY] = material.userData.textureScale || [1, 1];
    for (const key of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'bumpMap']) {
      const original = material[key];
      if (!original) continue;
      const t = original.clone();
      t.repeat.set(Math.max(.001, width) / scaleX, Math.max(.001, height) / scaleY);
      t.rotation = (material.userData.textureRotation || 0) + rotation;
      t.center.set(.5, .5);
      t.needsUpdate = true;
      m[key] = t;
    }
    return m;
  }

  // A useful furniture-sized default; callers use forSurface for room floors,
  // walls and unusually large items rather than scaling the source images.
  for (const key of ['linen', 'cushion', 'sage', 'charcoal']) {
    materials[key] = forSurface(materials[key], .82, .82);
  }
  materials.rug = forSurface(materials.rug, 2.8, 2.8);
  Object.assign(materials, { environment, forSurface, textureFailures: failures });
  return materials;
}
