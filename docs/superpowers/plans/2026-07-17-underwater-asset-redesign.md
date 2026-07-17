# Underwater Asset Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every foreground asset with a Spriterrific-produced, multi-frame underwater-v2 cast that matches the new background, preserves Liliana's identity and outfit, retains every unkeyed source, and uses silhouette-derived dynamic shadows.

**Architecture:** Produce approved high-fidelity anchors first, then drive those anchors through Spriterrific's hosted reference-preserving animation, dense-frame curation, and chroma-cleanup workflow. Promote only reviewed exports into a versioned runtime catalog; render each spritesheet through a shared actor component whose subject and shadow use the same frame index, while pure projection helpers calculate realistic seabed placement from altitude, motion, and perspective.

**Tech Stack:** Spriterrific hosted API and frame picker, built-in image generation for reference-anchor creation, React 19, TypeScript 5.9, Framer Motion 12, CSS transforms/filters, Node.js 22 built-in test runner, vinext/Vite.

## Global Constraints

- `public/images/underwater/background-main.png` is the immutable visual and composition reference.
- Liliana must match `DSC_8227.jpg` and `DSC_8280.jpg`, including the lavender bow, magenta shell top, and emerald scaled tail.
- Do not include a pearl necklace, loose pearl strand, or handheld beads.
- Use high-fidelity/reference-preserving output with pixel snapping disabled.
- No final animated subject may use a two-image alternation.
- Preserve provider video, every unkeyed dense frame, selected unkeyed frames, contact sheets, keyed frames, manual fixes, job JSON, costs, warnings, and engine version.
- Never overwrite raw artifacts; repaired masks are sibling files with provenance.
- No generic ellipse, CSS drop-shadow, or decorative blob may stand in for a subject shadow.
- Every shadow must use the exact subject frame silhouette and remain synchronized with it.
- Do not enqueue a paid Spriterrific job until balance and expected debit are reported and the user approves that debit.
- Never print, commit, or hardcode `SPRITERRIFIC_API_KEY`.
- Existing foreground assets remain untouched until the new set passes verification; code references change only during final integration.

---

## File and Responsibility Map

- `docs/assets/underwater-v2-production.json`: committed production contract, prompts, actions, frame counts, and archive requirements.
- `.codex/skills/spriterrific-api/SKILL.md`: locally installed hosted Spriterrific agent skill; do not commit secrets.
- `spriterrific-runs/`: local non-destructive production archive; preserved locally and ignored by Git because it contains large raw videos and dense frames.
- `public/images/underwater-v2/`: approved runtime-only anchors, spritesheets, previews, and manifests.
- `data/spriteCatalog.ts`: typed runtime catalog containing exact paths, counts, FPS, widths, and shadow behavior.
- `lib/spriteRuntime.mjs`: pure frame-index and sheet-position helpers shared by React and Node tests.
- `lib/underwaterProjection.mjs`: pure altitude and shadow-projection calculations.
- `components/underwater/SpriteActor.tsx`: synchronized subject and silhouette-shadow renderer.
- `components/underwater/MermaidCharacter.tsx`: Liliana action/expression actor.
- `components/underwater/InteractiveSeaObject.tsx`: manifest-driven object actor with idle/active states.
- `components/underwater/UnderwaterScene.tsx`: movement, altitude, action transitions, proximity, and projection state.
- `components/underwater/AmbientLayers.tsx`: background-only atmospheric overlays; removes redundant foreground fish.
- `data/interactiveObjects.ts`: redesigned cast, placements, content mapping, and manifest IDs.
- `app/globals.css`: new background image, spritesheet framing, realistic projected-shadow styling, responsive placement, and reduced motion.
- `tests/asset-contract.test.mjs`: production-contract and archive-rule tests.
- `tests/sprite-runtime.test.mjs`: deterministic frame and shadow math tests.
- `tests/rendered-html.test.mjs`: server-rendered asset path, accessibility, and obsolete-reference checks.

---

### Task 1: Establish the Spriterrific production contract and credential gate

**Files:**
- Create: `docs/assets/underwater-v2-production.json`
- Create: `tests/asset-contract.test.mjs`
- Modify: `.gitignore`
- Modify: `README.md`
- Local-only create: `.codex/skills/spriterrific-api/SKILL.md`

**Interfaces:**
- Produces: the seven asset IDs `mermaid`, `pearl-shell`, `fish-courier`, `sea-turtle`, `treasure-chest`, `jellyfish`, and `crab`.
- Produces: the required local archive directories consumed by Tasks 2-5.

