# LYRA services site

The public site for Efrain Galvis, with LYRA as an AI-first CopilotKit chat
surface and the consulting portfolio around it.

Live: https://efrain-galvis.info

## Local development

Requires Node.js 20.19+.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The Railway REST service is the default backend. Leave
`VITE_COPILOTKIT_RUNTIME_URL` blank to use `/v1/chat`. Once site-agent exposes
its CopilotKit Runtime / AG-UI gateway, set:

```dotenv
VITE_COPILOTKIT_RUNTIME_URL=https://site-agent-production.up.railway.app/<runtime-path>
VITE_COPILOTKIT_AGENT_ID=lyra
```

The exact runtime path is a backend dependency and is intentionally not
guessed here. CopilotKit probes the configured runtime and the UI falls back
to `/v1/chat` if the connection fails. `VITE_SITE_TOKEN`, when present, is a
public browser-visible speed bump—not a secret.

## GitHub Pages

Source and generated output are separate. The repository contains only the
Vite/React source; `.github/workflows/pages.yml` builds `dist/` on pushes to
`main` and deploys that artifact with GitHub Pages Actions.

```bash
npm run check
npm run build
```

Before merging, set **Settings → Pages → Build and deployment → Source** to
**GitHub Actions**. Until that one-time switch, the unchanged legacy root site
continues to be served from `main`.

The workflow can read optional repository variables `SITE_AGENT_URL`,
`COPILOTKIT_RUNTIME_URL`, `COPILOTKIT_AGENT_ID`, and `SITE_TOKEN`. Values
prefixed with `VITE_` are compiled into public browser code, so none may be a
secret. `public/CNAME` and `public/.nojekyll` preserve the custom domain and
Jekyll bypass in the deployed artifact.

Do not commit `dist/` or `assets/build/`; both are ignored.

## Safety boundaries

- LYRA is identified as an AI and never presents herself as Efrain.
- Chat output is rendered as text by React; no model-generated HTML or
  JavaScript is accepted.
- Starter prompts come from `GET /v1/starters`, with local defaults if it is
  unavailable.
- Names, email addresses, and meeting notes use the separate
  `POST /v1/meetings` form and are not sent through chat.
- CSP allows only this site and the Railway backend for network requests.
