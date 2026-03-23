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
npx prisma db push        # Push schema.prisma directly to the database
npx prisma generate       # Regenerate Prisma client after schema changes
npx prisma studio         # Open Prisma Studio GUI
```

## Architecture

**split-weiss** is a multi-currency expense-sharing app (think Splitwise). Users create groups, add expenses with flexible splitting modes, and track who owes whom across currencies.

### Stack

- **Next.js 15** (App Router) — routing, server components, server actions
- **No auth** — device-based identity via `DeviceAccess` (cookie-linked `deviceToken` → `GroupMember`)
- **Prisma 6 + Neon PostgreSQL** — ORM with `@prisma/adapter-neon` for serverless
- **React Hook Form + Zod** — form state and validation
- **Decimal.js** — precise arithmetic for all financial calculations (2 decimal places, ROUND_DOWN + deterministic remainder distribution)
- **shadcn/ui + Tailwind CSS 4** — UI components

### Route Structure

Two route groups:

- `(app)/` — public landing and group list (`/groups`)
- `(group)/` — group-scoped routes; layout handles access (password → identity picker → authorized)

Group routes: `/groups/[groupId]` (expenses), `/groups/[groupId]/balances`, `/groups/[groupId]/settlements`, `/groups/[groupId]/settings`.

### Server Actions

All mutations go through server actions in `src/app/actions/`. Each action:

1. Calls `canAccessGroup()` to verify device access
2. Validates input with a Zod schema from `src/lib/validations/`
3. Performs the DB operation via Prisma
4. Calls `revalidatePath()` to invalidate Next.js cache
5. Returns `ActionResult<T>` — either `{ data }` or `{ error: string }`

### Financial Logic

**Splitting** (`src/lib/splitting/`) — two modes:

- `PERCENTAGE` — splits by percentage (must sum to 100)
- `LOCK` — fixed amounts, remainder distributed equally among unlocked members

Remainder pennies are distributed deterministically using a seeded xorshift32 PRNG (seeded by total + member IDs).

**Balance calculation** (`src/lib/balances/`):

- `calculator.ts` — aggregates all expenses and settlements in a group, converting to the group's base currency using cached exchange rates, producing a net balance map per user
- `simplifier.ts` — reduces the balance map to a minimal set of transactions using a greedy debt-simplification algorithm

**Currency** (`src/lib/currency/`):

- Exchange rates fetched from the Frankfurter API and cached in the `ExchangeRateCache` table (keyed by base currency + date)
- `converter.ts` handles triangulation when direct pairs aren't available

### Identity

- `DeviceAccess` maps `(groupId, deviceToken)` → `memberId`
- On first visit to a group, user picks "Who are you?" from member list or creates a new member
- `getCurrentMemberId(groupId)` resolves the current device's member for UI highlighting and audit attribution

### Database

Schema key points:

- `Expense.splitMode` — enum: `PERCENTAGE | LOCK`
- `Expense` and `ExpenseSplit` amounts use `Decimal(12,2)` for precision
- `ExpenseAuditLog` tracks expense mutations with delta-based snapshots
- `GroupAuditLog` tracks member, group, and settlement mutations
- `ExchangeRateCache` stores JSON rate snapshots per date to avoid redundant API calls

### Path Alias

`@/*` maps to `src/*` — use this for all imports.
