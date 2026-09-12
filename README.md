# LYRA services site

The public site for Efrain Galvis, with LYRA as an AI-first CopilotKit chat
surface and the consulting portfolio around it.

Live: https://efrain-galvis.info

## Local development

Requires Node.js 22.x, matching the Vercel Runtime and `package.json`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The Railway REST service is the default backend. Leave
`VITE_COPILOTKIT_RUNTIME_URL` blank with plain Vite development to use
`/v1/chat`. Vercel serves the repository's CopilotKit Runtime adapter at:

```dotenv
VITE_COPILOTKIT_RUNTIME_URL=/api/copilotkit
VITE_COPILOTKIT_AGENT_ID=lyra
```

The v2 provider discovers the agent through `/api/copilotkit/info`; runs are
proxied server-side to Railway's `/v1/agui` endpoint. `SITE_TOKEN` is an
optional server-only Runtime credential. `VITE_SITE_TOKEN`, when present, is a
separate public browser-visible speed bump for direct Railway requests—not a
secret. See [`docs/vercel-cutover.md`](docs/vercel-cutover.md) for all Vercel
variables and the production cutover sequence.

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
