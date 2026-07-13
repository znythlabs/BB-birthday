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
  assert.match(html, /<title>Liliana’s First Birthday \| Under the Sea<\/title>/i);
  assert.match(html, /A little mermaid is turning one/i);
  assert.match(html, /Swim around to discover the party details/i);
  assert.match(html, /Open party details/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps invitation content and face replacement centralized", async () => {
  const [eventConfig, scene, mermaid, readme] = await Promise.all([
    readFile(new URL("../data/eventDetails.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/MermaidCharacter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(eventConfig, /celebrantName:\s*"Liliana"/);
  assert.match(scene, /requestAnimationFrame/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(mermaid, /mermaid-face-photo/);
  assert.match(readme, /public\/images\/mermaid\/baby-face\.png/);
  await access(new URL("../public/images/background/underwater.png", import.meta.url));
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