- [ ] **Step 1: Write the failing production-contract test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("underwater-v2 contract preserves raw artifacts and exact cast", async () => {
  const contract = JSON.parse(await readFile(new URL("../docs/assets/underwater-v2-production.json", import.meta.url)));
  assert.deepEqual(contract.assets.map((asset) => asset.id), [
    "mermaid", "pearl-shell", "fish-courier", "sea-turtle", "treasure-chest", "jellyfish", "crab",
  ]);
  assert.deepEqual(contract.archive.requiredDirectories, [
    "reference", "raw-unkeyed/provider-video", "raw-unkeyed/dense-frames",
    "raw-unkeyed/contact-sheets", "selected-unkeyed", "keyed", "manual-fixes", "shadows", "final",
  ]);
  assert.equal(contract.liliana.forbidden.includes("pearl necklace"), true);
  assert.equal(contract.rendering.pixelSnap, false);
});
```

- [ ] **Step 2: Run the test and verify the contract is missing**

Run: `node --test tests/asset-contract.test.mjs`

Expected: FAIL with `ENOENT` for `docs/assets/underwater-v2-production.json`.

- [ ] **Step 3: Create the exact production contract**

```json
{
  "sceneReference": "public/images/underwater/background-main.png",
  "rendering": { "style": "cinematic stylized 3D storybook", "pixelSnap": false, "candidatePreset": "preserve-reference-v1" },
  "liliana": {
    "references": ["DSC_8227.jpg", "DSC_8280.jpg"],
    "required": ["exact facial identity", "lavender glitter bow", "magenta sequined shell top", "emerald scaled mermaid tail"],
    "forbidden": ["pearl necklace", "loose pearl strand", "handheld beads"]
  },
  "archive": {
    "root": "spriterrific-runs",
    "requiredDirectories": ["reference", "raw-unkeyed/provider-video", "raw-unkeyed/dense-frames", "raw-unkeyed/contact-sheets", "selected-unkeyed", "keyed", "manual-fixes", "shadows", "final"]
  },
  "assets": [
    { "id": "mermaid", "clips": { "idle": 8, "swim": 12, "discover": 10 } },
    { "id": "pearl-shell", "clips": { "open": 8 } },
    { "id": "fish-courier", "clips": { "swim": 10 } },
    { "id": "sea-turtle", "clips": { "swim": 10 } },
    { "id": "treasure-chest", "clips": { "open": 8 } },
    { "id": "jellyfish", "clips": { "pulse": 8 } },
    { "id": "crab", "clips": { "wave": 8 } }
  ]
}
```

- [ ] **Step 4: Ignore only the local raw run archive and document its retention**

Append to `.gitignore`:

```gitignore
# Spriterrific raw production archive is preserved locally; approved runtime exports live in public/images/underwater-v2.
/spriterrific-runs/
```

Add to `README.md`:

```markdown
## Underwater-v2 asset production

Raw Spriterrific runs live in `spriterrific-runs/` and must not be deleted. Each run retains provider video, dense unkeyed frames, selected unkeyed frames, keyed frames, manual fixes, shadows, final exports, and `job.json`. Approved runtime assets are copied to `public/images/underwater-v2/` only after visual review.
```

- [ ] **Step 5: Install and verify the hosted Spriterrific skill locally**

```powershell
New-Item -ItemType Directory -Force .codex/skills/spriterrific-api | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/chongdashu/spriterrific-skills/main/skills/spriterrific-api/SKILL.md" -OutFile ".codex/skills/spriterrific-api/SKILL.md"
Test-Path .codex/skills/spriterrific-api/SKILL.md
```

Expected: `True`.

- [ ] **Step 6: Check credentials and balance without exposing the key**

```powershell
if (-not $env:SPRITERRIFIC_API_KEY) { throw "Set SPRITERRIFIC_API_KEY locally before generation." }
$headers = @{ Authorization = "Bearer $env:SPRITERRIFIC_API_KEY" }
$me = Invoke-RestMethod -Headers $headers -Uri "https://courteous-mouse-611.convex.site/api/v1/me"
$me | Select-Object planCredits,topupCredits,total
```

Expected: a numeric `total`. Stop before enqueueing if the key is missing or the user has not approved the reported debit.

- [ ] **Step 7: Run tests and commit the production contract**

Run: `node --test tests/asset-contract.test.mjs`

Expected: PASS.

```powershell
git add .gitignore README.md docs/assets/underwater-v2-production.json tests/asset-contract.test.mjs
git commit -m "chore: define underwater v2 asset contract"
```

---

### Task 2: Produce and approve Liliana's identity-preserving Spriterrific clips

**Files:**
- Source: `E:/DOWNLOADS/DSC_8227.jpg`
- Source: `E:/DOWNLOADS/DSC_8280.jpg`
- Source: `public/images/underwater/background-main.png`
- Local create: `spriterrific-runs/mermaid-smile/reference/anchor-source.png`
- Local create: `spriterrific-runs/mermaid-laugh/reference/anchor-source.png`
- Local create: complete raw archives for smile, laugh, and swim jobs

**Interfaces:**
- Produces: approved `idle` 8-frame, `swim` 12-frame, and `discover` 10-frame exports for Task 5.
- Produces: two approved full-body identity anchors; no face-overlay cutouts.

- [ ] **Step 1: Generate the gentle-smile full-body anchor with all three reference images**

Use the built-in image-generation path with `DSC_8227.jpg` as the primary identity/expression reference, `DSC_8280.jpg` as the supporting identity/outfit reference, and `background-main.png` as the style/lighting reference. Save the result non-destructively as `spriterrific-runs/mermaid-smile/reference/anchor-source.png`.

```text
Use case: identity-preserve
Asset type: full-body game-animation reference anchor
Primary request: Render this exact baby as a swimming mermaid in the cinematic stylized 3D storybook quality of the underwater reference. Preserve her gentle closed-mouth smile, facial proportions, eyes, cheeks, black pigtails, lavender glitter bow, magenta sequined shell top, and emerald scaled mermaid tail.
Composition: complete full body in side-facing swimming pose, every hair tip, finger, fin, and tail tip visible, generous padding.
Lighting: bright cyan overhead underwater light with cool blue underside fill.
Background: perfectly flat saturated matte selected after checking the outfit colors; no floor, cast shadow, gradient, or reflections.
Avoid: pearl necklace, loose pearl strand, handheld beads, cropped anatomy, generic cartoon face, extra fingers, text, watermark.
```

- [ ] **Step 2: Generate the matching laughing full-body anchor**

Repeat with `DSC_8280.jpg` as the primary expression reference. Preserve the same body proportions, outfit, tail construction, bow, camera angle, canvas placement, and lighting. Save as `spriterrific-runs/mermaid-laugh/reference/anchor-source.png`.

- [ ] **Step 3: Review anchors before spending Spriterrific credits**

Open both anchors at original resolution and reject either if identity, expression, outfit, complete silhouette, or no-pearl requirements fail. Do not enqueue until the user approves both anchors.

- [ ] **Step 4: Upload each approved anchor through the Spriterrific Quickstart reference-image flow**

For `liliana-smile`, select only `idle`. For `liliana-laugh`, select only `idle`. The expected debit is `160` credits per reference-image character job (`2 × 30 + 1 × 100`). Report `320` total and obtain approval immediately before submission.

Expected: two returned job IDs and live URLs at `https://app.spriterrific.com/jobs/{jobId}`.

