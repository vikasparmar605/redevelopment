# My Home · Interactive 3D

A furnished browser model reconstructed from the two supplied apartment references.

**Open `My Home 3D.html` in Chrome, Edge, Firefox or Safari.** The 3D library, textures and reference images are embedded; the model works offline. An optional Google Fonts stylesheet enhances typography online.

Drag to rotate, scroll to zoom, right-drag to pan. Select any room to focus it. Switch to Top view or Walk inside. In walk mode, drag to look and use WASD / arrow keys (or the on-screen arrow controls) to move. Escape returns to the overview. Use view settings to adjust walls, furniture, labels, dimensions and lighting.

Save image exports the current model view. 3D file exports a furnished roofless GLB model in metres, with full-height architecture.

## Source and local serving

`npm install`

`npm run build`

`npm run start` serves the browser model at http://localhost:4173.

## Reconstruction notes

The original floor plan takes precedence where the stylized reference differs. Living room: 3.35 × 5.40 m plus dining recess; kitchen: 2.75 × 2.85 m; Bedroom 02: 3.05 × 3.55 m; master: 3.05 × 4.70 m; Bedroom 03: 4.05 × 3.05 m; common bathrooms: 1.45 × 2.45 m; master-adjoining bathroom: 1.45 × 2.80 m. Living balcony is 1.20 m deep, bedroom balcony 1.15 m wide, utility strip 0.75 m deep, and passage approximately 1.00 m wide.

The printed 980 ft² carpet area is quoted from the supplied plan, not calculated from this reconstruction. Wall thickness (approximately 180 mm), ceiling height (2.80 m), opening sizes and positions, service shafts, and furniture are visual estimates. No elevation drawings were supplied. This model is for spatial visualization, not construction or measurement certification.

Uses Three.js (MIT) as a browser graphics library. No Blender or game engine is required.
