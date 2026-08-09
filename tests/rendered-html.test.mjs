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
  assert.match(html, /Liliana(?:’|&#x27;)s First Birthday/i);
  assert.match(html, /Come swim, sparkle, and celebrate with us!/i);
  assert.match(html, /Move, tap, or drag to guide Liliana|Scroll to dive/i);
  await access(new URL("../public/images/ui/liliana-underwater-title.png", import.meta.url));

  assert.doesNotMatch(html, /scroll-dive-transition/);
  assert.match(html, /<video[^>]*class="[^\"]*underwater-background[^\"]*"[^>]*muted[^>]*loop[^>]*playsinline/i);
  assert.match(html, /<video[^>]*class="[^\"]*mermaid-video[^\"]*"[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline/i);
  assert.match(html, /<source[^>]*mermaid-transparent\.webm[^>]*type="video\/webm"/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
  const sceneSource = await readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8");
  assert.match(sceneSource, /startBgm\(\)/);
  assert.match(sceneSource, /bgmMuted/);
  assert.match(html, /mermaid-transparent\.webm/);
});

test("keeps one unified media stage above the normal-flow underwater handoff", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sequenceRule = css.match(/\.welcome-dive-sequence\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(
    css,
    /\.welcome-dive-pin\s*\{[^}]*isolation:\s*isolate;[^}]*z-index:\s*1/s,
  );
  assert.doesNotMatch(sequenceRule, /height\s*:/);
  assert.match(css, /\.welcome-dive-transition\s*\{[^}]*opacity:\s*0/);
  assert.match(css, /\.welcome-dive-underwater\s*\{[^}]*opacity:\s*0/);
  assert.doesNotMatch(css, /\.scroll-dive-transition\s*\{/);
  assert.match(
    css,
    /\.underwater-scene\[data-transitioning\]\s*>\s*:not\(\.underwater-background\)/,
  );
});

test("positions compact glass bubble from live geometry", async () => {
  const [scene, bubble, css] = await Promise.all([
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/BubbleMessage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(scene, /position=\{objectPositions\[activeObject\.kind\]\}/);
  assert.match(scene, /mermaidPosition=\{\{ x: mermaidVisual\.x, y: mermaidVisual\.y \}\}/);
  assert.match(scene, /mermaidWidth=\{mermaidVisual\.width\}/);
  assert.match(bubble, /overlapsMermaid/);
  assert.match(css, /\.scene-bgm-toggle[\s\S]*\.all-details-button[\s\S]*cursor: pointer !important/);
  assert.match(bubble, /sceneWidth/);
  assert.match(bubble, /mermaidPosition/);
  assert.match(css, /\.underwater-scene, \.underwater-scene \*/);
  assert.match(css, /cursor:\s*none/);
  assert.match(css, /\.bubble-message\s*\{[^}]*z-index:\s*18/);
  assert.match(css, /backdrop-filter: blur\(/);
});

test("keeps invitation content and WebM sea objects centralized", async () => {
  const [eventConfig, objects, scene, mermaid, readme] = await Promise.all([
    readFile(new URL("../data/eventDetails.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/seaObjects.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/MermaidCharacter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(eventConfig, /celebrantName:\s*"Liliana"/);
  assert.match(scene, /requestAnimationFrame/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(scene, /newunderwater\.mp4/);
  assert.match(mermaid, /mermaid-video/);
  assert.match(mermaid, /mermaid-transparent\.webm/);
  assert.match(objects, /videoSrc:/);
  assert.doesNotMatch(objects, /\bicon\s*:/);
  assert.match(readme, /public\/images\/underwater-v2\/interactives/);
  assert.doesNotMatch(readme, /underwater-v2\/mermaid|sea-elements|public\/images\/fish/);
  await access(new URL("../public/images/underwater/background-main.mp4", import.meta.url));
  await access(new URL("../public/images/mermaid/mermaid-transparent.webm", import.meta.url));
  await access(new URL("../public/images/underwater-v2/interactives/pearl-transparent.webm", import.meta.url));
  await access(new URL("../public/images/underwater-v2/interactives/fish-transparent.webm", import.meta.url));
  await access(new URL("../public/images/underwater-v2/interactives/turtle-transparent.webm", import.meta.url));
  await access(new URL("../public/images/underwater-v2/interactives/jellyfish-transparent.webm", import.meta.url));
  await access(new URL("../public/images/underwater-v2/interactives/crab-transparent.webm", import.meta.url));
  assert.match(objects, /kind: "treasure-chest"[\s\S]*?y: 90/);
  assert.match(objects, /kind: "crab"[\s\S]*?y: 92/);
  await access(new URL("../public/fonts/bodoni-moda-600-italic.woff2", import.meta.url));
});

test("uses WebM actors and exact projections without legacy cutouts", async () => {
  const [objectComponent, objects, ambient, mermaid, scene, projection, css] = await Promise.all([
    readFile(new URL("../components/underwater/InteractiveSeaObject.tsx", import.meta.url), "utf8"),
    readFile(new URL("../data/seaObjects.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/AmbientLayers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/MermaidCharacter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/underwaterProjection.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(objectComponent, /videoSrc = object\.videoSrc/);
  assert.match(objectComponent, /<video/);
  assert.match(objects, /crab-transparent\.webm/);
  assert.doesNotMatch(objectComponent, /renderSubject=/);
  assert.match(objects, /videoSrc/);
  assert.match(css, /\.sea-object-layer\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.sea-object-dedicated-shadow\s*\{[^}]*opacity:\s*0\.8[^}]*mix-blend-mode:\s*darken/);
  assert.doesNotMatch(css, /\.sea-object\s*\{[^}]*isolation:\s*isolate/);
  assert.match(css, /\.sea-object-video\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.sea-object-video\s*\{[^}]*height:\s*100%/);
  assert.match(css, /\.sea-object-video\s*\{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.sea-object-video\s*\{[^}]*display:\s*block/);
  assert.match(scene, /smoothToward/);
  assert.match(scene, /faceTowardTarget/);
  assert.match(scene, /advancePatrol/);
  assert.match(scene, /isNear/);
  assert.match(scene, /objectPositions/);
  assert.match(scene, /position=\{objectPositions\[object\.kind\]\}/);
  assert.match(mermaid, /mermaid-transparent\.webm/);
  assert.match(scene, /newunderwater\.mp4/);
  assert.doesNotMatch(mermaid, /mermaid-face-photo|baby-mermaid-body|baby-mermaid-tail/);
  assert.doesNotMatch(ambient, /ambient-fish|data-flee-fish/);
  assert.doesNotMatch(scene, /spriteCatalog|SpriteActor|underwater-v2\/mermaid/);
  assert.doesNotMatch(css, /\.sea-object\[data-grounded\]::before|\.mermaid-tail-art|\.mermaid-face-photo/);
  assert.doesNotMatch(css, /\.sea-object-icon/);
});

test("gates scene dragging and allows vertical modal touch scrolling", async () => {
  const [scene, css] = await Promise.all([
    readFile(new URL("../components/underwater/UnderwaterScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(scene, /data-dialog-open=\{showAllDetails \|\| undefined\}/);
  assert.match(scene, /onPointerDown=\{\(event\) => \{\s*if \(showAllDetails\) return;/);
  assert.match(scene, /onPointerMove=/);
  assert.match(scene, /releasePointerCapture\(activePointerId\)/);
  assert.match(css, /\.underwater-scene\[data-dialog-open\]\s*\{[^}]*touch-action:\s*pan-y/s);
  assert.match(css, /\.details-dialog\s*\{[^}]*overflow:\s*auto;[^}]*touch-action:\s*pan-y/s);
});