- [ ] **Step 5: Enqueue the custom swim action from the approved smile job**

```powershell
$base = "https://courteous-mouse-611.convex.site"
$headers = @{ Authorization = "Bearer $env:SPRITERRIFIC_API_KEY"; "Content-Type" = "application/json" }
$jobs = (Invoke-RestMethod -Headers $headers -Uri "$base/api/v1/jobs?limit=25").jobs
$smileJobId = ($jobs | Where-Object characterName -eq "liliana-smile" | Select-Object -First 1).id
$laughJobId = ($jobs | Where-Object characterName -eq "liliana-laugh" | Select-Object -First 1).id
$body = @{
  type = "action"
  characterName = "liliana-smile"
  referenceJobId = $smileJobId
  actions = @("swim")
  actionBaselines = @{ swim = "walk" }
  actionContext = "gentle underwater tail-kick loop, relaxed arms, exact identity and outfit"
} | ConvertTo-Json -Depth 5
$swimJob = Invoke-RestMethod -Method Post -Headers $headers -Body $body -Uri "$base/api/v1/jobs"
$swimJobId = $swimJob.jobId
```

Expected debit: `100` credits. Obtain approval before posting.

- [ ] **Step 6: Poll patiently and preserve all artifacts**

Poll each job about every 15 seconds. Save the final response as `job.json`; download every artifact including raw video, contact sheet, run index, spritesheet, preview, and manifest. Call the frames endpoint and preserve its dense-frame files. Also extract lossless full-resolution unkeyed frames from the archived provider video so the archive never depends on thumbnail resolution:

```powershell
$records = @(
  @{ Name = "mermaid-smile"; Id = $smileJobId },
  @{ Name = "mermaid-laugh"; Id = $laughJobId },
  @{ Name = "mermaid-swim"; Id = $swimJobId }
)
foreach ($record in $records) {
  $suffix = $record.Id.Substring($record.Id.Length - 8)
  $runDir = Join-Path "spriterrific-runs" "$($record.Name)-$suffix"
  New-Item -ItemType Directory -Force "$runDir/raw-unkeyed/dense-frames" | Out-Null
  ffmpeg -i "$runDir/raw-unkeyed/provider-video/raw-video.mp4" -vsync 0 -compression_level 0 "$runDir/raw-unkeyed/dense-frames/frame-%04d.png"
}
```

Expected: sequential PNG frames whose dimensions match the provider video.

- [ ] **Step 7: Curate exact multi-frame clips**

Use the frame picker to produce:

- Smile job `idle`: 8 coherent frames.
- Swim action: 12 coherent frames with a closed tail cycle.
- Laugh job `idle`, promoted as `discover`: 10 coherent laughing/reaction frames.

Activate the selected versions, re-fetch each job, download the updated canonical artifacts, and preserve both original and selected unkeyed frames.

- [ ] **Step 8: Run the identity and masking gate**

Reject any selected frame with changed identity, lost hair/bow/finger/tail detail, pearl jewelry, transparent holes, chroma fringe, crop, canvas recentering, or outfit drift. Repair masking from `selected-unkeyed/`; never paint over or replace the raw file.

---

### Task 3: Produce the floating interactive Spriterrific cast

