-- Run this in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent).

create extension if not exists postgis;
create extension if not exists pg_trgm;

create table if not exists permits (
  permitnum          text primary key,
  statuscurrent      text,
  applieddate        timestamptz,
  issueddate         timestamptz,
  completeddate      timestamptz,
  permittype         text,
  permittypemapped   text,
  permitclass        text,
  permitclassgroup   text,
  permitclassmapped  text,
  workclass          text,
  workclassgroup     text,
  workclassmapped    text,
  description        text,
  applicantname      text,
  contractorname     text,
  housingunits       numeric,
  estprojectcost     numeric,
  totalsqft          numeric,
  originaladdress    text,
  communitycode      text,
  communityname      text,
  latitude           double precision,
  longitude          double precision,
  locationcount      integer,
  locationtypes      text,
  locationaddresses  text,
  locationswkt       text,
  geom geography(Point, 4326)
    generated always as (
      case when longitude is not null and latitude is not null
           then st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
      end
    ) stored
);

create index if not exists permits_issueddate_idx    on permits (issueddate desc);
create index if not exists permits_applieddate_idx   on permits (applieddate desc);
create index if not exists permits_community_idx     on permits (communityname);
create index if not exists permits_permittype_idx    on permits (permittype);
create index if not exists permits_workclass_idx     on permits (workclass);
create index if not exists permits_contractor_idx    on permits (contractorname);
create index if not exists permits_estcost_idx       on permits (estprojectcost);
create index if not exists permits_geom_gix          on permits using gist (geom);
create index if not exists permits_address_trgm_idx    on permits using gin (originaladdress gin_trgm_ops);
create index if not exists permits_applicant_trgm_idx  on permits using gin (applicantname gin_trgm_ops);
create index if not exists permits_contractor_trgm_idx on permits using gin (contractorname gin_trgm_ops);

-- Row Level Security: keep table locked down. Server uses service_role which bypasses RLS.
alter table permits enable row level security;

-- Small metadata table for tracking ingest runs.
create table if not exists ingest_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_upserted integer,
  max_applieddate timestamptz,
  notes text
);
alter table ingest_runs enable row level security;
