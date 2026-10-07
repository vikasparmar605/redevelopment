"""Fetch a one-time, attributed OSM extract. Runtime never requests maps."""
import json, math, urllib.request, urllib.parse
from datetime import datetime, timezone
from pathlib import Path
LAT, LON = 19.216288, 72.817758
query = f'''[out:json][timeout:35];(way(around:1100,{LAT},{LON})[highway];way(around:1100,{LAT},{LON})[building];way(around:1100,{LAT},{LON})[natural];way(around:1100,{LAT},{LON})[landuse];way(around:1100,{LAT},{LON})[leisure=park];);out geom;'''
endpoint = 'https://overpass-api.de/api/interpreter'
request = urllib.request.Request(endpoint+'?'+urllib.parse.urlencode({'data':query}), headers={'User-Agent':'MyHome3D-local-redevelopment-visualization/1.0'})
raw = json.load(urllib.request.urlopen(request, timeout=55))
features=[]
for e in raw.get('elements',[]):
    if 'geometry' not in e: continue
    coords=[[round((p['lon']-LON)*111320*math.cos(math.radians(LAT)),2),round(-(p['lat']-LAT)*111320,2)] for p in e['geometry']]
    tags=e.get('tags',{})
    features.append({'id':e['id'],'points':coords,'tags':{k:v for k,v in tags.items() if k in ['name','highway','building','building:levels','height','natural','landuse','leisure','water','wetland','width','lanes']}})
result={'origin':[LAT,LON],'retrieved':datetime.now(timezone.utc).isoformat(),'osmTimestamp':raw.get('osm3s',{}).get('timestamp_osm_base'),'source':endpoint,'attribution':'© OpenStreetMap contributors','license':'ODbL 1.0','features':features}
Path('assets/location/neighborhood.json').write_text(json.dumps(result,separators=(',',':')))
print('Saved',len(features),'mapped features; timestamp',result['osmTimestamp'])
print('Named roads:',sorted({f['tags']['name'] for f in features if f['tags'].get('highway') and f['tags'].get('name')}))