**Files:**
- Source: `public/images/underwater/background-main.png`
- Local create: `spriterrific-runs/fish-courier-*`
- Local create: `spriterrific-runs/sea-turtle-*`
- Local create: `spriterrific-runs/jellyfish-*`

**Interfaces:**
- Produces: fish `swim` 10 frames, turtle `swim` 10 frames, and jellyfish `pulse` 8 frames.

- [ ] **Step 1: Create three complete reference anchors using the background as style reference**

Use separate built-in image-generation calls and save each unkeyed anchor. Common prompt contract:

```text
Use case: stylized-concept
Asset type: full-subject game-animation reference anchor
Style: cinematic stylized 3D storybook rendering matching the supplied underwater background exactly
Lighting: overhead cyan water light, blue underside fill, restrained coral-pink bounce
Composition: complete isolated subject, side-facing, generous padding, no cropped fins or tentacles
Background: perfectly flat removable chroma matte, no cast shadow or floor
Avoid: text, watermark, generic icon style, black outline, missing anatomy
```

Subject additions:

- Fish: small turquoise body, lavender fins, pearlescent highlights, friendly but not toy-like.
- Turtle: sea-green shell with lavender/coral accents, kind expression, realistic flipper structure.
- Jellyfish: translucent lavender bell, complete tentacles, soft cyan rim light; keep translucency readable without holes.

- [ ] **Step 2: Review all three anchors at original resolution**

Reject anchors that do not match the background's material quality, light direction, scale language, or complete silhouette.

- [ ] **Step 3: Enqueue minimal reference jobs and custom actions**

Upload each accepted anchor through Quickstart using only `idle` as the starter animation. Report and approve `160` credits per job before submission. After each anchor job completes, enqueue one `100`-credit custom action:

```json
[
  { "characterName": "fish-courier", "actions": ["swim"], "actionBaselines": { "swim": "walk" }, "actionContext": "calm level swim, alternating fin strokes, exact return pose for a clean loop" },
  { "characterName": "sea-turtle", "actions": ["swim"], "actionBaselines": { "swim": "walk" }, "actionContext": "slow graceful flipper strokes with one gentle welcoming nod, clean loop" },
  { "characterName": "jellyfish", "actions": ["pulse"], "actionBaselines": { "pulse": "idle" }, "actionContext": "soft bell contraction and complete tentacle drift, exact closed buoyant loop" }
]
```

- [ ] **Step 4: Preserve, extract, and curate**

Download every raw artifact and dense frame. Frame-pick fish to 10, turtle to 10, and jellyfish to 8 selected frames. Preserve unkeyed selections before any cleanup.

- [ ] **Step 5: Run silhouette and loop review**

Reject missing fins, collapsed shells, disappearing tentacles, matte erosion, position popping, and non-closing loops. Repair masks from the selected unkeyed frames.

---

### Task 4: Produce the grounded interactive Spriterrific cast

**Files:**
- Source: `public/images/underwater/background-main.png`
- Local create: `spriterrific-runs/pearl-shell-*`
- Local create: `spriterrific-runs/treasure-chest-*`
- Local create: `spriterrific-runs/crab-*`

**Interfaces:**
- Produces: shell `open` 8 frames, chest `open` 8 frames, and crab `wave` 8 frames.

- [ ] **Step 1: Create complete grounded reference anchors**

Use the Task 3 common style/lighting prompt, but require a stable bottom contact plane and no baked shadow. Subject additions:

- Shell: luminous pearlescent clam, sculpted hinge, pale pink/lavender inner surface.
- Chest: elegant weathered teal-bronze chest with restrained pearl/coral inlay and readable lid hinge.
- Crab: coral-pink crab with complete claws and legs, friendly expression, realistic 3D storybook materials.

- [ ] **Step 2: Review anchors before credit spend**

Confirm complete contact anatomy, consistent front/side angle, and no baked floor or cast shadow.

- [ ] **Step 3: Enqueue reference jobs and custom actions**

Upload each reference with only `idle`, report `160` credits per job, then enqueue one custom action per accepted job after reporting the additional `100` credits:

```json
[
  { "characterName": "pearl-shell", "actions": ["open"], "actionBaselines": { "open": "interact" }, "actionContext": "hinge opens smoothly from fully closed to a luminous interior, no hopping" },
  { "characterName": "treasure-chest", "actions": ["open"], "actionBaselines": { "open": "interact" }, "actionContext": "lid opens on its hinge with restrained inner glow, base remains fixed on sand" },
  { "characterName": "crab", "actions": ["wave"], "actionBaselines": { "wave": "idle" }, "actionContext": "one claw waves gently then returns to the exact grounded rest pose" }
]
```

- [ ] **Step 4: Preserve and curate exact 8-frame actions**

Download every raw artifact, extract dense frames, select 8 frames per action, and activate the reviewed version.

- [ ] **Step 5: Run grounded-contact and masking review**

Reject base sliding, hinge deformation, disappearing legs/claws, crop, holes, or any baked shadow that would conflict with runtime projection.

---

### Task 5: Promote reviewed exports into a typed runtime catalog

