# Vercel cutover runbook

This repository is prepared for Vercel, but this change does not connect a
Vercel account, deploy production, change DNS, or demote the current GitHub
Pages site.

## 1. Import and configure the Vercel project

1. In Vercel, import `efrain-galvis/services` from GitHub.
2. Keep the repository root as the project root and select the Vite framework
   preset. `vercel.json` pins `npm run build`, `dist`, SPA fallback rewrites,
   and the Node.js 22 Runtime function.
3. Add these variables to both Preview and Production:

   | Variable | Value | Exposure |
   | --- | --- | --- |
   | `VITE_COPILOTKIT_RUNTIME_URL` | `/api/copilotkit` | Public build setting |
   | `VITE_SITE_AGENT_URL` | `https://site-agent-production.up.railway.app` | Public build setting |
   | `VITE_COPILOTKIT_AGENT_ID` | `lyra` | Public build setting |
   | `SITE_AGENT_URL` | `https://site-agent-production.up.railway.app` | Server-only |
   | `COPILOTKIT_AGENT_ID` | `lyra` | Server-only |
   | `SITE_TOKEN` | The Railway site-agent token, if its AG-UI route requires one | Server-only secret |

   `VITE_SITE_TOKEN` is optional and remains a public, browser-visible speed
   bump for direct Railway calls to starters, meetings, and fallback chat. It
   is not the Runtime credential. Never copy a secret `SITE_TOKEN` into a
   `VITE_*` variable.

4. Deploy a Preview before assigning any domain.

## 2. Verify the Preview

1. Open the Preview and confirm that the site renders without console or CSP
   errors.
2. Request `https://<preview-host>/api/copilotkit/info`. It must return the
   official CopilotKit Runtime description and list the configured `lyra`
   agent.
3. Send a chat message and confirm the browser calls
   `POST /api/copilotkit/agent/lyra/run`, receives
   `text/event-stream`, and renders streamed AG-UI events.
4. Confirm starters still load from Railway and submit a non-production test
   through the existing `POST /v1/meetings` path only when it is safe to create
   that test record. Meeting fields must not enter the CopilotKit Runtime.
5. If Railway rejects the Preview origin, add the exact Vercel Preview origin
   to site-agent's `ALLOWED_ORIGINS`. Avoid a broad `*.vercel.app` allow rule.

The Runtime reads an optional `SITE_TOKEN` only in the Vercel function and
adds it to the Railway AG-UI request as `X-Site-Token`. Browser-supplied auth
and speed-bump headers are not forwarded through the Runtime.

## 3. Production and DNS cutover

1. Promote a verified Vercel deployment to Production.
2. Add `efrain-galvis.info` (and `www.efrain-galvis.info` if desired) to the
   Vercel project.
3. Add `https://efrain-galvis.info` to Railway site-agent's
   `ALLOWED_ORIGINS` before directing users to Vercel.
4. In the DNS provider, replace the current GitHub Pages records with the
   records Vercel displays for those domains. Do not copy record values from an
   unrelated Vercel project.
5. Wait for Vercel to report the domain and TLS certificate as valid. Verify
   the homepage, `/api/copilotkit/info`, one LYRA run, starters, and the
   meetings form on the custom domain.
6. Keep the prior GitHub Pages deployment available until all checks pass.
   Roll back by restoring the prior DNS records if the Vercel checks fail.

No DNS changes belong in the preparation PR.

## 4. Demote GitHub Pages after the cutover

Only after the custom domain is serving the verified Vercel deployment:

1. Remove the custom domain from the repository's GitHub Pages settings and
   remove `public/CNAME` in a follow-up PR. The custom domain must belong to
   Vercel, not both hosts.
2. Replace the Pages artifact with the static presentation card prepared at
   `docs/pages-card.html` (copy it to `index.html` in a temporary workflow
   artifact; do not commit generated `dist/`). The card links visitors to
   `https://efrain-galvis.info/`.
3. Update `.github/workflows/pages.yml` in that follow-up PR so it uploads only
   the card instead of building and deploying the Vite application.

If the GitHub Pages URL is no longer wanted, disable the Pages Actions
deployment instead of publishing the card. In either case, leave
`.github/workflows/pages.yml` unchanged until the Vercel production cutover is
complete; it remains the current production deployment path.
