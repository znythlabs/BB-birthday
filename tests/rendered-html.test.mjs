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
  assert.match(html, /A magical under-the-sea invitation/i);
  assert.match(html, /Open all party details/i);
  assert.match(html, /<img[^>]*underwater-background[^>]*background-main\.png/i);
  assert.doesNotMatch(html, /background-main\.mp4|<video/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps invitation content and the exact seven-actor sprite catalog centralized", async () => {
  const [eventConfig, objects, catalog, scene, mermaid, readme] = await Promise.all([
    readFile(new URL("../data/eventDetails.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/interactiveObjects.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/spriteCatalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/MermaidCharacter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(eventConfig, /celebrantName:\s*"Liliana"/);
  assert.match(scene, /requestAnimationFrame/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(scene, /background-main\.png/);
  assert.match(mermaid, /SpriteActor/);
  for (const id of ["mermaid", "pearl-shell", "fish-courier", "sea-turtle", "treasure-chest", "jellyfish", "crab"]) {
    assert.match(catalog, new RegExp(`(?:"${id}"|${id}):`));
  }
  assert.match(objects, /spriteCatalog/);
  assert.match(readme, /public\/images\/underwater-v2/);
  assert.doesNotMatch(objects, /\bicon\s*:/);
  await access(new URL("../public/images/underwater/background-main.png", import.meta.url));
  await access(new URL("../public/images/underwater-v2/mermaid/idle/sheet.png", import.meta.url));
  await access(new URL("../public/images/underwater-v2/interactives/crab/sheet.png", import.meta.url));
  await access(new URL("../public/fonts/bodoni-moda-600.woff2", import.meta.url));
  await access(new URL("../public/fonts/bodoni-moda-600-italic.woff2", import.meta.url));
});

test("uses multi-frame actors and exact-frame projections without legacy cutouts", async () => {
  const [objectComponent, ambient, mermaid, scene, spriteActor, projection, css] = await Promise.all([
    readFile(new URL("../components/underwater/InteractiveSeaObject.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/AmbientLayers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/MermaidCharacter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/SpriteActor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/underwaterProjection.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(objectComponent, /SpriteActor/);
  assert.match(mermaid, /spriteCatalog\.mermaid/);
  assert.match(spriteActor, /data-frame=\{displayedFrame\}/);
  assert.match(spriteActor, /sprite-actor-shadow/);
  assert.match(projection, /mermaidAltitude/);
  assert.match(projection, /projectShadow/);
  assert.doesNotMatch(scene, /background-main\.mp4|baby-mermaid-body|baby-mermaid-tail|dataset\.tailFrame/);
  assert.doesNotMatch(mermaid, /mermaid-face-photo|baby-mermaid-body|baby-mermaid-tail/);
  assert.doesNotMatch(ambient, /ambient-fish|data-flee-fish/);
  assert.doesNotMatch(css, /\.sea-object\[data-grounded\]::before|\.mermaid-tail-art|\.mermaid-face-photo/);
  assert.doesNotMatch(css, /\.sea-object-icon/);
  assert.doesNotMatch(spriteActor, /drop-shadow/);
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
