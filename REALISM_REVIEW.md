# Independent realism review

The requested acceptance target is strictly above 9.9/10. A passing rating has not yet been obtained. Ratings below are supplied by the independent reviewing submodel and are not self-assigned.

| Capture | Lighting (25%) | Materials (25%) | Detail (25%) | Spatial correctness (15%) | Browser presentation (10%) | Weighted overall |
|---|---:|---:|---:|---:|---:|---:|
| Original | — | — | — | — | — | 5.5 |
| realism-v1 | 6.1 | 7.4 | 7.2 | 8.8 | 7.7 | 7.24 |
| realism-v3 | 7.3 | 7.8 | 7.8 | 8.9 | 8.2 | 7.88 |
| realism-stable / photo-v10 | 7.9 | 8.2 | 8.3 | 9.0 | 8.9 | 8.34 |
| final-review | 7.9 | 8.3 | 8.3 | 9.2 | 9.2 | 8.43 |
| courtyard-review + completed 1024-sample living photo | 8.4 | 8.4 | 8.2 | 9.2 | 9.2 | 8.55 |

The next reviews use fixed overhead and eye-level views of every room, both balconies, daylight and evening lighting, plus completed photo renders. Invalid, blank, incomplete or excessively noisy renders are diagnostic evidence and never treated as a passing result.

Identified issues corrected so far: missing ceilings and upper door/wall infill, window/duct enclosure gaps, wrong door swings, walking through closed glazing, unresolved cutaway caps, black plant geometry artifacts, rigid cuboid upholstery, repeated sine-wave bedding, overbright evening fixtures, a bathroom vanity covering the doorway, and invalid initial walking positions.

Photo rendering additionally required reducing rendering load, rebuilding render state between scene sections, checking graphics context loss, and restoring the interactive view when advanced rendering is unavailable. These paths remain subject to browser tests and completed visual review.

## Current verification and delivery

The browser suite passes room and bathroom/balcony selection, walking, ceilings/cutaways, lighting, image and GLB exports, mobile settings, and offline file opening with no page errors. Eight consecutive Photo quality views keep GPU texture allocations at 85–86 after fixing target ownership cleanup. The stationary interactive view performs no repeated rendering.

A genuine completed 1024-sample living-room photo is saved in `artifacts/converged-review/living-render.png`. Later refinements add a residential apartment courtyard environment, softer daylight, and gravity-constrained bedding; these require their own visual review rather than inheriting a previous rating.

The courtyard refinement was independently reviewed at 8.55/10 (overview 8.5, interiors 8.6). Remaining defects include rigid-looking bedding edges, uniform raster wall/ceiling shading, simplified fixtures, fine photo-render grain, and panorama-only surroundings. The 9.9 acceptance target has not been achieved.

The private hosted update is blocked by external state: `get_site` returns `project_not_found` for the exact ID saved in `.openai/hosting.json`, and both owner and editor inventories are empty. The original project identity is preserved. The standalone `My Home 3D.html` remains usable directly in a browser.
