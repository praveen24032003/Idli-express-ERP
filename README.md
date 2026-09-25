# Idly Express ERP

A mobile-first Progressive Web App for managing customers, orders, recurring templates,
daily production planning, and collections for a food manufacturing & distribution business.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router + Zustand
- **Forms:** React Hook Form + Zod
- **Backend:** Express + Prisma ORM + SQLite
- **Tables:** TanStack Table v8
- **Charts:** Recharts
- **Reports:** CSV (PapaParse) + PDF (jsPDF)
- **PWA:** vite-plugin-pwa (Workbox service worker, installable manifest)

## Project Structure

```
prisma/              Prisma schema, migrations, seed script
server/               Express API (routes per module, Prisma client, error handling)
src/
  app/                (reserved for app-level composition)
  components/         Shared UI (AppShell, PageHeader, EmptyState, LoadingState, ErrorBoundary)
  features/           One folder per module: dashboard, customers, products, orders,
                       templates, production, ledger, reports (api client + zustand store + pages)
  routes/             React Router route table
  services/           Typed fetch wrapper (src/services/api.ts)
  types/              Shared domain types (Customer, Product, Order, ...)
  utils/              Formatting + CSV/PDF export helpers
```

## Getting Started

```bash
npm install
npx prisma migrate dev --name init   # creates prisma/dev.db and runs the seed script
npm run dev                          # runs Vite (5173) + Express API (4000) concurrently
```

Open http://localhost:5173.

### Useful scripts

| Script                  | Purpose                                      |
|--------------------------|-----------------------------------------------|
| `npm run dev`            | Run frontend + API together                   |
| `npm run dev:web`        | Frontend only                                  |
| `npm run dev:api`        | API only                                       |
| `npm run db:seed`        | Re-seed the database (20 customers, 4 products, templates, production, payments) |
| `npm run prisma:studio`  | Open Prisma Studio to inspect data             |
| `npm run build`          | Type-check + production build (also generates the service worker) |

## Database

SQLite file lives at `prisma/dev.db` (path configured via `DATABASE_URL` in `.env`).
Enums (customer type, product category, price type, session, channel) are modeled as
`String` columns because Prisma's SQLite connector has no native enum support — validity is
enforced with Zod at the API boundary (see `server/routes/*.ts` and `src/types/index.ts`).

## PWA / Offline Support

- Installable manifest (`vite-plugin-pwa`) with app icons in `public/icons/`.
- Workbox precaches the app shell (JS/CSS/HTML) for instant offline loads.
- GET requests to `/api/customers`, `/api/products`, `/api/orders`, `/api/templates`,
  `/api/production`, `/api/ledger`, `/api/reports`, `/api/dashboard` use a
  stale-while-revalidate strategy so previously loaded data is available offline.
- An `OfflineBanner` shows when the browser goes offline.
- Write operations (create/update/delete) currently require connectivity; the caching
  layer is structured so a background sync queue can be added later without refactoring.

## Deployment

1. `npm run build` — outputs the frontend to `dist/` and generates the service worker.
2. Deploy the Express API (`server/`) to any Node host (set `DATABASE_URL` and `PORT`).
   Run `npx prisma migrate deploy` against the production database on release.
3. Serve `dist/` as static files behind the same origin as the API (or configure the
   `VITE_API_URL` env var at build time and enable CORS on the API for a split deployment).
4. Ensure HTTPS in production — service workers and installable PWAs require a secure origin.

## Testing

```bash
npx playwright install chromium  # first machine setup only
npm run test:e2e                 # desktop + mobile workflow suite
npm run build                    # type-check + production/PWA build
npm run lint                     # lint source and configuration
```

The E2E suite covers route navigation, seeded dashboard data, customer and product validation,
order pricing calculation, recurring template generation workflow, production metrics, ledger
payment validation, report tab switching, PWA manifest availability, and mobile bottom navigation.

## Release Notes / Known Gaps

This is a complete Phase 1 operational MVP and is suitable for internal pilot use. Before public
production rollout, add user authentication and role-based permissions, server-side deployment
configuration, automated database backups, audit logging, and a durable offline mutation queue.
The current PWA caches the app shell and previously loaded GET data; create/update/delete actions
still require a network connection.