**Files:**
- Create: `public/images/underwater-v2/**`
- Create: `data/spriteCatalog.ts`
- Modify: `tests/asset-contract.test.mjs`

**Interfaces:**
- Produces: `SpriteClip`, `SpriteAsset`, and `spriteCatalog` for Tasks 6-8.

- [ ] **Step 1: Extend the failing asset test to require every runtime export**

```js
const runtimeFiles = [
  "mermaid/idle/spritesheet.png", "mermaid/swim/spritesheet.png", "mermaid/discover/spritesheet.png",
  "interactives/pearl-shell/open/spritesheet.png", "interactives/fish-courier/swim/spritesheet.png",
  "interactives/sea-turtle/swim/spritesheet.png", "interactives/treasure-chest/open/spritesheet.png",
  "interactives/jellyfish/pulse/spritesheet.png", "interactives/crab/wave/spritesheet.png",
];
for (const path of runtimeFiles) {
  await access(new URL(`../public/images/underwater-v2/${path}`, import.meta.url));
}
```

- [ ] **Step 2: Run the test and verify exports are absent**

Run: `node --test tests/asset-contract.test.mjs`

Expected: FAIL on the first missing `underwater-v2` spritesheet.

- [ ] **Step 3: Copy only accepted final artifacts into the versioned tree**

Use one row per spritesheet, with the exact curated counts from the contract. Copy the corresponding Spriterrific manifest and preview beside each sheet. Do not copy raw videos or dense frames into `public/`.

- [ ] **Step 4: Create the typed catalog**

```ts
export type SpriteClip = {
  sheet: string;
  frameWidth: 256;
  frameHeight: 256;
  frames: number;
  columns: number;
  fps: number;
  loop: boolean;
};

export type SpriteAsset = {
  id: string;
  width: number;
  grounded: boolean;
  clips: Record<string, SpriteClip>;
};

const clip = (sheet: string, frames: number, fps: number, loop = true): SpriteClip => ({
  sheet, frameWidth: 256, frameHeight: 256, frames, columns: frames, fps, loop,
});

export const spriteCatalog = {
  mermaid: { id: "mermaid", width: 300, grounded: false, clips: {
    idle: clip("/images/underwater-v2/mermaid/idle/spritesheet.png", 8, 8),
    swim: clip("/images/underwater-v2/mermaid/swim/spritesheet.png", 12, 12),
    discover: clip("/images/underwater-v2/mermaid/discover/spritesheet.png", 10, 10, false),
  } },
  "pearl-shell": { id: "pearl-shell", width: 180, grounded: true, clips: { open: clip("/images/underwater-v2/interactives/pearl-shell/open/spritesheet.png", 8, 8, false) } },
  "fish-courier": { id: "fish-courier", width: 110, grounded: false, clips: { swim: clip("/images/underwater-v2/interactives/fish-courier/swim/spritesheet.png", 10, 10) } },
  "sea-turtle": { id: "sea-turtle", width: 150, grounded: false, clips: { swim: clip("/images/underwater-v2/interactives/sea-turtle/swim/spritesheet.png", 10, 8) } },
  "treasure-chest": { id: "treasure-chest", width: 175, grounded: true, clips: { open: clip("/images/underwater-v2/interactives/treasure-chest/open/spritesheet.png", 8, 8, false) } },
  jellyfish: { id: "jellyfish", width: 125, grounded: false, clips: { pulse: clip("/images/underwater-v2/interactives/jellyfish/pulse/spritesheet.png", 8, 8) } },
  crab: { id: "crab", width: 130, grounded: true, clips: { wave: clip("/images/underwater-v2/interactives/crab/wave/spritesheet.png", 8, 8, false) } },
} satisfies Record<string, SpriteAsset>;

export type SpriteAssetId = keyof typeof spriteCatalog;
```

- [ ] **Step 5: Run the asset test and commit approved runtime assets**

Run: `node --test tests/asset-contract.test.mjs`

Expected: PASS.

```powershell
git add public/images/underwater-v2 data/spriteCatalog.ts tests/asset-contract.test.mjs
git commit -m "feat: add approved underwater v2 sprite exports"
```

---

### Task 6: Implement the synchronized spritesheet runtime

**Files:**
- Create: `lib/spriteRuntime.mjs`
- Create: `components/underwater/SpriteActor.tsx`
- Create: `tests/sprite-runtime.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `frameAtTime(elapsedMs, fps, frames, loop)` and `sheetPosition(frame, columns)`.
- Produces: `<SpriteActor asset clip playing shadow />` consumed by Tasks 7-8.

- [ ] **Step 1: Write failing deterministic frame tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { frameAtTime, sheetPosition } from "../lib/spriteRuntime.mjs";

test("loops a 12-frame swim clip at 12 fps", () => {
  assert.equal(frameAtTime(0, 12, 12, true), 0);
  assert.equal(frameAtTime(500, 12, 12, true), 6);
  assert.equal(frameAtTime(1000, 12, 12, true), 0);
});

test("holds the final frame for one-shot clips", () => {
  assert.equal(frameAtTime(5000, 8, 8, false), 7);
});

test("returns exact one-row sheet position", () => {
  assert.deepEqual(sheetPosition(3, 8), { xPercent: 42.857142857142854, yPercent: 0 });
});
```

