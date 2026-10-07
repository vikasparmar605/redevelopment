"""Alternative bounded OSM map download for the local viewer."""
import urllib.request, xml.etree.ElementTree as ET, json, math
from pathlib import Path
from datetime import datetime, timezone
LAT,LON=19.216288,72.817758
url=f'https://api.openstreetmap.org/api/0.6/map?bbox={LON-.0105},{LAT-.010},{LON+.0105},{LAT+.010}'
xml=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MyHome3D-local-visualization/1.0'}),timeout=50).read()
root=ET.fromstring(xml);nodes={n.attrib['id']:[round((float(n.attrib['lon'])-LON)*111320*math.cos(math.radians(LAT)),2),round(-(float(n.attrib['lat'])-LAT)*111320,2)] for n in root.findall('node')}
features=[]
for w in root.findall('way'):
 tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
 if not any(k in tags for k in ['highway','building','natural','landuse','leisure']): continue
 points=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]
 features.append({'id':int(w.attrib['id']),'points':points,'tags':{k:v for k,v in tags.items() if k in ['name','highway','building','building:levels','height','natural','landuse','leisure','water','wetland','width','lanes']}})
result={'origin':[LAT,LON],'retrieved':datetime.now(timezone.utc).isoformat(),'osmTimestamp':None,'source':url,'attribution':'© OpenStreetMap contributors','license':'ODbL 1.0','features':features}
Path('assets/location/neighborhood.json').write_text(json.dumps(result,separators=(',',':')))
print('Saved',len(features),'features; buildings',sum('building' in f['tags'] for f in features),'roads',sum('highway' in f['tags'] for f in features))
print('Roads',sorted({f['tags']['name'] for f in features if f['tags'].get('highway') and f['tags'].get('name')}))
