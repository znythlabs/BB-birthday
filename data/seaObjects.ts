import { eventDetails } from "./eventDetails";

export type SeaObjectKind =
  | "pearl-shell"
  | "fish-courier"
  | "sea-turtle"
  | "treasure-chest"
  | "jellyfish"
  | "crab";

export type InteractiveSeaObjectData = {
  id: SeaObjectKind;
  kind: SeaObjectKind;
  x: number;
  y: number;
  radius: number;
  width: number;
  label: string;
  value: string;
  hint: string;
  assetAlt: string;
  videoSrc: string;
  posterSrc: string;
  grounded: boolean;
};

export const interactiveObjects: readonly InteractiveSeaObjectData[] = [
  {
    id: "pearl-shell",
    kind: "pearl-shell",
    x: 30,
    y: 78,
    radius: 138,
    width: 230,
    label: "Location guide",
    value: eventDetails.venueGuide,
    hint: "Location guide",
    assetAlt: "A pearlescent pink and lavender shell",
    videoSrc: "/images/underwater-v2/interactives/pearl-transparent.webm",
    posterSrc: "/images/underwater-v2/interactives/frames/keyed/pearl-key.webp",
    grounded: true,
  },
  {
    id: "fish-courier",
    kind: "fish-courier",
    x: 20,
    y: 45,
    radius: 122,
    width: 220,
    label: "Party details",
    value: `${eventDetails.date} • ${eventDetails.time} ${eventDetails.venue}`,
    hint: "Party details",
    assetAlt: "A blue and coral fish courier",
    videoSrc: "/images/underwater-v2/interactives/fish-transparent.webm",
    posterSrc: "/images/underwater-v2/interactives/frames/keyed/fish-key.webp",
    grounded: false,
  },
  {
    id: "sea-turtle",
    kind: "sea-turtle",
    x: 36,
    y: 75,
    radius: 124,
    width: 300,
    label: "Dress code",
    value: eventDetails.dressCode,
    hint: "Dress code",
    assetAlt: "A teal sea turtle with a violet shell",
    videoSrc: "/images/underwater-v2/interactives/turtle-transparent.webm",
    posterSrc: "/images/underwater-v2/interactives/frames/keyed/turtle-key.webp",
    grounded: false,
  },
  {
    id: "treasure-chest",
    kind: "treasure-chest",
    x: 66,
    y: 90,
    radius: 136,
    width: 320,
    label: "Gift ideas",
    value: eventDetails.giftIdeas,
    hint: "Gift ideas",
    assetAlt: "A teal treasure chest with rose-gold trim",
    videoSrc: "/images/underwater-v2/interactives/chest-transparent.webm",
    posterSrc: "/images/underwater-v2/interactives/frames/keyed/chest-key.webp",
    grounded: true,
  },
  {
    id: "jellyfish",
    kind: "jellyfish",
    x: 82,
    y: 44,
    radius: 120,
    width: 260,
    label: "RSVP",
    value: "Kindly confirm today. Reserved guests only; no additional guests unless included in the invitation.",
    hint: "RSVP",
    assetAlt: "A glowing lavender and coral jellyfish",
    videoSrc: "/images/underwater-v2/interactives/jellyfish-transparent.webm",
    posterSrc: "/images/underwater-v2/interactives/frames/keyed/jellyfish-key.webp",
    grounded: false,
  },
  {
    id: "crab",
    kind: "crab",
    x: 85,
    y: 92,
    radius: 126,
    width: 290,
    label: "Health & safety",
    value: eventDetails.healthSafety,
    hint: "Health & safety",
    assetAlt: "A coral and lavender reef crab",
    videoSrc: "/images/underwater-v2/interactives/crab-transparent.webm",
    posterSrc: "/images/underwater-v2/interactives/frames/keyed/crab-key.webp",
    grounded: true,
  },
] as const;