- [ ] **Step 2: Run tests and verify missing module failure**

Run: `node --test tests/sprite-runtime.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the pure runtime helpers**

```js
export function frameAtTime(elapsedMs, fps, frames, loop) {
  const raw = Math.floor(Math.max(0, elapsedMs) / (1000 / fps));
  return loop ? raw % frames : Math.min(raw, frames - 1);
}

export function sheetPosition(frame, columns) {
  const column = frame % columns;
  return { xPercent: columns === 1 ? 0 : (column / (columns - 1)) * 100, yPercent: 0 };
}
```

- [ ] **Step 4: Implement `SpriteActor` so subject and shadow share one frame**

The component uses one animation clock, computes one `backgroundPosition`, and applies it to subject, cast-shadow, and contact-shadow layers. It pauses while hidden, resets when clips change, and respects one-shot clips.

```tsx
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { SpriteClip } from "@/data/spriteCatalog";
import { frameAtTime, sheetPosition } from "@/lib/spriteRuntime.mjs";

export type ShadowVisual = {
  containerStyle: CSSProperties;
  contactStyle?: CSSProperties;
};

type Props = {
  clip: SpriteClip;
  width: number;
  playing?: boolean;
  shadow?: ShadowVisual;
  className?: string;
};

export function SpriteActor({ clip, width, playing = true, shadow, className }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!playing) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      if (!document.hidden) setElapsed(performance.now() - started);
    }, 1000 / clip.fps);
    return () => window.clearInterval(timer);
  }, [clip, playing]);

  const frame = frameAtTime(elapsed, clip.fps, clip.frames, clip.loop);
  const { xPercent } = sheetPosition(frame, clip.columns);
  const frameStyle = {
    width,
    height: width,
    backgroundImage: `url(${clip.sheet})`,
    backgroundSize: `${clip.columns * 100}% 100%`,
    backgroundPosition: `${xPercent}% 0`,
  } satisfies CSSProperties;

  return (
    <span className={`sprite-actor ${className ?? ""}`} data-frame={frame}>
      {shadow ? <span className="sprite-shadow-window" style={shadow.containerStyle} aria-hidden="true"><span className="sprite-frame sprite-shadow-frame" style={frameStyle} /></span> : null}
      {shadow?.contactStyle ? <span className="sprite-contact-window" style={shadow.contactStyle} aria-hidden="true"><span className="sprite-frame sprite-contact-frame" style={frameStyle} /></span> : null}
      <span className="sprite-frame sprite-subject-frame" style={frameStyle} />
    </span>
  );
}
```

- [ ] **Step 5: Expand the test script and verify**

Change `package.json`:

```json
"test": "npm run build && node --test tests/*.test.mjs"
```

Run: `node --test tests/sprite-runtime.test.mjs && npm run typecheck`

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit the sprite runtime**

```powershell
git add package.json lib/spriteRuntime.mjs components/underwater/SpriteActor.tsx tests/sprite-runtime.test.mjs
git commit -m "feat: add synchronized sprite runtime"
```

---

### Task 7: Implement realistic altitude-aware silhouette shadows

**Files:**
- Create: `lib/underwaterProjection.mjs`
- Modify: `tests/sprite-runtime.test.mjs`
- Modify: `components/underwater/SpriteActor.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `mermaidAltitude(y, sceneHeight)` and `projectShadow(input)` for Task 8.
- Produces: `ShadowVisual` styles using the exact active subject frame.

- [ ] **Step 1: Write failing projection tests**

```js
import { mermaidAltitude, projectShadow } from "../lib/underwaterProjection.mjs";

test("raises altitude as Liliana swims upward", () => {
  assert.equal(mermaidAltitude(720, 900), 0);
  assert.ok(mermaidAltitude(300, 900) > 0.7);
});

test("farther shadows are lighter and softer", () => {
  const near = projectShadow({ x: 500, y: 700, sceneWidth: 1000, sceneHeight: 900, altitude: 0, speed: 0, facing: 1 });
  const high = projectShadow({ x: 500, y: 300, sceneWidth: 1000, sceneHeight: 900, altitude: 0.8, speed: 0, facing: 1 });
  assert.ok(near.opacity > high.opacity);
  assert.ok(near.blurPx < high.blurPx);
  assert.ok(high.groundY > 300);
});
```

- [ ] **Step 2: Run and verify missing exports**

Run: `node --test tests/sprite-runtime.test.mjs`

Expected: FAIL because projection helpers do not exist.

- [ ] **Step 3: Implement floor projection and physical falloff**

