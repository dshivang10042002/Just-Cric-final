# JustCric Score

A TanStack Start (React 19 + Vite) cricket scoring app backed by Supabase.

## Run locally

```bash
# 1. Install deps (npm, pnpm, or bun all work)
npm install

# 2. Configure environment
cp .env.example .env
# then fill in your Supabase project URL + keys

# 3. Start the dev server
npm run dev
# → http://localhost:5173
```

## Build & run in production (any Node host)

```bash
npm run build:node     # outputs .output/ (standalone Node server)
npm start              # node .output/server/index.mjs
```

## Deploy to Vercel

This repo ships a `vercel.json` that pins `NITRO_PRESET=vercel` so the build
emits the Vercel Build Output API (`.vercel/output/`).

1. Import the repo in Vercel.
2. Set the env vars from `.env.example` in **Project Settings → Environment Variables**.
3. Click **Deploy** — Vercel runs `npm run build:vercel` and serves SSR from
   the generated functions automatically. No extra config needed.

## Deploy to Render

This repo ships a `render.yaml` blueprint that provisions a Node web service.

1. Push the repo to GitHub.
2. In Render, click **New → Blueprint** and point it at the repo.
3. Render reads `render.yaml`, runs `npm run build:node`, and starts the
   server with `npm start`. Fill in the Supabase secrets in the dashboard
   when prompted.

## Switching deploy targets manually

The Vite build is driven by `NITRO_PRESET`. Common values:

| Target              | Command                               |
| ------------------- | ------------------------------------- |
| Standalone Node     | `NITRO_PRESET=node-server vite build` |
| Vercel              | `NITRO_PRESET=vercel vite build`      |
| Cloudflare Workers  | `NITRO_PRESET=cloudflare-module vite build` |
| Netlify             | `NITRO_PRESET=netlify vite build`     |

See the [Nitro preset list](https://nitro.build/deploy) for everything else.

## Database migrations

Schema migrations live in two places:

- `supabase/migrations/` — baseline schema shipped with the repo (managed).
- `db/migrations/` — newer feature migrations you apply yourself.

Apply `db/migrations/*.sql` against your Supabase project using either the
Supabase SQL editor, `psql`, or the Supabase CLI (`supabase db push`).

### Required for Feature 1 (invite-only team joining)

Run `db/migrations/001_phone_invites.sql` once. It adds a `phone` column to
`profiles` and an `add_team_member_by_phone` RPC. Without it, captains
can't add players by phone (the link + QR flows still work).

### Required for Feature 4 (follow system)

Run `db/migrations/002_follows.sql` once. It creates the `follows` table
used by the Follow button on team / player pages and the `/feed` route.

(Feature 2 — city rankings — needs no migration.)
