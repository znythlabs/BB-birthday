# Security Review

## Metadata

- Project: Liliana's First Birthday interactive invitation
- Reviewer: Primary Codex agent acting as Security gate owner
- Date: 2026-07-14
- Status: `pass`

## Threat Model

- Methodology references: Karpathy Skills surgical review and verifiable gate criteria.
- Assets: Static invitation source, local generated raster images, Cloudflare Worker-compatible output.
- Actors: Privately invited read-only visitors and the site owner editing local content.
- Trust boundaries: Incoming host/proxy headers used only for absolute social metadata URLs; static client interaction state; private Sites deployment boundary.
- Entry points: Root page request plus pointer, touch, keyboard, and focus events.
- Sensitive data: None. No account, form, analytics, user submission, secret, or runtime credential is used by the application.
- Abuse cases: Malformed host headers, script injection through content, dependency vulnerabilities, accidental credential inclusion, unintended shared deployment.

## Review Checklist

| Area | Result | Notes |
| --- | --- | --- |
| Secrets and configuration | Pass | Scan returned documentation/token-package-name matches only; `.env*` is ignored and no runtime secret is needed. |
| Authentication / authorization | Not applicable | No identity, stored record, or protected application action. Sites deployment remains private. |
| Input validation | Pass | No user content input. Host/protocol metadata input is constrained, parsed by `URL`, and has a safe fallback. |
| Output encoding | Pass | React-rendered static strings; no raw HTML path. |
| Injection risks | Pass | No `dangerouslySetInnerHTML`, `eval`, dynamic function construction, database query, shell call, or external request in app code. |
| CSRF/CORS/session handling | Not applicable | No mutation endpoint, cookies, or session. |
| Dependency risk | Pass with note | Production audit reports two moderate PostCSS advisories through Next; no high/critical finding. The vulnerable stringify path receives trusted static CSS only. |
| Logging and telemetry exposure | Pass | No application telemetry or personal-data logging. |
| Rate limits and abuse prevention | Not applicable | Static read-only experience. |
| File upload/download safety | Not applicable | No upload or generated download path. |
| Deployment security | Pass | Private Sites deployment required; no public/shared deployment authorized. |
| Database permissions and migration risk | Not applicable | D1 and R2 are null and unused. |

## Findings

| Severity | File/Area | Evidence | Impact | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| Moderate | Transitive `next/node_modules/postcss` | `npm audit --omit=dev --audit-level=high` reports GHSA-qx2v-qp2m-jg93 | Theoretical XSS only if attacker-controlled CSS is stringified | Keep CSS trusted; update Next/PostCSS when a non-breaking compatible path is available | Accepted residual; unreachable in current architecture |

## Release Recommendation

- Recommendation: `pass`
- Required fixes before release: None.
- Residual risk: Reassess if the site later accepts or generates untrusted CSS/HTML; track the transitive PostCSS advisory during routine dependency updates.
