# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
```

There are no test scripts configured. Database commands:

```bash
npx prisma migrate dev    # Run migrations in development
npx prisma generate       # Regenerate Prisma client after schema changes
npx prisma studio         # Open Prisma Studio GUI
```

## Architecture

**split-weiss** is a multi-currency expense-sharing app (think Splitwise). Users create groups, add expenses with flexible splitting modes, and track who owes whom across currencies.

### Stack

- **Next.js 15** (App Router) — routing, server components, server actions
- **NextAuth 5 (beta)** — credentials-based auth with JWT sessions, Prisma adapter
- **Prisma 6 + Neon PostgreSQL** — ORM with `@prisma/adapter-neon` for serverless
- **React Query** — client-side data fetching/caching
- **React Hook Form + Zod** — form state and validation
- **Decimal.js** — precise arithmetic for all financial calculations
- **shadcn/ui + Tailwind CSS 4** — UI components

### Route Structure

Two route groups handle auth separation:
- `(auth)/` — public routes (`/sign-in`, `/sign-up`)
- `(app)/` — protected routes; layout redirects unauthenticated users to `/sign-in`

Protected routes: `/dashboard`, `/groups`, `/groups/[groupId]` (with nested `/balances`, `/settlements`, `/settings`).

### Server Actions

All mutations go through server actions in `src/app/actions/`. Each action:
1. Calls `auth()` to verify the session
2. Validates input with a Zod schema from `src/lib/validations/`
3. Performs the DB operation via Prisma
4. Calls `revalidatePath()` to invalidate Next.js cache
5. Returns `ActionResult<T>` — either `{ data }` or `{ error: string }`

### Financial Logic

**Splitting** (`src/lib/splitting/`) — four modes:
- `EQUAL` — divides equally, remainder goes to first member
- `PERCENTAGE` — splits by percentage (must sum to 100)
- `VALUE` — explicit amounts per person (must sum to total)
- `LOCK` — fixed amounts, remainder distributed equally among unlocked members

**Balance calculation** (`src/lib/balances/`):
- `calculator.ts` — aggregates all expenses and settlements in a group, converting to the group's base currency using cached exchange rates, producing a net balance map per user
- `simplifier.ts` — reduces the balance map to a minimal set of transactions using a greedy debt-simplification algorithm

**Currency** (`src/lib/currency/`):
- Exchange rates fetched from the Frankfurter API and cached in the `ExchangeRateCache` table (keyed by base currency + date)
- `converter.ts` handles triangulation when direct pairs aren't available
- `use-exchange-rates.ts` hook wraps React Query for client-side rate access

### Database

Schema key points:
- `Expense.splitMode` — enum: `EQUAL | PERCENTAGE | VALUE | LOCK`
- `Expense` and `ExpenseSplit` amounts use `Decimal(12,4)` for precision
- `GroupMember.role` — enum: `ADMIN | MEMBER`
- `ExchangeRateCache` stores JSON rate snapshots per date to avoid redundant API calls

### Path Alias

`@/*` maps to `src/*` — use this for all imports.
