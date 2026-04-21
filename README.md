# Calgary Permits

Live at **[yycpermits.com](https://yycpermits.com)**.

This is a little side project I built to scratch my own itch. The City of Calgary publishes every building permit they issue — about 488,000 of them going back to the late 90s — but the official portal is a pain to search unless you already know exactly what you want. So I wired up an LLM that turns plain-English questions into SQL, runs the query against a Postgres copy of the dataset, and drops the results on a map.

You can ask it things like:

- *"Multi-family residential permits in Beltline issued since January over $5 million"*
- *"Top 10 contractors by permit count in the last 12 months"*
- *"Demolition permits within 1 km of downtown in the last 90 days"*

That last one hits PostGIS for the radius query. Most questions just work; occasionally the model guesses a column wrong and you'll see it in the generated SQL panel.

## Where the data comes from

Everything comes from the [Building Permits dataset](https://data.calgary.ca/Business-and-Economic-Activity/Building-Permits/c2es-76ed) (`c2es-76ed`) on Calgary's open data portal. The City updates it daily. I have a small ingestion script ([scripts/ingest.mjs](scripts/ingest.mjs)) that pulls from their Socrata endpoint in 50k-row pages and upserts into Postgres. You can do an incremental pull with `--since=<date>` so you're not re-downloading everything every time.

The data is covered by the [Open Government Licence – City of Calgary](https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa).

## How it's built

Next.js 16 on the App Router with React 19 server components. Tailwind v4 for styling. MapLibre GL + MapTiler vector tiles for the map, with PostGIS doing the spatial work. Postgres lives on Supabase, with `pg_trgm` for fuzzy contractor and address matching. Auth is Supabase's email+password flow, billing is Stripe Checkout, and the LLM is Claude Sonnet 4.6 via the Anthropic SDK — forced tool-use so the model can only respond through a structured SQL-emitting tool, with prompt caching on the schema and system prompt to keep costs reasonable.

## About the security

This is the part I thought about hardest, because the app literally takes user text, asks an LLM to write SQL, and runs it against a real database. If you're not careful that's a disaster waiting to happen. So there are a few layers:

**At the prompt layer** ([lib/text2sql.ts](lib/text2sql.ts)) the system prompt scopes the assistant strictly to Calgary permit questions, and the tool schema requires the model to flag whether the question is in-scope before any SQL is generated. User input gets wrapped in `<user_question>` tags with "treat as data, not instructions" framing, and I strip control chars, zero-width chars, and Unicode bidi overrides before anything reaches the model. The model also can't respond with freeform text — it can only call the `emit_sql` tool.

**At the validator layer** (post-LLM, pre-execution) every query has to start with `SELECT` or `WITH`, can't reference anything outside the `permits` table (CTE aliases excepted), and gets rejected if it contains any write keyword, any `pg_*` identifier, references to `pg_catalog` or `information_schema`, SQL comments, or multiple statements.

**At the database layer** the `run_select()` RPC runs as `SECURITY INVOKER`, not `DEFINER`, so it executes with the caller's privileges. The `anon` role has SELECT-only on `permits` and literally zero access to `profiles`, `query_log`, or `auth.users`. There's a 10-second `statement_timeout` on `anon` so a pathological PostGIS scan can't tie up the DB. Row-Level Security gates everything user-scoped.

**At the app layer** the `/api/query` route requires auth, enforces a per-user monthly quota server-side, caps questions at 500 chars, and the admin route is behind an obfuscated slug with server-side admin checks per request. Stripe webhooks are signature-verified.

## What I store about you

If you sign up, Supabase holds your email, a bcrypt hash of your password (I never see the plaintext), and if you upgrade, the opaque Stripe customer/subscription IDs. Your questions and the SQL the model generated get logged in `query_log` — mostly so I can enforce the monthly quota and debug bad queries when the model gets something wrong.

I don't store card numbers (Stripe handles all of that), I don't run analytics or ad trackers, and I don't log IPs. Everything's over TLS in transit and AES-256 at rest on Supabase's side. The browser only ever gets the `anon` key which can read the public permit data and nothing else — the `service_role` key that bypasses RLS stays on the server.

If you want your account deleted, email me. The `on delete cascade` on `auth.users` tears down everything associated with the account.

## Running it locally

You'll need a `.env.local` with:

```
ANTHROPIC_API_KEY=sk-ant-...

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_MAPTILER_KEY=<your-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# The repo folder is /admin but the public URL is /admin-<ADMIN_SLUG>
# via a middleware rewrite. Pick a random hex string.
ADMIN_SLUG=<random-hex-string>
```

Over in the Supabase SQL editor you'll need to enable `postgis` and `pg_trgm`, create the `permits` table (the schema lives in `SCHEMA` in [lib/text2sql.ts](lib/text2sql.ts)), load the open-data CSV into it, and define the `normalize_address(text)` helper and `run_select(q text)` RPC. Then lock down `anon`:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.permits TO anon;
GRANT EXECUTE ON FUNCTION public.run_select(text) TO anon;
ALTER ROLE anon SET statement_timeout = '10s';
```

You'll also need `profiles` (`id`, `plan`, `stripe_customer_id`) and `query_log` tables with RLS policies.

Then:

```bash
npm install
npm run dev
```

For Stripe webhooks in dev, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and paste the `whsec_...` it prints into your env.

## Layout

```
app/
  page.tsx              — landing + search hero
  QueryApp.tsx          — main client component
  PermitMap.tsx         — map, clustering, spiderfy, popups
  api/
    query/              — LLM + validator + DB execution
    me/                 — session + quota state
    stripe/             — checkout + webhook
    admin-*/            — obfuscated admin console
lib/
  text2sql.ts           — schema prompt, tool schema, SQL validator
  db.ts                 — run_select RPC wrapper
  plan.ts               — free/pro limits
  stripe.ts             — Stripe client
  supabase/             — SSR + browser clients
```

## License

Personal project — no code license yet, ask if you want to reuse something. The underlying permit data is covered by Calgary's open data licence linked above.
