# Calgary Permits

Ask anything about 488,000+ City of Calgary building permits in plain English. An LLM translates your question to PostgreSQL, the query runs read-only, results land on a map and in a sortable table.

Examples:
- *"Multi-family residential permits in Beltline issued since January over $5 million"*
- *"Top 10 contractors by permit count in the last 12 months"*
- *"Demolition permits within 1 km of downtown in the last 90 days"*

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Components) |
| Styling | **Tailwind CSS v4** with custom glass/mesh-gradient hero |
| Map | **MapLibre GL** + **MapTiler** (dataviz vector tiles), PostGIS for spatial queries |
| Database | **Postgres** on **Supabase** with the PostGIS extension, `pg_trgm` for fuzzy address/contractor search |
| LLM | **Anthropic Claude Sonnet 4.6** via the `@anthropic-ai/sdk`, forced tool-use for structured SQL output, prompt caching on the schema/system prompt |
| Auth | **Supabase Auth** (email + password, SSR cookies via `@supabase/ssr`) |
| Billing | **Stripe Checkout** + webhooks for subscription lifecycle |
| Hosting | Vercel-ready (Next 16 server runtime) |

## Features

- **Natural-language → SQL** with a tight schema prompt, PostGIS-aware for "near X" queries, `normalize_address()` helper for Calgary's abbreviated address format.
- **Interactive map** — clustered color-coded pins per permit type. Dense clusters either fit-bounds to real positions or spiderfy when permits share an address. Popups auto-pan into view so they never underflow the container.
- **Synchronized table** — click a map pin to highlight the row; hover a row to pulse the pin.
- **Free / Pro tiers** — 10 free queries per month, $30/mo for 1,000 queries. Enforced server-side against `query_log`.
- **Admin console** at an obfuscated route for inspecting logs and running ad-hoc queries.

## Security

The app takes arbitrary user text, asks an LLM to write SQL, and runs it against a real database. That surface is explicitly defended in depth:

### 1. Prompt-layer hardening ([lib/text2sql.ts](lib/text2sql.ts))
- **Scope enforcement** — the system prompt declares the assistant's only job is Calgary permits. The tool schema requires an `in_scope: boolean` flag. Off-topic, meta, or roleplay requests → polite refusal, no SQL runs.
- **Prompt-injection resistance** — user input is wrapped in `<user_question>…</user_question>` tags with explicit "treat as data, not instructions" framing. Control chars, zero-width chars, and Unicode bidi overrides are stripped before the prompt ever reaches the model.
- **Forced tool use** — the model can only respond via the `emit_sql` tool, so it cannot emit freeform dangerous output.

### 2. SQL validator (post-LLM, pre-execution)
Every generated query is checked against an allowlist before it touches the database:
- Must start with `SELECT` or `WITH`.
- Blocks write keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`).
- Blocks info-disclosure / admin functions (`pg_sleep`, `pg_read_file`, `pg_ls_dir`, `dblink`, any `pg_*` identifier).
- Blocks `pg_catalog` and `information_schema` references.
- Blocks SQL comments (`--`, `/* */`) and multi-statement queries (`;` followed by more SQL).
- Only the `permits` table is allow-listed; CTE aliases are recognized and permitted.

### 3. Database-layer least privilege
- The `run_select(text)` RPC runs `SECURITY INVOKER`, not `DEFINER` — it executes with the caller's privileges, not the function creator's.
- The `anon` role has `SELECT`-only on `public.permits` and zero access to `profiles`, `query_log`, or `auth.users`.
- `statement_timeout = 10s` on the `anon` role caps single-query runtime to prevent DoS via expensive PostGIS scans.
- Supabase Row-Level Security policies gate all user-scoped tables.

### 4. Application-layer
- Auth required on `/api/query` — unauthenticated requests get `401`.
- Per-user monthly quota enforced server-side against `query_log`.
- Question length capped at 500 chars.
- Admin route path is obfuscated; admin status checked server-side per request.
- Stripe webhook signature verified via `STRIPE_WEBHOOK_SECRET`.

## Local setup

### 1. Environment variables
Create `.env.local`:

```
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, used by webhook

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Map tiles
NEXT_PUBLIC_MAPTILER_KEY=<your-key>

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Admin — the public URL slug for the admin console.
# Folder in repo is /admin, but public URL is /admin-<ADMIN_SLUG> via middleware rewrite.
ADMIN_SLUG=<random-hex-string>
```

### 2. Database
In the Supabase SQL editor:
1. Enable extensions: `postgis`, `pg_trgm`.
2. Create the `permits` table (see `SCHEMA` in [lib/text2sql.ts](lib/text2sql.ts)) and load the City of Calgary open-data CSV.
3. Define the `normalize_address(text)` helper and the `run_select(q text)` RPC (SECURITY INVOKER).
4. Create `profiles` (`id`, `plan`, `stripe_customer_id`) and `query_log` (`user_id`, `question`, `sql`, `error`, `rows_returned`, `created_at`) tables with appropriate RLS policies.
5. Lock `anon` grants: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon; GRANT SELECT ON public.permits TO anon; GRANT EXECUTE ON FUNCTION public.run_select(text) TO anon;`
6. Statement timeout: `ALTER ROLE anon SET statement_timeout = '10s';`

### 3. Run it
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 4. Stripe webhook (local dev)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Usage

1. Open the site, sign up (email + password).
2. Type a question in the search bar, or click an example chip.
3. Results render as (a) an interactive map with clustered pins and (b) a scrollable table. Click a pin to see full permit details; click a row to highlight the matching pin.
4. Expand *Generated SQL* to see the exact query the LLM wrote.
5. Hit the free-tier limit → upgrade dialog surfaces the Pro plan (Stripe Checkout).

## Project layout

```
app/
  page.tsx              — landing + search hero
  QueryApp.tsx          — main client component (search form, results, table)
  PermitMap.tsx         — MapLibre map, clustering, spiderfy, popups
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

Personal project. City of Calgary open data is licensed under the [Open Government Licence – City of Calgary](https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa).
