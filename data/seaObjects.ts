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
    label: "Our little mermaid",
    value: eventDetails.title,
    hint: "Meet Liliana",
    assetAlt: "A pearlescent pink and lavender shell",
    videoSrc: "/images/underwater-v2/interactives/pearl-transparent.webm",
    grounded: true,
  },
  {
    id: "fish-courier",
    kind: "fish-courier",
    x: 20,
    y: 45,
    radius: 122,
    width: 220,
    label: "A special message",
    value: eventDetails.invitationMessage,
    hint: "Catch the message",
    assetAlt: "A blue and coral fish courier",
    videoSrc: "/images/underwater-v2/interactives/fish-transparent.webm",
    grounded: false,
  },
  {
    id: "sea-turtle",
    kind: "sea-turtle",
    x: 36,
    y: 75,
    radius: 124,
    width: 300,
    label: "Join our school",
    value: eventDetails.rsvp,
    hint: "Open RSVP details",
    assetAlt: "A teal sea turtle with a violet shell",
    videoSrc: "/images/underwater-v2/interactives/turtle-transparent.webm",
    grounded: false,
  },
  {
    id: "treasure-chest",
    kind: "treasure-chest",
    x: 66,
    y: 90,
    radius: 136,
    width: 320,
    label: "Treasure map",
    value: eventDetails.venue,
    hint: "Reveal the venue",
    assetAlt: "A teal treasure chest with rose-gold trim",
    videoSrc: "/images/underwater-v2/interactives/chest-transparent.webm",
    grounded: true,
  },
  {
    id: "jellyfish",
    kind: "jellyfish",
    x: 82,
    y: 44,
    radius: 120,
    width: 260,
    label: "Party time",
    value: eventDetails.time,
    hint: "Find the time",
    assetAlt: "A glowing lavender and coral jellyfish",
    videoSrc: "/images/underwater-v2/interactives/jellyfish-transparent.webm",
    grounded: false,
  },
  {
    id: "crab",
    kind: "crab",
    x: 85,
    y: 92,
    radius: 126,
    width: 290,
    label: "Save the date",
    value: eventDetails.date,
    hint: "Discover the date",
    assetAlt: "A coral and lavender reef crab",
    videoSrc: "/images/underwater-v2/interactives/crab-transparent.webm",
    grounded: true,
  },
] as const;
