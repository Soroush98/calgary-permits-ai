import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SCHEMA = `
TABLE permits (
  permitnum          text primary key,          -- e.g. 'BP2026-05562'
  statuscurrent      text,                      -- 'Issued Permit' | 'Completed' | 'Pre Backfile' | etc.
  applieddate        timestamptz,               -- always present
  issueddate         timestamptz,               -- null while permit still under review; filter IS NOT NULL for "issued" queries
  completeddate      timestamptz,               -- rarely populated, ~2% fill. Avoid unless user explicitly asks about completed.
  permittype         text,                      -- 'Residential Improvement Project' | 'Single Construction Permit' | 'Commercial / Multi Family Project' | 'Demolition' | 'Sign'
  permitclass        text,                      -- e.g. '1101 - Basement Development', '1106 - Single Family House', '1506 - Apt Apartment', '1706 - Rhs Rowhouse'
  permitclassgroup   text,
  permitclassmapped  text,                      -- 'Residential' | 'Non-Residential' — high-level category, useful for filtering residential vs commercial
  workclass          text,                      -- 'New' | 'Alteration' | 'Addition' | 'Repair' | 'Demolition' | 'Fire/ Security Alarm'
  workclassgroup     text,
  workclassmapped    text,                      -- 'New' | 'Existing'
  description        text,                      -- free text, often terse like 'Basement Dev', ~65% filled
  applicantname      text,                      -- free text, not normalized
  contractorname     text,                      -- free text, ~60% filled, NOT deduplicated (same co. may appear as multiple strings)
  housingunits       numeric,
  estprojectcost     numeric,                   -- CAD dollars
  totalsqft          numeric,                   -- mostly null; do NOT use unless user insists
  originaladdress    text,                      -- e.g. '116 ROWMONT DR NW'
  communityname      text,                      -- UPPERCASE Calgary neighborhood name, e.g. 'BELTLINE', 'DOWNTOWN COMMERCIAL CORE', 'BRIDGELAND/RIVERSIDE'
  latitude           double precision,
  longitude          double precision,
  geom               geography(Point, 4326)     -- generated from lat/lon; use PostGIS functions (ST_DWithin, ST_Distance, etc.)
)
`.trim();

