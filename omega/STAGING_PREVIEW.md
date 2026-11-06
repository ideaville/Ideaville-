# OMEGA private staging preview — status

**Date:** 6 November 2026 (Europe/London)  
**PR:** https://github.com/ideaville/Ideaville-/pull/5  
**Branch:** `cursor/omega-performance-ecosystem-8beb`  
**Requester:** Femi Adeoye — private phone preview for Femi + Kay  
**Constraint:** Real platform access control required. No public tunnels, obscure URLs, robots-only, or client-side password gates. No merge to `master`, no public launch, no payments.

## Investigation summary

| Option | Result |
| --- | --- |
| Cursor App Publish (`publish-app`, private/team Cursor sign-in gate) | **Tool not available in this agent run.** `cursor-cloud` MCP exposes environment/agent diagnostics only; `publish-app` / `list-available-secrets` / `bind-app-secrets` / `add-app-identity` are absent. Call attempt returned tool-not-found. |
| Vercel / Netlify / Cloudflare / Render / Fly / Railway CLI or tokens | **Not present.** No CLI auth files, no related environment variables, no project link under `.vercel` / `.netlify`. |
| GitHub Pages | **Not configured** (API 404). |
| GitHub Environments / Actions deploy secrets | **No environments** (`total_count: 0`). Secrets listing not accessible to this integration (403). |
| Repo deploy configs | None (`vercel.json`, `netlify.toml`, workflows, etc.). |
| Public tunnel fallback (ngrok etc.) | **Not used** (explicitly disallowed). |

## Preview URL

**None issued.** No access-controlled staging host was created.

## Privacy / access mechanism (intended vs actual)

- **Intended (preferred):** Cursor-hosted app with **private** or **team** visibility — platform enforces Cursor sign-in before any HTML/assets are served (real server-side gate). Team visibility is the fit if Kay is on Femi’s Cursor team; otherwise Femi invites Kay under private sharing rules in Cursor.
- **Alternate (if Cursor publish remains unavailable):** Vercel (or similar) project with **Deployment Protection / SSO / platform authentication** enabled, linked to this repo’s PR branch only — not password in client JS.
- **Actual:** Blocked before either path could be exercised.

## Verification performed (app only)

```bash
cd omega && npm test && npm run build && npm audit --omit=dev
```

- Tests: 6/6 passed  
- Production build: succeeded  
- Audit: 0 vulnerabilities  
- Local loopback preview (`vite preview` on `127.0.0.1`) still serves the prototype for agent checks — **not** a phone-reachable private staging URL and **not** an access-control proof for unauthenticated internet clients.

Unauthenticated-deny and authorised mobile navigation against a real private host: **not verified** (host missing).

## Still mocked (unchanged)

Prototype banner; demo points (not currency); mock ledger (`Mock`); no payments/orders/commissions; no efficacy claims; no customer-data collection; Nigeria-first / UK deferred framing.

## Precise blocker

This Cloud Agent session lacks an **authorised private-hosting integration**:

1. Cursor `publish-app` MCP tools are not exposed to the run, and  
2. No third-party hosting credentials (e.g. Vercel token + protected project) exist in the environment.

## Smallest safe next step (owner)

Pick **one** (no new paid plan required if Cursor team already exists or a free Vercel hobby project with protection is already available):

1. **Preferred — Cursor private/team app:** In Cursor, ensure Cloud Agents can use **Publish app** for this workspace, then re-run / ask the agent to publish `omega/` as **team** (or private + invite Kay). Confirm in the publish dialog that visibility is **not** public. Or publish once from Cursor UI yourself targeting folder `omega/` with team visibility.  
2. **Alternate — Vercel Deployment Protection:** Create/link a Vercel project to `ideaville/Ideaville-`, enable Authentication / Deployment Protection, add a `VERCEL_TOKEN` (and org/project ids if required) as a **Cloud Agent secret**, then ask the agent to deploy only the PR branch preview — still without merging `master`.

Do **not** use a public preview URL, ngrok, or an in-page password as a substitute.

## What was not done

- No merge to `master`  
- No public hosting  
- No contact with Kay or others  
- No new paid account creation attempted  
- No secrets/tokens printed or committed  
