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
| Background video | Automated/manual HTTP | Render assertions plus local asset request | Pass | Page renders autoplay/muted/loop/playsInline video; MP4 returns HTTP 200, `video/mp4`, and the expected 11,543,305-byte length. |
| Tail motion | Source/automated/manual asset preview | Tail-frame assertions, controller review, two-frame matte preview | Pass | Exactly two states; 920ms idle stroke accelerates toward 140ms; dedicated body layer preserves hands/torso; reduced motion stays at frame 0. |
| Fish reaction | Source/automated | Flee-marker assertions and state review | Pass | Triggered velocity burst/cooldown replaces magnetic avoidance; base track pauses during escape; flip always matches horizontal travel. |
| Environmental integration | Manual/source | Position, shadow, and occlusion-rule review | Pass | All grounded discoveries lowered into reef/sand with contact shadows, foreground occlusion, and no bobbing. |
| Visual hierarchy | Manual/source | Title/detail CSS and font-asset review | Pass | Unboxed local Bodoni Moda pearl typography matches cover direction; compact pearl detail cards remain readable. |
| Accessibility | Source/automated | Existing interaction regression suite | Pass | Keyboard buttons, focus, modal, Escape, announcements, touch, and reduced-motion paths preserved. |
| Regression | Automated | `npm run lint`, `npm run typecheck`, `npm test`, `git diff --check` | Pass | Clean source and production build. |

## Defects

| Severity | Owner | Repro Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| High | Frontend | Inspect initial CSS tail split | Tail changes while hands/body remain intact | CSS polygon masked left hand and torso | Fixed with dedicated alpha-masked body/tail PNG layers and matte preview |
| Low | QA | Run first updated regression suite | Image assertion accepts formatted multiline JSX | Assertion expected a same-line class attribute | Fixed and rerun |

## Coverage Gaps

- Browser screenshot/interaction QA was not explicitly requested; visual checks use supplied screenshots plus source/artifact inspection per Sites workflow.
- Final family content and real baby portrait remain outside current acceptance scope.

## Release Recommendation

- Recommendation: `pass`
- Required fixes before release: None.
- Residual risk: Tail angle/cadence may benefit from subjective tuning after the family tests it on their preferred device; background playback follows normal browser media policies, with muted inline autoplay configured for broad compatibility.
