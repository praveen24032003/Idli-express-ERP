# Idly Express ERP

A mobile-first Progressive Web App for managing customers, orders, recurring templates,
daily production planning, and collections for a food manufacturing & distribution business.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router + Zustand
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase Auth + PostgreSQL + Row Level Security
- **Tables:** TanStack Table v8
- **Charts:** Recharts
- **Reports:** CSV (PapaParse) + PDF (jsPDF)
- **PWA:** vite-plugin-pwa (Workbox service worker, installable manifest)

## Project Structure

```
supabase/             Supabase CLI config and PostgreSQL migration
src/
  app/                Supabase auth context and staff access gate
  components/         Shared UI (AppShell, PageHeader, EmptyState, LoadingState, ErrorBoundary)
  features/           One folder per module: dashboard, customers, products, orders,
                       templates, production, ledger, reports (api client + zustand store + pages)
  routes/             React Router route table
  services/           Supabase browser client and database row mapping
  types/              Shared domain types (Customer, Product, Order, ...)
  utils/              Formatting + CSV/PDF export helpers
```

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows, copy `.env.example` to `.env` manually. Set the Supabase URL and publishable key in `.env`, then open http://localhost:5173 and sign in with an active Supabase staff account.

### Useful scripts

| Script                  | Purpose                                      |
|--------------------------|-----------------------------------------------|
| `npm run dev`            | Run Vite frontend                              |
| `npm run build`          | Type-check + production build (also generates the service worker) |

## Database

The deployed app uses Supabase PostgreSQL. Its initial schema is in
`supabase/migrations/20260928051517_initial_erp_schema.sql`; it is already applied to the
configured Supabase project. Template days support separate morning/evening quantities through
`supabase/migrations/20260928065102_add_template_day_session.sql`, also applied. All public ERP tables have RLS enabled. Access requires a Supabase
Auth user with an active row in `public.staff_members`. Do not apply the initial migration again.

Price formatting displays rupee amounts with up to two decimal places. New price and quantity
inputs start blank; recurring templates have separate Morning and Evening values for every weekday.

The old `server/` and `prisma/` directories are legacy SQLite/Express code and are not used by the
current frontend deployment.

## PWA / Offline Support

- Installable manifest (`vite-plugin-pwa`) with app icons in `public/icons/`.
- Workbox precaches the app shell (JS/CSS/HTML) for instant offline loads.
- An `OfflineBanner` shows when the browser goes offline.
- Supabase data reads and writes require an internet connection; offline mutation syncing is not implemented.

## Deployment

1. Import this GitHub repository into Vercel using build command `npm run build` and output directory `dist`.
2. Set Vercel environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project API settings.
3. Redeploy after adding the variables. HTTPS is required for service workers and PWA installation.
4. In Supabase Auth settings, set the production Site URL and allowed redirect URLs to the Vercel domain.

## Testing

```bash
npx playwright install chromium  # first machine setup only
npm run test:e2e                 # desktop + mobile workflow suite
npm run build                    # type-check + production/PWA build
npm run lint                     # lint source and configuration
```

The E2E suite covers auth/configuration gates, removal of Express API calls, fractional rupee display,
PWA manifest availability, and mobile authentication layout. Database workflows should also be
verified against the configured Supabase project.

Recurring templates store a separate quantity for each weekday and delivery session. Template
generation creates both morning and evening orders independently; Orders and Dashboard use the
same local calendar date for their default daily views.

## Release Notes / Known Gaps

This is a Phase 1 operational MVP. Staff authentication and active-staff RLS are enabled. Role-specific
authorization (owner/manager/operator/accountant), automated backup procedures, audit logging,
and offline mutation syncing remain future work. All current staff members share ERP table access.
