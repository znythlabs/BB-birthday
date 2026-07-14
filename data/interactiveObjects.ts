import { eventDetails } from "./eventDetails";

export type SeaObjectKind = "shell" | "crab" | "coral" | "treasure" | "fish" | "starfish";

export type InteractiveSeaObjectData = {
  id: string;
  kind: SeaObjectKind;
  x: number;
  y: number;
  radius: number;
  width: number;
  label: string;
  value: string;
  hint: string;
  asset: string;
  assetAlt: string;
};

export const interactiveObjects: readonly InteractiveSeaObjectData[] = [
  {
    id: "celebrant",
    kind: "shell",
    x: 13,
    y: 75,
    radius: 138,
    width: 180,
    label: "Our little mermaid",
    value: eventDetails.title,
    hint: "Meet Liliana",
    asset: "/images/sea-elements/shell-large.png",
    assetAlt: "An open pearlescent shell",
  },
  {
    id: "message",
    kind: "fish",
    x: 18,
    y: 47,
    radius: 118,
    width: 104,
    label: "A special message",
    value: eventDetails.invitationMessage,
    hint: "Catch the message",
    asset: "/images/fish/fish-2.png",
    assetAlt: "Aqua and lavender tropical fish",
  },
  {
    id: "rsvp",
    kind: "starfish",
    x: 38,
    y: 84,
    radius: 116,
    width: 112,
    label: "Join our school",
    value: eventDetails.rsvp,
    hint: "Open RSVP details",
    asset: "/images/sea-elements/starfish.png",
    assetAlt: "A pearly peach starfish",
  },
  {
    id: "venue",
    kind: "treasure",
    x: 66,
    y: 78,
    radius: 132,
    width: 170,
    label: "Treasure map",
    value: eventDetails.venue,
    hint: "Reveal the venue",
    asset: "/images/sea-elements/treasure-chest.png",
    assetAlt: "An ornate open treasure chest",
  },
  {
    id: "time",
    kind: "coral",
    x: 85,
    y: 67,
    radius: 124,
    width: 142,
    label: "Party time",
    value: eventDetails.time,
    hint: "Find the time",
    asset: "/images/sea-elements/coral-cluster.png",
    assetAlt: "A pastel coral garden",
  },
  {
    id: "date",
    kind: "crab",
    x: 85,
    y: 81,
    radius: 122,
    width: 126,
    label: "Save the date",
    value: eventDetails.date,
    hint: "Discover the date",
    asset: "/images/sea-elements/crab-cute.png",
    assetAlt: "A smiling pink crab",
  },
] as const;
