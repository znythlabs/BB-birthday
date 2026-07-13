# Liliana's First Birthday — Design System

## Experience

A single-screen magical underwater invitation that behaves like a gentle mini-game. Guests guide a baby mermaid through the scene to discover the celebration details. The supplied underwater artwork is the visual source of truth: bright turquoise water, soft sunbeams, pearl highlights, pastel coral, and a sandy storybook foreground.

## Visual hierarchy

1. The baby mermaid is the moving focal point and must remain visible above ambient effects.
2. A compact pearl-glass title bubble introduces the invitation without obscuring the open center of the artwork.
3. Six interactive sea objects sit around the quieter edges and seabed. Each must have a visible label or hint so discovery never becomes guesswork.
4. Only one story bubble is open at a time. Its heading, value, and close behavior must be immediately readable.

## Tokens

- Ocean deep: `#075D75`
- Ocean teal: `#079EB5`
- Aqua light: `#BDF7F4`
- Pearl: `#FFF9F1`
- Shell pink: `#FFB7CB`
- Coral: `#FF7F93`
- Lavender: `#C8B6FF`
- Sand: `#FFE6BA`
- Ink: `#0B5268`
- Glass surface: `rgba(255, 249, 241, 0.82)` with a white highlight border and teal shadow

## Typography

- Display: a rounded, friendly serif or cursive-adjacent display face for Liliana's name; avoid hard-to-read novelty lettering.
- UI and details: a rounded sans face with strong contrast and generous line height.
- Keep critical event text at least 16 px on small screens.

## Components and states

- `TitleBubble`: compact top-center glass pearl panel with title and the instruction “Swim around to discover the party details.”
- `MermaidCharacter`: layered, replaceable baby-face image and illustrated/CSS mermaid body; idle bob, tail sway, direction flip, and slight velocity tilt. The placeholder must clearly identify the one-file face replacement path.
- `InteractiveSeaObject`: button semantics, icon/illustration, short label, visible focus ring, active glow, nearby pulse, and generous 44 px minimum touch target.
- `BubbleMessage`: pearl-glass speech bubble with label, exact event value, decorative tail, and an explicit close button for touch/keyboard users.
- Ambient fish and bubbles must remain decorative and hidden from assistive technology.

## Motion

- Mermaid follows pointer, touch-drag, and tap targets using `requestAnimationFrame` interpolation.
- Proximity opens the nearest object's bubble and closes the prior bubble.
- Object buttons also open details directly, ensuring keyboard and touch access.
- Pause custom frame work when the tab is hidden.
- Under `prefers-reduced-motion`, remove parallax/continuous swimming where practical, lower particle count, and keep direct object activation fully functional.

## Responsive rules

- Use percentage coordinates for interactives but clamp the mermaid and open bubbles within safe viewport bounds.
- Desktop: preserve the full artwork with `cover`, keep the open central swim lane clear, and use pointer following.
- Mobile/tablet: prioritize the bottom-center seabed, support tap-to-swim plus drag, scale down decor before text, and keep the title clear of safe-area insets.
- Landscape and portrait must both expose all six event details without horizontal scrolling.

## Accessibility guardrails

- Use real buttons for every discoverable object.
- Provide a skip/discovery fallback: an unobtrusive “Open party details” control or equivalent list dialog.
- Do not communicate state by color alone.
- Maintain strong contrast on the bright background with glass surfaces and ink text.
- Keep focus visible, support Escape to close, and announce newly revealed details politely.

## Content source

All editable details live in `data/eventDetails.ts`. Initial placeholder values remain clearly marked because the final date, time, venue, RSVP, invitation message, and baby face were not supplied.

## Methodology references

- Karpathy Skills: think first, simplest working interaction model, surgical changes, verifiable acceptance criteria.
- Awesome Design MD: explicit visual system, hierarchy, responsive behavior, accessibility, and component handoff.