```js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (from, to, amount) => from + (to - from) * amount;

export function mermaidAltitude(y, sceneHeight) {
  return clamp((sceneHeight * 0.78 - y) / (sceneHeight * 0.55), 0, 1);
}

export function projectShadow({ x, y, sceneWidth, sceneHeight, altitude, speed, facing }) {
  const towardCenter = (sceneWidth * 0.5 - x) * 0.05 * altitude;
  const groundY = clamp(y + sceneHeight * mix(0.07, 0.23, altitude), sceneHeight * 0.56, sceneHeight * 0.93);
  return {
    groundX: x + towardCenter,
    groundY,
    opacity: mix(0.36, 0.08, altitude),
    blurPx: mix(3, 20, altitude),
    scaleX: (1 + clamp(speed / 1400, 0, 0.22)) * facing,
    scaleY: mix(0.28, 0.12, altitude),
    skewXDeg: facing * mix(-8, -3, altitude),
  };
}
```

- [ ] **Step 4: Style actual silhouette projections, not generic shapes**

```css
.sprite-shadow-window,
.sprite-contact-window {
  position: absolute;
  left: 50%;
  top: 50%;
  overflow: hidden;
  pointer-events: none;
  transform-origin: 50% 100%;
  mix-blend-mode: multiply;
}

.sprite-shadow-frame,
.sprite-contact-frame {
  filter: brightness(0) saturate(100%) sepia(34%) saturate(620%) hue-rotate(132deg) brightness(58%) blur(var(--shadow-blur));
  opacity: var(--shadow-opacity);
}

.sprite-contact-window {
  clip-path: inset(66% 0 0);
}

.sprite-contact-frame {
  opacity: 0.28;
  filter: brightness(0) saturate(100%) sepia(30%) saturate(520%) hue-rotate(132deg) blur(2px);
}
```

The same `frameStyle` is used inside subject and shadow layers, guaranteeing recognizable synchronized tails, claws, fins, lids, and tentacles.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/sprite-runtime.test.mjs && npm run typecheck`

Expected: PASS.

```powershell
git add lib/underwaterProjection.mjs tests/sprite-runtime.test.mjs components/underwater/SpriteActor.tsx app/globals.css
git commit -m "feat: add altitude-aware silhouette shadows"
```

---

### Task 8: Integrate the redesigned cast and PNG background

**Files:**
- Modify: `data/interactiveObjects.ts`
- Modify: `components/underwater/MermaidCharacter.tsx`
- Modify: `components/underwater/InteractiveSeaObject.tsx`
- Modify: `components/underwater/UnderwaterScene.tsx`
- Modify: `components/underwater/AmbientLayers.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `spriteCatalog`, `SpriteActor`, `mermaidAltitude`, and `projectShadow`.
- Produces: complete interactive scene with six redesigned details and dynamic Liliana action/shadow state.

- [ ] **Step 1: Replace obsolete rendered-HTML expectations with failing underwater-v2 assertions**

Require `background-main.png`, `spriteCatalog`, `SpriteActor`, `mermaidAltitude`, `projectShadow`, and the six new asset IDs. Assert that the source no longer references `background-main.mp4`, `baby-mermaid-body.png`, `baby-mermaid-tail.png`, `dataset.tailFrame`, `sea-plant.png`, `rock-cluster.png`, or the old generic ellipse-shadow selectors.

- [ ] **Step 2: Run the suite and verify old implementation failures**

Run: `npm test`

Expected: FAIL because the old video, two-pose mermaid, and old asset references remain.

- [ ] **Step 3: Replace the data cast and placement**

```ts
export type SeaObjectKind = "pearl-shell" | "fish-courier" | "sea-turtle" | "treasure-chest" | "jellyfish" | "crab";

export const interactiveObjects = [
  { id: "celebrant", kind: "pearl-shell", x: 16, y: 78, radius: 132, width: 180, label: "Our little mermaid", value: eventDetails.title, hint: "Meet Liliana", assetId: "pearl-shell", clip: "open", assetAlt: "A luminous pearlescent shell" },
  { id: "message", kind: "fish-courier", x: 20, y: 45, radius: 118, width: 110, label: "A special message", value: eventDetails.invitationMessage, hint: "Catch the message", assetId: "fish-courier", clip: "swim", assetAlt: "A turquoise and lavender fish courier" },
  { id: "rsvp", kind: "sea-turtle", x: 36, y: 76, radius: 124, width: 150, label: "Join our school", value: eventDetails.rsvp, hint: "Open RSVP details", assetId: "sea-turtle", clip: "swim", assetAlt: "A friendly sea turtle" },
  { id: "venue", kind: "treasure-chest", x: 66, y: 80, radius: 132, width: 175, label: "Treasure map", value: eventDetails.venue, hint: "Reveal the venue", assetId: "treasure-chest", clip: "open", assetAlt: "An ornate sunken treasure chest" },
  { id: "time", kind: "jellyfish", x: 82, y: 44, radius: 120, width: 125, label: "Party time", value: eventDetails.time, hint: "Find the time", assetId: "jellyfish", clip: "pulse", assetAlt: "A translucent lavender jellyfish" },
  { id: "date", kind: "crab", x: 85, y: 82, radius: 122, width: 130, label: "Save the date", value: eventDetails.date, hint: "Discover the date", assetId: "crab", clip: "wave", assetAlt: "A coral-pink crab" },
] as const;
```

- [ ] **Step 4: Replace the background video and remove redundant foreground scenery**

Render:

