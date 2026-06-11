## PSXTrack (Next.js 15 App Router + TypeScript)

A PSX stocks portfolio tracker that:
- Stores each buy order in Supabase (`orders` table)
- Computes portfolio summary + holdings using live PSX prices scraped from DPS
- Supports full CRUD for orders (create, read, update, delete)
- Runs seamlessly on Vercel free (single project)

---

## Local development

1. Install deps:
   ```bash
   npm install
   ```
2. Add a local `.env.local` (required for Supabase connectivity):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Run:
   ```bash
   npm run dev
   ```
4. Open: `http://localhost:3000`

---

## Supabase setup (SQL migration + seed)

1. Create a Supabase project.
2. Run the migration SQL in `supabase/migrations/0001_orders.sql`.
3. Seed initial orders by running `supabase/seed.sql` exactly.

After running, the app will read from `public.orders`.

---

## Vercel free deployment (single project)

1. In Vercel, click **New Project** and connect your GitHub repo.
2. Set Environment Variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL=your_project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
3. Deploy.

Once deployed, open:
`https://your-psx-portfolio.vercel.app`

---

## App routes

- `/` : Portfolio summary + holdings
- `/orders` : Full orders table with Add/Edit/Delete
- `/api/orders` : CRUD for orders
- `/api/price/[symbol]` : live price for a PSX symbol (edge runtime)

---

## Notes about price scraping

The app fetches DPS company pages and parses:
- the live close price from the page markup
- the timestamp from the page text

The fetch is cached with a 5 minute revalidation window and includes retry logic.
