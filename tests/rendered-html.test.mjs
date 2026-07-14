import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Liliana's invitation shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Liliana(?:’|&#x27;)s First Birthday \| Under the Sea<\/title>/i);
  assert.match(html, /A little mermaid is turning one/i);
  assert.match(html, /Swim through the shimmer to reveal her party treasures/i);
  assert.match(html, /Open all party details/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps invitation content, illustrated assets, and face replacement centralized", async () => {
  const [eventConfig, objects, scene, mermaid, readme] = await Promise.all([
    readFile(new URL("../data/eventDetails.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/interactiveObjects.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/MermaidCharacter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(eventConfig, /celebrantName:\s*"Liliana"/);
  assert.match(scene, /requestAnimationFrame/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(mermaid, /mermaid-face-photo/);
  assert.match(mermaid, /baby-mermaid-main\.png/);
  assert.match(readme, /public\/images\/mermaid\/baby-face\.png/);
  assert.match(objects, /treasure-chest\.png/);
  assert.match(objects, /crab-cute\.png/);
  assert.doesNotMatch(objects, /\bicon\s*:/);
  await access(new URL("../public/images/underwater/background-main.png", import.meta.url));
  await access(new URL("../public/images/mermaid/baby-face-placeholder.png", import.meta.url));
});

test("uses Framer Motion and raster artwork instead of emoji icon circles", async () => {
  const [packageJson, objectComponent, ambient, css] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/InteractiveSeaObject.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/AmbientLayers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"framer-motion"/);
  assert.match(objectComponent, /<img className="sea-object-art"/);
  assert.match(ambient, /motion\.img/);
  assert.doesNotMatch(css, /\.sea-object-icon/);
  assert.doesNotMatch(css, /\.ambient-fish-item::before/);
});

test("gates scene dragging and allows vertical modal touch scrolling", async () => {
  const [scene, css] = await Promise.all([
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(scene, /data-dialog-open=\{showAllDetails \|\| undefined\}/);
  assert.match(scene, /onPointerDown=\{\(event\) => \{\s*if \(showAllDetails\) return;/);
  assert.match(scene, /onPointerMove=\{\(event\) => \{\s*if \(showAllDetails\) return;/);
  assert.match(scene, /releasePointerCapture\(activePointerId\)/);
  assert.match(css, /\.underwater-scene\[data-dialog-open\]\s*\{[^}]*touch-action:\s*pan-y/s);
  assert.match(css, /\.details-dialog\s*\{[^}]*overflow:\s*auto;[^}]*touch-action:\s*pan-y/s);
});
