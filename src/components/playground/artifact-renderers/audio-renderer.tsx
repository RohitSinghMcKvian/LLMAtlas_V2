"use client";

// Audio renderer — runs a Tone.js-based snippet that composes/plays music.
// Tone.js is preloaded; the snippet has access to `Tone` and can build
// synths, sequencers, effects. Iframe shows a Play/Stop control + visualiser.

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
<style>
  html,body{margin:0;height:100%;background:#0f0f17;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;flex-direction:column}
  header{padding:16px 20px;border-bottom:1px solid #1f2937;display:flex;align-items:center;gap:12px}
  button{appearance:none;border:0;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;font-weight:600;font-size:14px;padding:8px 16px;border-radius:8px;cursor:pointer;box-shadow:0 4px 12px rgba(139,92,246,.3)}
  button[disabled]{opacity:.5;cursor:not-allowed}
  button.stop{background:linear-gradient(135deg,#ef4444,#f97316)}
  #status{font-size:13px;color:#94a3b8;flex:1}
  #viz{flex:1;display:block;width:100%}
  #err{padding:16px;font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;color:#fca5a5;font-size:12px;display:none}
</style>
<script src="https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js"></script>
</head><body>
<header>
  <button id="play">▶ Play</button>
  <button id="stop" class="stop" disabled>■ Stop</button>
  <span id="status">Ready</span>
</header>
<canvas id="viz"></canvas>
<div id="err"></div>
<script>
(async function(){
  const status = document.getElementById('status');
  const playBtn = document.getElementById('play');
  const stopBtn = document.getElementById('stop');
  const err = document.getElementById('err');
  const canvas = document.getElementById('viz');
  const ctx2d = canvas.getContext('2d');
  function resize(){ canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; }
  resize(); window.addEventListener('resize', resize);

  let analyser = null;
  let userStop = null;

  playBtn.onclick = async () => {
    err.style.display='none'; err.textContent='';
    try {
      await Tone.start();
      status.textContent = 'Playing…';
      playBtn.disabled = true; stopBtn.disabled = false;
      // Always have a master analyser for visualisation.
      analyser = new Tone.Analyser('waveform', 512);
      Tone.Destination.connect(analyser);

      // Expose helpers for the user snippet.
      window.__onStop = (fn) => { userStop = fn; };

      // User snippet — may schedule notes, start the transport, etc.
      ${escaped}

      // If the snippet didn't start the transport itself, start it.
      if (Tone.Transport.state !== 'started') Tone.Transport.start();
      draw();
    } catch(e){
      err.style.display='block'; err.textContent = String(e && (e.stack||e.message));
      status.textContent = 'Error';
      playBtn.disabled = false; stopBtn.disabled = true;
      try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
    }
  };

  stopBtn.onclick = () => {
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      if (userStop) userStop();
      Tone.Destination.volume.rampTo(-Infinity, 0.05);
      setTimeout(() => { Tone.Destination.volume.value = 0; }, 100);
    } catch(_){}
    status.textContent = 'Stopped';
    playBtn.disabled = false; stopBtn.disabled = true;
  };

  function draw(){
    if (!analyser) return;
    const w = canvas.width, h = canvas.height;
    ctx2d.fillStyle = '#0f0f17';
    ctx2d.fillRect(0,0,w,h);
    const buf = analyser.getValue();
    ctx2d.strokeStyle = '#8b5cf6';
    ctx2d.lineWidth = 2 * devicePixelRatio;
    ctx2d.beginPath();
    for (let i = 0; i < buf.length; i++) {
      const x = (i / buf.length) * w;
      const y = (1 - (buf[i] * 0.5 + 0.5)) * h;
      if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();
    requestAnimationFrame(draw);
  }
})();
</script>
</body></html>`;
}

export function AudioRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(() => buildDoc(content), [content]);
  return (
    <iframe
      key={reloadKey}
      title="Audio artifact"
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      allow="autoplay"
      className="w-full h-full border-0"
    />
  );
}
