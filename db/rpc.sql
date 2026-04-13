-- Run in Supabase → SQL Editor → New query → Run. Idempotent.
-- Creates a restricted read-only RPC for text-to-SQL.

-- 1. Allow anon to read permits (RLS stays on, we add a read-only policy).
drop policy if exists "permits public read" on permits;
create policy "permits public read" on permits for select to anon using (true);
grant select on permits to anon;

-- 2. The RPC. Runs as caller (anon), so it inherits anon's minimal grants.
--    Validation inside the function blocks non-SELECT and multi-statements.
create or replace function run_select(q text)
returns jsonb
language plpgsql
as $$
declare
  trimmed text := btrim(q);
  cleaned text;
  result  jsonb;
  total   bigint;
begin
  -- strip a single trailing semicolon if present
  cleaned := regexp_replace(trimmed, ';\s*$', '');

  if position(';' in cleaned) > 0 then
    raise exception 'Semicolons not allowed in query';
  end if;

  if not (lower(cleaned) ~ '^\s*(select|with)\s') then
    raise exception 'Only SELECT or WITH queries allowed';
  end if;

  -- per-call timeout, auto-reset at end of transaction
  perform set_config('statement_timeout', '30s', true);

  -- get total row count
  execute 'select count(*) from (' || cleaned || ') _cnt' into total;

  -- get capped rows
  execute
    'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (select * from ('
    || cleaned
    || ') _inner limit 1000) t'
  into result;

  return jsonb_build_object('rows', result, 'total', total);
end;
$$;

revoke all on function run_select(text) from public;
grant execute on function run_select(text) to anon;
