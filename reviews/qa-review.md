# QA Review

## Metadata

- Project: Liliana's First Birthday interactive invitation
- Reviewer: Primary Codex agent acting as QA gate owner
- Date: 2026-07-14
- Status: `pass`

## Scope Reviewed

- Methodology references: Karpathy Skills verification; Awesome Design MD motion, hierarchy, environmental integration, accessibility, and responsive criteria; project `DESIGN.md`.
- Product acceptance criteria: Exactly two tail poses; speed-reactive cadence; grounded sea objects; no hollow ring bubbles; improved title/detail cards; opaque reactive fish.
- UI/UX requirements: Stable mermaid body/face, natural motion response, fixed readable details, accessible fallback, reduced motion.
- API/database behavior: Not applicable.
- Deployment/runtime behavior: vinext production build and rendered Worker response.

## Test Matrix

| Area | Test Type | Command or Method | Result | Notes |
| --- | --- | --- | --- | --- |
| Unit | Automated | `node --test tests/rendered-html.test.mjs` via `npm test` | Pass | 4/4 tests pass. |
| Integration | Automated | `npm test` | Pass | Full production build plus rendered-worker checks. |
| Tail motion | Source/automated | Tail-frame assertions and controller review | Pass | Exactly two dataset states; cadence derives from pointer/travel energy; idle and reduced-motion return to frame 0. |
| Fish reaction | Source/automated | Flee-marker assertions and animation review | Pass | Three fish use throttled proximity vectors, batched reads/writes, opaque rendering, and no React frame state. |
| Environmental integration | Manual/source | Position, shadow, and motion-rule review | Pass | Coral lowered into reef; grounded objects have contact shadows and no bobbing. |
| Visual hierarchy | Manual/source | Title/detail CSS review | Pass | Compact shell plaque and smaller structured pearl cards replace oversized oval surfaces. |
| Accessibility | Source/automated | Existing interaction regression suite | Pass | Keyboard buttons, focus, modal, Escape, announcements, touch, and reduced-motion paths preserved. |
| Regression | Automated | `npm run lint`, `npm run typecheck`, `npm test`, `git diff --check` | Pass | Clean source and production build. |

## Defects

| Severity | Owner | Repro Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| Medium | Frontend | Swap a generated alternate full-body sprite | Tail changes while body/face remain aligned | Generated edit changed body geometry | Rejected; implemented clipped tail-only layers |
| Low | QA | Run first updated regression suite | Image assertion accepts formatted multiline JSX | Assertion expected a same-line class attribute | Fixed and rerun |

## Coverage Gaps

- Browser screenshot/interaction QA was not explicitly requested; visual checks use supplied screenshots plus source/artifact inspection per Sites workflow.
- Final family content and real baby portrait remain outside current acceptance scope.

## Release Recommendation

- Recommendation: `pass`
- Required fixes before release: None.
- Residual risk: Tail angle/cadence may benefit from subjective tuning after the family tests it on their preferred device.
