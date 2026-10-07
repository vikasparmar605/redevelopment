# Charkop location sources and limitations

Corrected reference pin supplied by the user: **19.216288° N, 72.817758° E**. This pin is a reference for the local area, not a verified building centroid or flat allocation.

## Geographic data

`neighborhood.json` is the locally bundled OpenStreetMap extract. Its origin was recentered from the earlier user pin (19.2159167, 72.8175278) without moving geographic features. The original API source URL, original origin, feature IDs, retrieval timestamp, and available height tags remain in the file. To download a fresh extract around the corrected pin, run `python3 scripts/fetch-osm-map.py`.

© OpenStreetMap contributors. Data licensed under the [Open Database License (ODbL) 1.0](https://www.openstreetmap.org/copyright). Attribution is included in the viewer. Building heights use mapped height/level tags where available, with estimates elsewhere. No live map requests are made by the viewer.

## Corrected immediate neighborhood

`site-layout.json` records the local arrangement, informed by the user's Google Maps screenshot (`assets/location-reference.png`) and an independently inspected [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) export spanning longitude 72.8147–72.8208 and latitude 19.2145–19.2185. The user's screenshot takes precedence for current visible ground and cricket practice nets. Esri capture date was not established; the satellite pixels are not used as scene textures.

The OpenStreetMap park footprint (way 821248092) is modeled as open ground, with cricket pitches, practice nets, paths, and a small pavilion. The mapped lake (way 802269722) remains beyond/along the northeastern park boundary. Invented near-site water polygons from the earlier model have been removed. Wooded areas are modeled around the western/northern park edges and beyond Boraspada Road, with tree centers excluded from the open ground and streets.

The northern lane uses mapped way 211659606. The main southern road is labeled **Boraspada Rd / RSC Rd Number 25** in the user screenshot, although the cached map names its carriageways **Turzon Road**. Mapped service lanes and neighboring footprints are retained behind the proposed redevelopment. The sparse immediate map is supplemented by screenshot-informed neighboring houses and recognizable rear building forms near Ruby Tower, Yoshodhan Society, Silver Sea View, and Sea Crown. These supplemental footprints and heights are estimates, not surveys or verified building identifications.

## Proposed redevelopment placement

The tower footprint is offset 5 m east and 46 m south of the reference pin and rotated approximately 6.2° to follow the northern lane. This placement is an estimate in the existing societies' strip south of the park; it is not an approved site plan. The northern frontage faces the ground. Existing buildings are removed only within the approximate redevelopment envelope; the separate row between that site and the southern main road remains.

The building exterior still uses the user-supplied proposed rendering: seven facade sections, 32 residential floors, three podium levels, a 126 × 24 m footprint, and estimated side/rear elevations. The furnished apartment is unchanged except for an improved balcony spawn and initial outward camera direction. All apartment selections reuse the same sample layout. Lobby, lift, and corridor remain illustrative.
