# Security Review

## Metadata

- Project: Liliana's First Birthday interactive invitation
- Reviewer: Lead Architect acting as Security gate owner
- Date: 2026-07-14
- Status: `pass`

## Threat Model

- Methodology references: Karpathy Skills surgical review and verifiable gate criteria.
- Assets: Static invitation source, bundled background/social images, Cloudflare Worker-compatible build output.
- Actors: Public or privately invited read-only visitors; site owner editing local content.
- Trust boundaries: Incoming HTTP host/proxy headers used only to form social metadata URLs; static client interaction state; Sites private deployment boundary.
- Entry points: Root page request, pointer/touch/keyboard events, host and forwarded-protocol headers.
- Sensitive data: None. No account, form, analytics, personal submission, secret, or runtime credential is used by the application.
- Abuse cases: Malformed host headers, script injection through content, dependency vulnerabilities, accidental secret inclusion, unintended shared deployment.

## Review Checklist

| Area | Result | Notes |
| --- | --- | --- |
| Secrets and configuration | Pass | Secret scan found documentation-only matches; `.env*` is ignored; no runtime secret is required. |
| Authentication | Not applicable | No sign-in or identity feature. |
| Authorization | Not applicable | No protected application action or stored record. Deployment uses owner-only Sites access. |
| Input validation | Pass | No user content input. Host/protocol metadata input is constrained, parsed, and falls back to a safe local origin if malformed. |
| Output encoding | Pass | React-rendered static strings; no raw HTML path. |
| Injection risks | Pass | No `dangerouslySetInnerHTML`, `eval`, dynamic code, database query, command execution, or external request in the application. |
| CSRF/CORS/session handling | Not applicable | No mutation endpoint, cookies, or session. |
| Dependency risk | Pass with note | Production audit reports two moderate PostCSS advisories through Next. The affected CSS stringify path receives only trusted static project CSS; no untrusted CSS or HTML is processed at runtime. |
| Logging and telemetry exposure | Pass | No application telemetry or personal-data logging. |
| Rate limits and abuse prevention | Not applicable | Static read-only experience. |
| File upload/download safety | Not applicable | No upload or generated download path. |
| Deployment security | Pass | Private Sites deployment required; no public/shared deployment is authorized. |
| Database permissions and migration risk | Not applicable | D1 and R2 are null and unused. |

## Findings

| Severity | File/Area | Evidence | Impact | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| Moderate | Transitive `next/node_modules/postcss` | `npm audit --omit=dev --audit-level=high` reports GHSA-qx2v-qp2m-jg93 | Theoretical XSS if attacker-controlled CSS containing a closing style tag is stringified | Keep content/CSS trusted; update Next/PostCSS when a non-breaking patched dependency path is available | Accepted residual; unreachable in current architecture |

## Release Recommendation

- Recommendation: `pass`
- Required fixes before release: None.
- Residual risk: Track the moderate transitive PostCSS advisory during routine dependency updates; do not add untrusted dynamic CSS generation without reassessment.