const SYSTEM = `You translate natural-language questions about Calgary building permits into a single PostgreSQL SELECT query.

Schema:
${SCHEMA}

Rules:
- Output exactly one SELECT (or WITH ... SELECT) statement. No semicolons, no comments, no DDL, no DML.
- The runtime wraps your query as \`SELECT * FROM (<your query>) t LIMIT 1000\` — write the query as a subquery-safe SELECT. Your own LIMIT is still allowed.
- PostGIS is enabled. For "near X" queries prefer ST_DWithin(geom, ST_MakePoint(lon, lat)::geography, meters). ALWAYS add LIMIT 200 to spatial queries — large result sets with ST_DWithin are expensive and will time out.
- communityname is UPPERCASE — use ILIKE or upper() when matching user input.
- IMPORTANT: Never use leading-wildcard ILIKE (e.g. '%residential%') on permittype or workclass — it prevents index usage and causes timeouts on large tables. Instead use IN with exact values. Known permittype values: 'Residential Improvement Project', 'Single Construction Permit', 'Commercial / Multi Family Project', 'Demolition', 'Sign'. Known workclass values: 'New', 'Alteration', 'Addition', 'Repair', 'Demolition', 'Fire/ Security Alarm'. There is NO 'New Residential' permittype. For "residential" queries use: permittype IN ('Residential Improvement Project', 'Single Construction Permit'). For "new residential construction" queries, filter by workclass = 'New' AND permitclassmapped = 'Residential' (or use permitclass values like '1106 - Single Family House', '1407 - Two Family Semi-Detached (1 Unit)', '1706 - Rhs Rowhouse'). Multi-family residential permits use permittype = 'Commercial / Multi Family Project' with residential permitclass values.
- For "issued" questions filter issueddate IS NOT NULL. Sort by issueddate DESC by default.
- Address matching: originaladdress is UPPERCASE with abbreviated street/quadrant tokens (e.g. '3524 31 ST NW'). A SQL helper function normalize_address(text) is defined server-side that uppercases, strips punctuation, and contracts full words to their abbreviations (DRIVE→DR, STREET→ST, AVENUE→AV, ROAD→RD, BOULEVARD→BV, PLACE→PL, CRESCENT→CR, COURT→CO, LANE→LN, WAY→WY, CLOSE→CL, HEIGHTS→HT, MANOR→MR, PARK→PK, PARKWAY→PY, TERRACE→TC, TRAIL→TR, VIEW→VW, GARDENS→GD, GROVE→GV, GREEN→GR, LINK→LI, LANDING→LD, POINT/POINTE→PT, PLAZA→PZ, RISE→RI, SQUARE→SQ, MEWS→ME, NORTHWEST→NW, NORTHEAST→NE, SOUTHWEST→SW, SOUTHEAST→SE, N/S/E/W). A pg_trgm GIN index on originaladdress is available. When the user gives a specific address, ALWAYS call normalize_address('<user input>') — never inline your own replace()/regexp_replace cascade, never use equality or leading-wildcard ILIKE. Pattern: WITH addr AS (SELECT normalize_address('<user input>') AS q) SELECT ..., similarity(originaladdress, addr.q) AS sim FROM permits, addr WHERE originaladdress % addr.q ORDER BY sim DESC LIMIT 25. The % operator uses the GIN index. For "near <address>" queries, pick the top-1 match in a CTE and then ST_DWithin against that point. ALSO include three constant columns on every returned row so the client can draw an anchor pin and radius ring: anchor_latitude (the matched address's latitude), anchor_longitude (matched address's longitude), search_radius_m (the radius in meters, same value as ST_DWithin's third arg). These should be the same value on every row — cross-join the anchor CTE in.
- Prefer applieddate over issueddate when the user says "applied" or "submitted".
- Dollar amounts are in CAD and live in estprojectcost.
- When a question is likely to be mapped (asks about places, areas, "near", "in <community>", or specific permits), include: latitude, longitude, permitnum, originaladdress, communityname, permittype, permitclass, workclass, statuscurrent, estprojectcost, issueddate, applieddate, contractorname, applicantname, description, housingunits. These populate a rich map popup.
- When asked for "top contractors" note: contractorname is not normalized. Group with upper(btrim(contractorname)) and filter contractorname IS NOT NULL.
- Fuzzy name matching: pg_trgm GIN indexes exist on applicantname and contractorname. When the user names a person, firm, or organization (e.g. "University of Calgary", "Stantec", "PCL", "John Smith"), DO NOT use equality or leading-wildcard ILIKE on these columns — both miss spelling variants, legal-entity suffixes ("LTD", "INC", "ULC"), and departmental subnames. Instead use the % operator (which hits the GIN index) combined with similarity() ranking. Pattern: WHERE (applicantname % '<query>' OR contractorname % '<query>') ORDER BY greatest(coalesce(similarity(applicantname,'<query>'),0), coalesce(similarity(contractorname,'<query>'),0)) DESC. You can loosen/tighten by setting pg_trgm.similarity_threshold via set_limit() inside a CTE if needed, but the default 0.3 is usually fine. Always search BOTH applicantname and contractorname when the user asks "who built X" or names an organization — the filer is often the architect/GC, not the owner.
- Owner semantics: there is no owner column. applicantname is whoever filed the permit (often an architect or GC), not the building owner. For "permits for <organization>'s buildings" questions, combine fuzzy name search on applicantname + contractorname + description with a spatial filter (ST_DWithin around the organization's known campus/address) and/or a communityname filter. Note in the explanation that owner is not a recorded field.
- If the request is impossible given the schema, emit a best-effort query and explain the limitation in "explanation".`;

const TOOL = {
  name: 'emit_sql',
  description: 'Return the SQL query and a short one-sentence explanation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      sql: { type: 'string', description: 'A single PostgreSQL SELECT statement, no trailing semicolon.' },
      explanation: { type: 'string', description: 'One sentence explaining what the query does.' },
    },
    required: ['sql', 'explanation'],
  },
};

export async function questionToSql(question: string): Promise<{ sql: string; explanation: string }> {
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'emit_sql' },
    messages: [{ role: 'user', content: question }],
  });

  const block = resp.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('Model did not emit a tool_use block');
  const input = block.input as { sql: string; explanation: string };
  return input;
}