```tsx
<img className="underwater-background" src="/images/underwater/background-main.png" alt="" aria-hidden="true" draggable={false} />
```

Delete the old `<video>`, `.scene-frame`, ambient foreground fish, and their interaction measurements. Keep only sunlight and water-vignette atmosphere.

- [ ] **Step 5: Make Liliana's clip and dynamic shadow follow movement**

Derive `altitude = mermaidAltitude(current.y, height)`, `speed = Math.hypot(dx, dy)`, and action:

```ts
const mermaidAction = activeIdRef.current ? "discover" : travelSpeed > 1.4 ? "swim" : "idle";
const shadow = projectShadow({ x: current.x, y: current.y, sceneWidth: width, sceneHeight: height, altitude, speed: travelSpeed, facing: flip });
const shadowVisual: ShadowVisual = {
  containerStyle: {
    left: `${shadow.groundX - current.x}px`,
    top: `${shadow.groundY - current.y}px`,
    transform: `translate(-50%, -50%) skewX(${shadow.skewXDeg}deg) scale(${shadow.scaleX}, ${shadow.scaleY})`,
    "--shadow-opacity": shadow.opacity,
    "--shadow-blur": `${shadow.blurPx}px`,
  } as CSSProperties,
  contactStyle: altitude < 0.14 ? {
    left: `${shadow.groundX - current.x}px`,
    top: `${shadow.groundY - current.y}px`,
    transform: `translate(-50%, -50%) scale(${flip}, 0.1)`,
  } : undefined,
};
```

Pass action, facing, and shadow values to the manifest-driven `MermaidCharacter`. Reset `discover` after its one-shot clip duration unless the detail remains active, then hold its final frame or transition to the laughing idle state.

- [ ] **Step 6: Replace object `<img>` elements with `SpriteActor`**

Grounded objects receive the full cast and contact silhouettes. Floating objects receive height-specific cast projection. Active one-shot clips restart on direct activation and proximity entry; looping clips continue smoothly.

- [ ] **Step 7: Replace obsolete CSS and add responsive scene zones**

Remove two-pose mermaid layers, face mask, old `drop-shadow`, generic grounded `::before` ellipses, decorative glows, frame art, and ambient fish rules. Add frame-window sizing, projection variables, PNG object-fit behavior, mobile positions for the six new kinds, and reduced-motion rules that freeze loops while retaining direct activation and altitude-based shadow updates.

- [ ] **Step 8: Run all automated gates and commit**

Run:

```powershell
npm run typecheck
npm run lint
npm test
```

Expected: all commands exit 0.

```powershell
git add data/interactiveObjects.ts components/underwater app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: integrate underwater v2 animated scene"
```

---

### Task 9: Perform full-resolution asset QA and responsive acceptance

**Files:**
- Modify if required: `public/images/underwater-v2/**`
- Modify if required: `data/spriteCatalog.ts`
- Modify if required: `components/underwater/**`
- Modify if required: `app/globals.css`
- Modify: `README.md`

**Interfaces:**
- Produces: verified final scene and an operator note describing raw-mask repair.

- [ ] **Step 1: Validate every frame at original resolution**

Inspect all 82 selected subject frames and their unkeyed counterparts. Confirm complete hair, bow, fingers, fins, tail, sequins, hinges, claws, legs, and tentacles; no pearl strand; no crop, holes, fringe, position pop, or identity drift.

- [ ] **Step 2: Validate animation and shadow synchronization**

For each clip, step frame-by-frame and verify subject and shadow show the same pose. For Liliana, move from near-sand to high-water positions and confirm opacity decreases, blur increases, ground projection remains on the seabed, perspective scales toward the center, and facing flips both layers.

- [ ] **Step 3: Validate complete browser flows**

Run the app and check desktop, portrait mobile, and landscape mobile:

```powershell
npm run dev
```

Verify pointer, drag, tap, keyboard activation, Escape-to-close, all-details dialog, focus visibility, touch scrolling, proximity discovery, smile-to-laugh reaction, and reduced motion. Confirm the illuminated center and coral formations remain unobscured.

- [ ] **Step 4: Repair failures at their source**

- Mask defect: repair from `selected-unkeyed/` into `manual-fixes/`, rebuild the final sheet, and preserve provenance.
- Frame timing defect: repick dense frames and activate a new Spriterrific version before regeneration.
- Motion defect: enqueue only the failed custom action after reporting/approving the 100-credit debit.
- Shadow defect: change projection math or styling without regenerating the subject.

- [ ] **Step 5: Document the final operator workflow**

Add the exact archive location, accepted job IDs, engine versions, true credits spent/refunded, final asset paths, and manual-mask repair procedure to `README.md`. Do not include the API key.

- [ ] **Step 6: Run final verification and commit corrections**

Run:

```powershell
npm run typecheck
npm run lint
npm test
git status --short
```

Expected: all checks pass. Only intentional pre-existing user changes and the completed underwater-v2 work remain.

```powershell
git add README.md public/images/underwater-v2 data/spriteCatalog.ts components/underwater app/globals.css tests
git commit -m "fix: complete underwater v2 visual acceptance"
```
