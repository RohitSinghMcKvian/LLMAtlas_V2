// Standalone test harness — assumes you ran `npx tsc src/lib/artifacts.ts --outDir .tmp-test ...` first.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { detectArtifacts } = await import(pathToFileURL(resolve('.tmp-test/artifacts.js')).href);

const cases = [
  {
    name: 'HTML fenced block (long)',
    input: 'Here is a tip calculator:\n\n```html\n<!doctype html>\n<html><head><title>Tip</title></head>\n<body>\n  <h1>Tip Calculator</h1>\n  <input id="bill" type="number" value="100">\n  <input id="pct" type="number" value="15">\n  <div id="out"></div>\n  <script>\n    const upd=()=>out.textContent=(+bill.value*+pct.value/100).toFixed(2);\n    bill.oninput=pct.oninput=upd; upd();\n  </script>\n</body></html>\n```\n\nLet me know if you want changes.',
    expect: { count: 1, kind: 'html' },
  },
  {
    name: 'SVG fenced',
    input: 'Logo:\n```svg\n<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="tomato"/></svg>\n```',
    expect: { count: 1, kind: 'svg' },
  },
  {
    name: 'Mermaid fenced',
    input: 'Flow:\n```mermaid\nflowchart LR\nA-->B\nB-->C\nC-->A\n```',
    expect: { count: 1, kind: 'mermaid' },
  },
  {
    name: '<artifact> tag wraps HTML',
    input: 'Sure!\n<artifact identifier="dashboard" type="html" title="Dashboard">\n<!doctype html><html><body><h1>Hi</h1></body></html>\n</artifact>',
    expect: { count: 1, kind: 'html', externalId: 'dashboard', title: 'Dashboard' },
  },
  {
    name: 'Short fenced code is ignored (under threshold)',
    input: '```js\nconst x = 1;\n```',
    expect: { count: 0 },
  },
  {
    name: 'Long fenced TS gets captured as "code"',
    input: '```ts\nfunction a(){\n  return 1\n}\nfunction b(){\n  return 2\n}\nfunction c(){\n  return 3\n}\nfunction d(){\n  return 4\n}\n```',
    expect: { count: 1, kind: 'code' },
  },
  {
    name: 'Multiple artifacts, sorted by position',
    input: '```html\n<!doctype html>\n<html><body><h1>A</h1></body></html>\n```\n\n```svg\n<svg><circle/></svg>\n```',
    expect: { count: 2 },
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = detectArtifacts(c.input);
  let ok = got.length === c.expect.count;
  if (ok && c.expect.kind) ok = got[0]?.kind === c.expect.kind;
  if (ok && c.expect.externalId) ok = got[0]?.externalId === c.expect.externalId;
  if (ok && c.expect.title) ok = got[0]?.title === c.expect.title;
  if (ok) { pass++; console.log(`  PASS  ${c.name}`); }
  else { fail++; console.log(`  FAIL  ${c.name}\n        got: ${JSON.stringify(got.map(d => ({ kind: d.kind, title: d.title, externalId: d.externalId })))}\n        expected: ${JSON.stringify(c.expect)}`); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
