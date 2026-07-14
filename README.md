# 🍺 SplitWeiss

> Don't split wise. Split Weiss.

SplitWeiss is a no-login expense-sharing app built for groups — trips, dinners, house shares, festivals. Add expenses in any currency and SplitWeiss figures out the simplest way for everyone to settle up.

## Features

- **Flexible splitting** — split by fixed amount or percentage, per person
- **Multi-currency** — add expenses in any currency, settled in the group's base currency with live exchange rates
- **Smart settlement** — greedy algorithm minimizes the number of payments needed to clear all debts
- **No sign-up required** — share a group link and anyone with it can join instantly

## Stack

- [Next.js 15](https://nextjs.org/) — App Router, Server Actions
- [Prisma 6](https://www.prisma.io/) + [Neon](https://neon.tech/) PostgreSQL
- [React Query](https://tanstack.com/query) — client-side data fetching
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) — form validation
- [Decimal.js](https://mikemcl.github.io/decimal.js/) — precise financial arithmetic
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS 4](https://tailwindcss.com/)

## Getting Started

```bash
pnpm install
cp .env.example .env.local  # fill in your DATABASE_URL
pnpm prisma db push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev       # Start development server
pnpm build     # Production build
pnpm lint      # Run ESLint

pnpm prisma db push        # Push schema.prisma to the database
pnpm prisma generate       # Regenerate Prisma client
pnpm prisma studio         # Open Prisma Studio GUI
```
