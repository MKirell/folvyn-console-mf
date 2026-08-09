# folvyn-console-mf

The owner and operator console for Folvyn. It is the root of `folvyn.mkirell.com`.

Translation-aware CRUD over the twelve collections behind `folvyn-portfolio-ms`, a media library for
the assets bucket, a guided work queue for adding a language, and a privacy-first analytics dashboard.

Not indexed, not public, one admin.

## Running it

```bash
npm install
npm run dev            # http://localhost:5174
```

The console needs `folvyn-portfolio-ms` on `http://localhost:3000` and a Cognito client whose callback
list contains `http://localhost:5174/auth/callback`. Both are already configured in
`folvyn-platform-iac`. Copy `.env.example` to `.env.local` to override anything.

| Variable                 | What it does                                         |
| ------------------------ | ---------------------------------------------------- |
| `VITE_API_BASE_URL`      | Where `portfolio-ms` answers                         |
| `VITE_COGNITO_DOMAIN`    | Hosted UI origin                                     |
| `VITE_COGNITO_CLIENT_ID` | Public SPA client — safe to embed                    |
| `VITE_SITE_URL`          | The live portfolio, for the "view site" link         |
| `VITE_ASSETS_BASE_URL`   | Where `/files`, `/imgs` and `/flags` are served from |

## Checks

```bash
npm run check          # typecheck, lint, format, unit + integration tests
npm run test:cov       # coverage, gated at 70%
npm run test:e2e       # Playwright against a stubbed API
npm run test:e2e:ui    # the same, with the Playwright inspector
```

Three tiers, all of them real:

- **Unit** — the registry, validation, payload diffing, PKCE, the locale queue, the API client.
- **Integration** — every screen mounted with a live Pinia store and a stubbed transport.
- **End to end** — Chromium against the running app: sign-in guard, the workbench, the editor's
  save-only-what-changed contract, the unsaved-changes guard, the command palette and the theme.

## Architecture

| Piece                                                                                 | Where                         |
| ------------------------------------------------------------------------------------- | ----------------------------- |
| Field registry — the single source of truth for forms, tables, validation and preview | `src/registry/collections.ts` |
| Admin transport, with silent refresh and one retry on 401                             | `src/services/admin.api.ts`   |
| Authorization Code + PKCE, no library                                                 | `src/services/pkce.ts`        |
| Stores — auth, content, media, analytics, history, ui                                 | `src/stores/`                 |
| Screens                                                                               | `src/views/`                  |

Adding a field to a collection is a registry entry, not a new component. A drift test parses the DTOs in
`folvyn-portfolio-ms` and fails the build if the registry stops matching them.

The theme is the portfolio's, copied deliberately: same tokens, denser scale, its own sidebar.
