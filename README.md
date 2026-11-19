# ESR

ESR is a Next.js restaurant-discovery, diner-community, and account application backed by Supabase.

## Local development

1. Install dependencies with `npm install`.
2. Set the required environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose it with a `NEXT_PUBLIC_` prefix)
3. Configure Supabase Auth **Site URL** and redirect URLs to include the local app origin and `/auth/callback`. Enable and configure Google OAuth if that provider is required.
4. For a new Supabase project, apply `supabase/schema.sql`, then apply migrations in timestamp order. For an existing project, apply only migrations that have not already run:
   - `supabase/migrations/20260609_production_account_feed.sql`
   - `supabase/migrations/20260813_foodie_feed_realtime.sql`
5. Add real restaurants, offers, and community content through the application or approved data-import process. This repository does not auto-seed fictional restaurants or reviews.
6. Run `npm run dev`.

The application redirects `/` to Discover at `/user/offers`. User accounts, saved places, reviews, posts, notifications, and vouchers use Supabase; signing in is required for account-specific actions.

## Validation

- `npx tsc --noEmit`
- `npx eslint <changed-files>`
- `npm run build`
