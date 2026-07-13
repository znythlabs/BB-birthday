import { eventDetails } from "./eventDetails";

export type SeaObjectKind = "shell" | "crab" | "coral" | "treasure" | "fish" | "starfish";

export type InteractiveSeaObjectData = {
  id: string;
  kind: SeaObjectKind;
  x: number;
  y: number;
  radius: number;
  label: string;
  value: string;
  hint: string;
  icon: string;
};

export const interactiveObjects: readonly InteractiveSeaObjectData[] = [
  { id: "celebrant", kind: "shell", x: 14, y: 66, radius: 122, label: "Our little mermaid", value: eventDetails.title, hint: "Meet Liliana", icon: "🐚" },
  { id: "date", kind: "crab", x: 80, y: 80, radius: 112, label: "Save the date", value: eventDetails.date, hint: "Discover the date", icon: "🦀" },
  { id: "time", kind: "coral", x: 86, y: 48, radius: 116, label: "Party time", value: eventDetails.time, hint: "Find the time", icon: "🪸" },
  { id: "venue", kind: "treasure", x: 64, y: 72, radius: 118, label: "Treasure map", value: eventDetails.venue, hint: "Reveal the venue", icon: "🎁" },
  { id: "message", kind: "fish", x: 16, y: 39, radius: 112, label: "A special message", value: eventDetails.invitationMessage, hint: "Catch the message", icon: "🐠" },
  { id: "rsvp", kind: "starfish", x: 40, y: 84, radius: 110, label: "Join our school", value: eventDetails.rsvp, hint: "Open RSVP details", icon: "⭐" },
] as const;

