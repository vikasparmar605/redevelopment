# My Home · Interactive 3D

A detailed warm contemporary browser model reconstructed from the two supplied apartment references.

**Run `npm install` and `npm run build`, then open `My Home 3D.html` in Chrome, Edge, Firefox or Safari.** The 3D library, textures and reference images are embedded; the model works offline. Typography is bundled locally as well.

Drag to rotate, scroll to zoom, right-drag to pan. Select any room to focus it. Switch to Top view or Walk inside. In walk mode, drag to look and use WASD / arrow keys (or the on-screen arrow controls) to move. Escape returns to the overview. Use view settings to adjust walls, furniture, labels, dimensions and lighting.

Save image exports the current model view. 3D file exports a furnished GLB model in metres, with full-height architecture and ceilings.

## Source and local serving

`npm install`

`npm run build`

`npm run start` serves the browser model at http://localhost:4173.

## Reconstruction notes

The original floor plan takes precedence where the stylized reference differs. Living room: 3.35 × 5.40 m plus dining recess; kitchen: 2.75 × 2.85 m; Bedroom 02: 3.05 × 3.55 m; master: 3.05 × 4.70 m; Bedroom 03: 4.05 × 3.05 m; common bathrooms: 1.45 × 2.45 m; master-adjoining bathroom: 1.45 × 2.80 m. Living balcony is 1.20 m deep, bedroom balcony 1.15 m wide, utility strip 0.75 m deep, and passage approximately 1.00 m wide.

The printed 980 ft² carpet area is quoted from the supplied plan, not calculated from this reconstruction. Wall thickness (approximately 180 mm), ceiling height (2.80 m), opening sizes and positions, service shafts, and furniture are visual estimates. No elevation drawings were supplied. This model is for spatial visualization, not construction or measurement certification.

Uses Three.js (MIT) as a browser graphics library. No Blender or game engine is required.

## Realism upgrade

Scanned PBR oak, stone, plaster, linen and wool materials are bundled with the viewer. Walk mode has enclosing ceilings, detailed soft furnishings, open sliding balcony doors, practical lighting and neighbourhood surroundings. Walls have physical cutaway caps.

**Photo quality** progressively computes indirect lighting and reflections while the camera remains stationary. Stop rendering or move to return to the interactive view. It requires WebGL2 with floating-point render targets; unsupported browsers retain the interactive model. Up to 1024 samples are accumulated; image exports save the currently displayed view. Larger downloads are intentional for the chosen maximum-detail design.

Texture/HDR assets are CC0 from Poly Haven; see `assets/ASSET_LICENSES.md`. No external asset downloads are needed after the HTML is saved.

## Redevelopment building and Charkop surroundings

The viewer starts outside the proposed building. Choose residential floor 1–32, section A–G, and a north/south living-balcony facing. **My apartment** opens the original furnished home. **Walk from entrance** provides an illustrative lobby, lift with floor selection, and corridor; approach buttons also make the route accessible without keyboard walking. **Back to building** returns to the exterior.

The initial sample is section D, residential floor 20, north facing. It is not a flat allocation. Seven sections, 32 residential floors, the three-level podium, 126 × 24 m footprint, rear elevations, and placement are estimates from the supplied photograph. All facade sections have equal physical heights. The original apartment geometry and GLB export remain in metres; only one detailed apartment is instantiated.

The geographic anchor is 19.216288° N, 72.817758° E. A locally bundled OpenStreetMap extract supplies roads and building footprints within approximately 1 km, including the northern residential lane and Boraspada Road / RSC Rd Number 25 (named Turzon Road in the cached map). Nearby heights are estimated unless mapped. The immediate local area follows your supplied Google Maps screenshot: Shree Duttguru Sangharsh Udhyan and the cricket ground across the northern lane, wooded patches to the west and beyond the ground, and the second row of buildings to the south. Only mapped water is rendered. The rear neighbors are smaller apartment blocks (illustrative 8–12 floors), and both immediate sides of the redevelopment are jungle, with no houses in those strips. Missing neighboring building footprints, heights, and facade details are illustrative. Use **Area layout** to compare the overhead arrangement, or **Reference plans → Charkop area** to view your screenshot. Camera elevation and orientation change the outdoor views from windows and balconies. No live map or asset requests are needed.

Map data and attribution: [assets/location/SOURCES.md](assets/location/SOURCES.md). Geometry assumptions live in `buildingConfig` in `src/development.js`. `npm run test:building` checks all three entry routes, floor/facing transforms, the master door passage, mobile navigation, references, image download, and standalone offline operation. `npm test` checks apartment rendering and GLB export.

The generated standalone HTML is excluded from Git because it embeds approximately 74 MB of assets. `npm run build` recreates it locally; the hosted version is built into `dist`.
