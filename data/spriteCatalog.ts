export type SpriteClip = {
  sheet: string;
  frameWidth: 768;
  frameHeight: 432;
  frames: number;
  columns: number;
  rows: number;
  fps: number;
  loop: boolean;
};

const clip = (
  sheet: string,
  frames: number,
  columns: number,
  fps: number,
  loop: boolean,
): SpriteClip => ({
  sheet,
  frameWidth: 768,
  frameHeight: 432,
  frames,
  columns,
  rows: Math.ceil(frames / columns),
  fps,
  loop,
});

export const spriteCatalog = {
  mermaid: {
    idle: clip("/images/underwater-v2/mermaid/idle/sheet.png", 8, 4, 8, true),
    swim: clip("/images/underwater-v2/mermaid/swim/sheet.png", 12, 4, 12, true),
    discover: clip(
      "/images/underwater-v2/mermaid/discover/sheet.png",
      10,
      5,
      10,
      false,
    ),
  },
  "pearl-shell": {
    open: clip(
      "/images/underwater-v2/interactives/pearl-shell/sheet.png",
      8,
      4,
      8,
      false,
    ),
  },
  "fish-courier": {
    swim: clip(
      "/images/underwater-v2/interactives/fish-courier/sheet.png",
      10,
      5,
      10,
      true,
    ),
  },
  "sea-turtle": {
    swim: clip(
      "/images/underwater-v2/interactives/sea-turtle/sheet.png",
      10,
      5,
      10,
      true,
    ),
  },
  "treasure-chest": {
    open: clip(
      "/images/underwater-v2/interactives/treasure-chest/sheet.png",
      8,
      4,
      8,
      false,
    ),
  },
  jellyfish: {
    pulse: clip(
      "/images/underwater-v2/interactives/jellyfish/sheet.png",
      8,
      4,
      8,
      true,
    ),
  },
  crab: {
    wave: clip(
      "/images/underwater-v2/interactives/crab/sheet.png",
      8,
      4,
      8,
      true,
    ),
  },
} as const;

export type SpriteAssetId = keyof typeof spriteCatalog;
