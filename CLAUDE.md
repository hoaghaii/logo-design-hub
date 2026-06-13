@AGENTS.md

# LogoDesignHub — Freelance Design Platform

Marketplace connecting **Clients** (post design jobs) with **Designers**
(freelancers). Core differentiator: a **mock crypto escrow** payment flow that
mimics smart-contract escrow UX without touching a real blockchain.

Full spec: [requirement.md](requirement.md). Implementation plan & phase
breakdown: `~/.claude/plans/c-requirement-md-v-l-n-zany-codd.md`.

## Tech Stack

- **Next.js 16** (App Router, Turbopack, React 19.2) — frontend + backend
- **Supabase** — Postgres DB, Auth, Realtime (Postgres Changes), Storage
- **Tailwind CSS v4**, lucide-react icons, sonner toasts
- Deploy target: Vercel

## Next.js 16 gotchas (READ — differs from training data)

- `params`, `searchParams`, `cookies()`, `headers()` are **async** — always `await`.
  Use the `PageProps<'/route'>` / `LayoutProps` / `RouteContext` generated helpers.
- Middleware is renamed to **`proxy.ts`** (root). Runtime is `nodejs` (no edge).
- Turbopack is the default for `dev` and `build` — no `--turbopack` flag needed.
- `next lint` is removed; run ESLint directly.

## Project structure

- `src/lib/supabase/client.ts` — browser client (Client Components)
- `src/lib/supabase/server.ts` — server client (`createClient`, awaited) + `createAdminClient` (service role, bypasses RLS)
- `src/lib/supabase/middleware.ts` — `updateSession`, session refresh + route guard
- `proxy.ts` — wires `updateSession` into the request pipeline
- `src/lib/types.ts` — `Database` types (regenerate via Supabase MCP after schema changes)
- `src/lib/utils.ts` — `cn`, `formatVND`, `mockContractAddress`, `mockTxHash`, `shortHex`
- `src/app/**` — routes (see spec §9 for the page map)

## Domain model (8 tables)

`users` (has `wallet_balance`), `portfolios`, `jobs`, `applications`,
`deal_requests`, `orders` (has mock `contract_address`), `transactions`,
`deliverables`. Order status machine:
`pending_escrow → active → submitted → completed | rejected | refunded`.

## Escrow money rules (mock wallet in DB)

- Client locks escrow → debit client wallet, tx `escrow_lock`, order `active`.
- Client approves → credit designer wallet, tx `escrow_release`, order `completed`.
- Client rejects → refund client wallet, tx `escrow_refund`, order `rejected`, deliverable `is_locked = true`.
- Deadline missed (cron) → same as reject, order `refunded`.

Trusted money mutations run server-side via `createAdminClient` or RPC, never
from the browser.

## Conventions

- Server Components for data fetching; Client Components only where interactivity
  (forms, realtime subscriptions, escrow buttons) is needed.
- Realtime subscriptions live in `src/hooks/`; surface events as sonner toasts.
- Money formatted with `formatVND`.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
