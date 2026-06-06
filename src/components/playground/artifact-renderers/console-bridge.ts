// Shared sandbox → parent console/error bridge, injected as the first <head> child of
// any live-preview iframe (HTML and React artifacts). It intercepts console.* and
// runtime errors and forwards them to the parent window via postMessage, where the
// artifact panel collects them into its Console drawer. The receiver listens for
// messages shaped like { __llmatlas_console: true, level, text }.
export const CONSOLE_BRIDGE = `<script>(function(){
  function send(level, args){
    try{
      var text = Array.prototype.map.call(args, function(a){
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch(e){ return String(a); } }
        return String(a);
      }).join(' ');
      parent.postMessage({ __llmatlas_console: true, level: level, text: text }, '*');
    }catch(e){}
  }
  ['log','info','warn','error'].forEach(function(level){
    var orig = console[level];
    console[level] = function(){ send(level, arguments); if(orig) orig.apply(console, arguments); };
  });
  window.addEventListener('error', function(e){ send('error', [e.message + (e.filename ? ' ('+e.filename+':'+e.lineno+')' : '')]); });
  window.addEventListener('unhandledrejection', function(e){ send('error', ['Unhandled promise rejection: ' + (e.reason && e.reason.stack || e.reason)]); });
})();<\/script>`;
