import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSql } from './text2sql.ts';

const ok = (sql: string) => assert.equal(validateSql(sql).ok, true, `expected ok: ${sql}`);
const bad = (sql: string) => assert.equal(validateSql(sql).ok, false, `expected blocked: ${sql}`);

test('accepts basic SELECT from permits', () => {
  ok('SELECT permitnum FROM permits LIMIT 10');
});

test('accepts WITH CTE', () => {
  ok(`WITH addr AS (SELECT normalize_address('123 MAIN ST') AS q)
      SELECT * FROM permits, addr WHERE originaladdress % addr.q LIMIT 10`);
});

test('accepts PostGIS ST_DWithin', () => {
  ok(`SELECT permitnum FROM permits
      WHERE ST_DWithin(geom, ST_MakePoint(-114.07, 51.04)::geography, 1000)
      LIMIT 100`);
});

test('rejects non-SELECT', () => {
  bad('UPDATE permits SET statuscurrent = 0');
  bad('DELETE FROM permits');
  bad('DROP TABLE permits');
  bad('INSERT INTO permits VALUES (1)');
  bad('TRUNCATE permits');
  bad('GRANT ALL ON permits TO anon');
});

test('rejects pg_catalog / information_schema', () => {
  bad('SELECT * FROM pg_catalog.pg_user');
  bad('SELECT * FROM information_schema.tables');
  bad('SELECT * FROM permits WHERE permitnum IN (SELECT tablename FROM pg_tables)');
});

test('rejects dangerous functions', () => {
  bad('SELECT pg_sleep(10)');
  bad("SELECT pg_read_file('/etc/passwd')");
  bad("SELECT * FROM dblink('host=evil', 'SELECT 1') AS t(x int)");
});

test('allows single-line SQL comments (stripped before validation)', () => {
  ok('SELECT 1 -- drop this');
  ok("SELECT permitnum FROM permits -- just a comment\nWHERE permittype = 'Demolition'");
});

test('rejects block comments', () => {
  bad('SELECT 1 /* comment */ FROM permits');
});

test('rejects multi-statement', () => {
  bad('SELECT 1; DROP TABLE permits');
  bad('SELECT * FROM permits; SELECT * FROM profiles');
});

test('rejects references to other tables', () => {
  bad('SELECT * FROM profiles');
  bad('SELECT * FROM auth.users');
  bad('SELECT * FROM query_log');
  bad('SELECT * FROM permits JOIN profiles ON true');
});

test('allows CTE aliases like addr, anchor', () => {
  ok(`WITH anchor AS (SELECT latitude, longitude FROM permits LIMIT 1)
      SELECT p.* FROM permits AS p, anchor
      WHERE ST_DWithin(p.geom, ST_MakePoint(anchor.longitude, anchor.latitude)::geography, 500)`);
});
