import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("underwater-v2 contract preserves raw artifacts and exact cast", async () => {
  const contract = JSON.parse(
    await readFile(
      new URL(
        "../docs/assets/underwater-v2-production.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(
    contract.assets.map((asset) => asset.id),
    [
      "mermaid",
      "pearl-shell",
      "fish-courier",
      "sea-turtle",
      "treasure-chest",
      "jellyfish",
      "crab",
    ],
  );
  assert.deepEqual(contract.archive.requiredDirectories, [
    "reference",
    "raw-unkeyed/provider-video",
    "raw-unkeyed/dense-frames",
    "raw-unkeyed/contact-sheets",
    "selected-unkeyed",
    "keyed",
    "manual-fixes",
    "shadows",
    "final",
  ]);
  assert.equal(contract.liliana.forbidden.includes("pearl necklace"), true);
  assert.equal(contract.rendering.pixelSnap, false);
  assert.equal(contract.rendering.pipeline, "deterministic-local-rig");
  assert.deepEqual(contract.liliana.approvedAnchors, {
    idle: "spriterrific-runs/mermaid-smile/reference/anchor-source.png",
    laugh: "spriterrific-runs/mermaid-laugh/reference/anchor-source.png",
  });
  assert.deepEqual(contract.liliana.teeth, { lower: 2, upper: 0 });
  assert.equal(contract.rendering.generativeFrameEdits, false);
});
