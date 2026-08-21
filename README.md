# folvyn-console-mf

> The console every Folvyn owner writes their portfolio in, and the one an operator runs the platform
> from. It **is** the root of **folvyn.mkirell.com**. Vue 3, Tailwind, Pinia.

[![Vue](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![AWS](https://img.shields.io/badge/AWS-S3%20%C2%B7%20CloudFront-ff9900?style=flat-square&logo=amazonwebservices)](https://github.com/MKirell/folvyn-platform-iac)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](LICENSE)

**Live:** <https://folvyn.mkirell.com> — sign-in required, never indexed.

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [The registry](#the-registry)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Related repositories](#related-repositories)
- [License](#license)
- [Author](#author)

## Overview

Two consoles share one application, told apart by a Cognito group rather than a second deployment.

- **Owners** get translation-aware editing over the twelve collections behind `folvyn-portfolio-ms`, a
  live preview of the section being edited, a media library for the assets bucket, a guided queue for
  adding a language, and the analytics their own portfolio produced.
- **Operators** get the platform instead: every account, the erasure queue, traffic, health, the audit
  trail and the configuration the environment actually enforces.

Three things worth knowing before reading the code:

- **Forms are data, not components.** A collection's fields, validation, table columns and preview all
  come from one registry entry. Adding a field is an entry, not a new screen.
- **The editor saves only what changed.** Drafts are diffed against what was loaded, so a save carries
  the changed fields and nothing else — which is what makes the undo history exact.
- **A portfolio is created when someone asks for it.** Signing in reserves nothing; the button on the
  welcome page is what brings an owner record into existence.

## Architecture

```text
Browser ──► CloudFront (folvyn.mkirell.com) ──► S3 (private, origin access control)
   │
   ├── /api/v1/*  ──────────────────────────► folvyn-portfolio-ms ──► MongoDB Atlas
   │
   └── auth.mkirell.com (Cognito, Authorization Code + PKCE)
```

The console and every portfolio are served from the same host and the same bucket, separated by prefix:
the console shell answers the root, `/fol/<slug>` answers with a prerendered portfolio. The live preview
embeds the portfolio's own build, so what an owner sees while editing is the site itself rather than a
second rendering of it.

## Tech stack

| Layer     | Choice                                                      |
| --------- | ----------------------------------------------------------- |
| Framework | Vue 3, `<script setup>`, TypeScript in strict mode          |
| State     | Pinia — auth, content, media, analytics, history, owner, ui |
| Styling   | Tailwind 4, the portfolio's tokens at a denser scale        |
| Routing   | Vue Router, one guard for auth, role and onboarding         |
| Auth      | Authorization Code + PKCE against Cognito, no library       |
| i18n      | vue-i18n, English and French, no string outside a catalogue |
| Build     | Vite, two entries: the console and the preview frame        |
| Testing   | Vitest, Vue Test Utils, Playwright                          |

## Quick start

```bash
npm install
npm run dev            # http://localhost:5174
```

It needs `folvyn-portfolio-ms` answering on `http://localhost:3000` and a Cognito client whose callback
list contains `http://localhost:5174/auth/callback`. Both are already provisioned by
`folvyn-platform-iac`. Copy `.env.example` to `.env.local` to override anything.

Port 5174 is not incidental: 5173 belongs to the portfolio, which the preview frame embeds and which
serves `/imgs` and `/files` in development.

### Scripts

| Script                | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Vite dev server on 5174                                   |
| `npm run build`       | Typecheck, then build against the production environment  |
| `npm run check`       | Typecheck, lint, format check, unit and integration tests |
| `npm run test:cov`    | The same suite with coverage, gated at 70%                |
| `npm run test:e2e`    | Playwright against the running app                        |
| `npm run test:e2e:ui` | The same, with the inspector                              |
| `npm run lint:fix`    | ESLint with fixes                                         |
| `npm run format`      | Prettier over the tree                                    |

## Configuration

| Variable                 | What it does                                          |
| ------------------------ | ----------------------------------------------------- |
| `VITE_API_BASE_URL`      | Where `portfolio-ms` answers                          |
| `VITE_COGNITO_DOMAIN`    | Hosted UI origin                                      |
| `VITE_COGNITO_CLIENT_ID` | Public SPA client — safe to embed                     |
| `VITE_COGNITO_SCOPES`    | Scopes requested at sign-in                           |
| `VITE_AUTH_PROVIDERS`    | Which federated buttons to offer                      |
| `VITE_SITE_URL`          | This console's own origin, for the OAuth callback     |
| `VITE_PORTFOLIO_URL`     | The live portfolio, for the "view site" link          |
| `VITE_ASSETS_BASE_URL`   | Where `/files`, `/imgs` and `/flags` are served from  |
| `VITE_PREVIEW_PATH`      | The portfolio's preview entry, embedded while editing |

Everything here is compiled into the bundle and visible in the browser. Nothing secret belongs in it.

## The registry

`src/registry/collections.ts` is the single source of truth for every collection: which fields exist,
which are translated, how they validate, how they render in a table, and what the preview receives.

A drift test parses the DTOs in `folvyn-portfolio-ms` and fails the build when the registry stops
matching the API it edits, so the two cannot quietly diverge.

## Project structure

```text
src/
  components/   fields, layout, charts, preview frame, shared ui
  composables/  theme, health, row reordering
  config/       env, pagination and other constants
  directives/   autosize
  i18n/         catalogues, labels, accessibility strings
  registry/     collections, countries, icons, legal
  router/       routes and the one guard
  services/     admin API transport, PKCE, local assets
  stores/       auth, content, media, analytics, history, owner, ui
  views/        owner screens and the platform screens
test/           mirrors src/, one folder per area it covers
e2e/            Playwright specs and their stubs
```

## Testing

```bash
npm run check          # typecheck, lint, format, unit + integration
npm run test:cov       # coverage, gated at 70%
npm run test:e2e       # Playwright against a stubbed API
```

Three tiers, all of them real:

- **Unit** — the registry, validation, payload diffing, PKCE, the locale queue, the API client and its
  retry through a cold start.
- **Integration** — every screen mounted with a live Pinia store and a stubbed transport.
- **End to end** — Chromium against the running app: the sign-in guard, the workbench, the editor's
  save-only-what-changed contract, the unsaved-changes guard, the command palette and the theme.

`test/` mirrors `src/`, so a spec sits in the folder named after what it covers.

## Deployment

Push to `develop` deploys dev; push to `main` deploys production. Both run
`.github/workflows/checks.yml` first, then `release.yml`:

1. **checks** — typecheck, lint, format, unit suite with its coverage gate
2. **e2e** — Playwright in Chromium, with a report attached on failure
3. **secrets** — the tree scanned for anything that looks like a credential
4. **deploy** — build, upload to S3, invalidate CloudFront, smoke-test the live root

Every job writes a summary, so a run can be read from its Summary tab without opening logs.

Fingerprinted assets are uploaded immutable for a year; the shell is uploaded uncached, so a deploy is
visible immediately without serving stale JavaScript.

There is no local deploy script — CI is the only implementation of how the console gets published.

| Variable                     | Effect                                          |
| ---------------------------- | ----------------------------------------------- |
| `CI_ENABLED=false`           | turns the whole workflow off                    |
| `DEPLOY_ENABLED=false`       | keeps the checks, skips the deploy              |
| `API_BASE_URL`               | what the build is compiled against              |
| `AWS_DEPLOY_ROLE_ARN`        | OIDC role, no long-lived keys                   |
| `S3_BUCKET`                  | destination bucket                              |
| `S3_SHELL_PREFIX`            | where the console shell is written              |
| `S3_BUNDLE_PREFIX`           | where the fingerprinted assets are written      |
| `CLOUDFRONT_DISTRIBUTION_ID` | distribution to invalidate                      |
| `PREVIEW_PATH`               | the portfolio's preview entry the editor embeds |
| `SITE_URL`                   | smoke-tested after deploy                       |

All of them are written by Terraform rather than clicked in, and a missing one **fails the pipeline
loudly** rather than skipping silently.

## Security

The console holds no secret. The Cognito client is public by design, PKCE is what protects the exchange,
and the refresh token is the only thing kept — in `localStorage`, deliberately, so a reload does not
force a round trip through the hosted UI.

Authorisation is the API's, never the browser's: the console hides what an account cannot do, and the
API refuses it regardless. An account outside an environment's allowlist is shown a page saying so
rather than a console it cannot use, and nothing is created for it.

The bucket is private and reachable only through CloudFront origin access control. CI authenticates to
AWS through OIDC and holds no long-lived key.

## Related repositories

| Repository                                                            | Role                             |
| --------------------------------------------------------------------- | -------------------------------- |
| [folvyn-portfolio-ms](https://github.com/MKirell/folvyn-portfolio-ms) | The API this console edits       |
| [folvyn-portfolio-mf](https://github.com/MKirell/folvyn-portfolio-mf) | The portfolio it publishes       |
| [folvyn-platform-iac](https://github.com/MKirell/folvyn-platform-iac) | Terraform for every AWS resource |

## License

[Apache 2.0](LICENSE)

## Author

**Mohamed Khalil ZRELLY** — [LinkedIn](https://www.linkedin.com/in/mohamed-khalil-zrelly/) ·
[mkirell.com](https://mkirell.com/)
