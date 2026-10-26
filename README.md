# Seer redesign — showcase

A redesign of Seer's interfaces in one visual system: the Electric Foundation identity, a calm editorial layout
(Fraunces, Inter, Geist Mono) and matching light and dark themes across every product.

## Live previews

| Interface | Preview | Redesigns |
|---|---|---|
| Seer homepage | https://seer-redesign.netlify.app | [seer.pm](https://seer.pm) |
| Seer app | https://seer-redesign-app.netlify.app | [app.seer.pm](https://app.seer.pm) |
| Futarchy | https://seer-redesign-futarchy.netlify.app | [futarchy](https://github.com/seer-pm/futarchy) |
| Deep | https://seer-redesign-deep.netlify.app | [deep](https://github.com/seer-pm/ai-prediction-markets) |
| Opportunity Markets | https://seer-redesign-opportunity.netlify.app | [opportunity markets](https://github.com/seer-pm/opportunity-markets) |
| Risk Pricing | https://seer-redesign-risk.netlify.app | [risk pricing](https://github.com/seer-pm/risk-pricing-ui) |

Start at the homepage: "Launch app" opens the redesigned app, and its menus lead to the other redesigned interfaces.

The previews read live data from Seer's public APIs and on-chain markets, so prices are real. Connecting a wallet and
trading uses real funds on the same contracts as production.

## What's in this repo

| Folder | Based on |
|---|---|
| `landing/` | [seer-pm/landing](https://github.com/seer-pm/landing) |
| `app/` | [seer-pm/demo](https://github.com/seer-pm/demo) (the Seer app monorepo) |
| `futarchy/` | [seer-pm/futarchy](https://github.com/seer-pm/futarchy) |
| `deep/` | [seer-pm/ai-prediction-markets](https://github.com/seer-pm/ai-prediction-markets) |
| `opportunity-markets/` | [seer-pm/opportunity-markets](https://github.com/seer-pm/opportunity-markets) |
| `risk-pricing/` | [seer-pm/risk-pricing-ui](https://github.com/seer-pm/risk-pricing-ui) |

Each folder keeps its upstream licence. Preview-only changes are limited to deployment settings and the links between
the redesigned interfaces; each folder has its own `netlify.toml`.

## How the previews are deployed

Each folder is a separate Netlify site, built locally and uploaded with the Netlify CLI.

- **Seer app:** data requests go through a `/seer-api/*` proxy to app.seer.pm (`app/web/public/_redirects`), and pages
  are server-rendered by a single function (`app/web/netlify/showcase-functions`) bundled with esbuild.
- **Deep:** reads from the live Deep API (`VITE_DEEP_API_URL`), so its own server functions are not deployed.
- **Risk Pricing:** deployed with Netlify's Next.js runtime so its API routes work.
- **Cross-links:** each interface reads the other preview addresses from its `netlify.toml`.

## Run locally

| Folder | Commands | Port |
|---|---|---|
| `app/` | `yarn install` then `yarn --cwd web dev` | 3000 |
| `futarchy/` | `npm install --legacy-peer-deps` then `npx next dev -p 3012` | 3012 |
| `deep/` | `npm install` then `npx vite --port 5182` | 5182 |
| `opportunity-markets/` | `yarn install` then `npx vite --port 5181` | 5181 |
| `risk-pricing/` | `yarn install` then `npx next dev -p 3011` | 3011 |
| `landing/` | `python -m http.server 5183 --directory landing` | 5183 |
