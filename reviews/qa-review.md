# QA Review

## Metadata

- Project: Liliana's First Birthday interactive invitation
- Reviewer: Lead Architect acting as QA gate owner
- Date: 2026-07-14
- Status: `pass`

## Scope Reviewed

- Methodology references: Karpathy Skills goal-driven verification; Awesome Design MD accessibility, hierarchy, responsiveness, and interface-polish criteria; project `DESIGN.md`.
- Product acceptance criteria: Fullscreen single-page experience; mermaid pointer/touch/tap following; six proximity and direct-activation details; single active popup; ambient effects; editable config; reduced motion; README.
- UI/UX requirements: Supplied background fidelity, readable glass surfaces, responsive coordinates, keyboard fallback, touch targets, focus management, and modal behavior.
- API behavior: Not applicable.
- Database behavior: Not applicable.
- Deployment/runtime behavior: vinext build output and live local HTTP response.

## Test Matrix

| Area | Test Type | Command or Method | Result | Notes |
| --- | --- | --- | --- | --- |
| Unit | Automated | `node --test tests/rendered-html.test.mjs` via `npm test` | Pass | 3/3 tests pass. |
| Integration | Automated | `npm test` | Pass | Full vinext build plus rendered-worker checks. |
| E2E | HTTP/manual | Local `http://localhost:3000/` request | Pass | HTTP 200; invitation title/content present; starter content absent. |
| Accessibility | Source/automated | Component and CSS review; regression assertions | Pass | Real buttons, live region, focus trap/restoration, Escape close, reduced motion, 44px+ controls, and all-details fallback. |
| Visual/design fidelity | Manual/source | Inspected supplied background and final CSS composition | Pass | Artwork remains full-bleed; pearl-glass hierarchy and edge-positioned discoverables follow `DESIGN.md`. |
| Performance | Source/build | Animation-loop review and production build | Pass | One requestAnimationFrame loop, ref-based transforms, hidden-tab pause, deterministic lightweight ambient layers. |
| Regression | Automated | `npm run lint`, `npm run typecheck`, `npm test` | Pass | Lint/typecheck pass; build passes; metadata/social-card and modal touch regression covered. |

## Defects

| Severity | Owner | Repro Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| High | Frontend Engineer | Open all-details dialog on a short touch viewport and drag vertically | Dialog scrolls without moving the mermaid | Scene touch policy/pointer capture could intercept the modal gesture | Fixed and verified |

## Coverage Gaps

- In-app browser runtime could not initialize, so screenshot-based multi-viewport visual QA was unavailable. The Sites workflow did not require browser UI QA, and automated/source checks cover the release criteria.
- Final family content and the real baby portrait are intentionally absent and cannot be acceptance-tested yet.

## Release Recommendation

- Recommendation: `pass`
- Required fixes before release: None.
- Residual risk: Minor visual differences may surface on unusual real-device aspect ratios; the all-details fallback remains available and scrollable.
