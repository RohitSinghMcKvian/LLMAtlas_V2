"use client";

// Three.js scene renderer — accepts a snippet that exports a build/init function
// returning { scene, camera }, OR a full self-contained script that creates the
// scene on its own. Three.js + OrbitControls + a basic resize handler are
// preloaded so the model only writes the scene-building code.

import { useMemo } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";

interface Props {
  content: string;
  reloadKey?: number;
}

function buildDoc(src: string): string {
  const escaped = src.replace(/<\/script>/gi, "<\\/script>");
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>html,body{margin:0;height:100%;overflow:hidden;background:#0b1020;color:#e5e7eb;font-family:system-ui,sans-serif}#err{position:absolute;inset:0;padding:16px;font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;color:#fca5a5;font-size:12px;display:none}</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
  }
}
</script>
</head><body>
<div id="err"></div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(3,3,5);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  // Default lights — many models omit them; provide sensible defaults the user can override.
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // Make THREE + scene + camera + renderer available to the user snippet.
  window.THREE = THREE;
  window.__scene = scene;
  window.__camera = camera;
  window.__renderer = renderer;
  window.__controls = controls;

  // User snippet runs in this scope. It may add objects to \`scene\` and/or
  // define a global \`update(t)\` function that's called each frame.
  ${escaped}

  function loop(t){
    requestAnimationFrame(loop);
    if (typeof window.update === 'function') {
      try { window.update(t / 1000); } catch(e){ document.getElementById('err').style.display='block'; document.getElementById('err').textContent = String(e); }
    }
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
} catch(e){
  document.getElementById('err').style.display = 'block';
  document.getElementById('err').textContent = String(e && (e.stack||e.message));
  try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
}
</script>
</body></html>`;
}

export function ThreeRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(() => buildDoc(content), [content]);
  return (
    <iframe
      key={reloadKey}
      title="Three.js scene"
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
    />
  );
}
