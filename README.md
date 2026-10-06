# Freight Forwarding — Frontend

The Nuxt 4 frontend for a freight forwarding platform: branches, document
sequences, administration and audit logs, with internationalisation and a rich-text
editor.

## Stack

| Area | Technology |
| --- | --- |
| Framework | Nuxt 4, Vue 3, Composition API |
| UI | Nuxt UI, Tailwind CSS |
| State | Pinia |
| Tables | TanStack Table |
| Authoring | TipTap |
| Uploads | Uppy |
| Charts | Apache ECharts (via vue-echarts) |
| i18n | `@nuxtjs/i18n` |
| Utilities | VueUse, Zod, `@nuxt/image` |
| Testing | Vitest |
| Hosting | Vercel (`vercel.json`) |

## Repository layout

```text
app/                  Nuxt application (pages, components, composables)
freight-forwarder-v1/  Legacy/previous application tree
i18n/                 Translation files
public/               Static assets
scripts/              Helper scripts
tests/                Vitest suite
AGENTS.md             Agent/contributor guidance for this codebase
user+guide.md         End-user guide
```

Notable page groups include `administration/audit-logs`,
`administration/branches` and `administration/document-sequences`.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Vitest |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `vue-tsc` |
| `pnpm typecheck:unused` | Detect unused TypeScript |
| `pnpm og:image` | Generate OG images |

## Setup

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` first to configure the environment.
