"use client";

// Map renderer — accepts either GeoJSON (rendered as a layer on OSM tiles) or
// a Leaflet JS snippet. Leaflet + leaflet.heat + leaflet-providers preloaded.

import { useMemo } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";

interface Props {
  content: string;
  reloadKey?: number;
}

function isGeoJson(s: string): boolean {
  try {
    const o = JSON.parse(s.trim());
    return o && typeof o === "object" && (o.type === "FeatureCollection" || o.type === "Feature" || Array.isArray(o.features));
  } catch { return false; }
}

function buildGeoJsonDoc(json: string): string {
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%;background:#cfe0ed}</style>
</head><body>
<div id="map"></div>
<script>
(function(){
  try {
    const data = ${json};
    const map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    const layer = L.geoJSON(data, {
      style: () => ({ color: '#4f46e5', weight: 2, fillColor: '#818cf8', fillOpacity: 0.45 }),
      pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 7, color: '#1d4ed8', fillColor: '#60a5fa', fillOpacity: 0.85, weight: 2 }),
      onEachFeature: (f, layer) => {
        if (f.properties && Object.keys(f.properties).length) {
          const html = Object.entries(f.properties).slice(0,8).map(([k,v]) => '<div><b>'+k+'</b>: '+String(v)+'</div>').join('');
          layer.bindPopup(html);
        }
      },
    }).addTo(map);
    try { map.fitBounds(layer.getBounds(), { padding: [24,24] }); }
    catch(_) { map.setView([20, 0], 2); }
  } catch(e){
    document.body.innerHTML = '<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e && (e.stack||e.message))+'</pre>';
    try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
  }
})();
</script></body></html>`;
}

function buildJsDoc(src: string): string {
  const escaped = src.replace(/<\/script>/gi, "<\\/script>");
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%;background:#cfe0ed}</style>
</head><body>
<div id="map"></div>
<script>
try {
  const map = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
  ${escaped}
} catch(e){
  document.body.innerHTML = '<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e && (e.stack||e.message))+'</pre>';
  try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
}
</script></body></html>`;
}

export function MapRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(() => isGeoJson(content) ? buildGeoJsonDoc(content) : buildJsDoc(content), [content]);
  return (
    <iframe
      key={reloadKey}
      title="Map artifact"
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-popups"
      className="w-full h-full border-0"
    />
  );
}
