'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type PermitFeature = Record<string, unknown> & {
  latitude: number;
  longitude: number;
};

const CALGARY: [number, number] = [-114.0719, 51.0447];
const SRC = 'permits';

// Data-driven color per permit type. Fallback = slate.
const typeColor: maplibregl.DataDrivenPropertyValueSpecification<string> = [
  'match',
  ['get', 'permittype'],
  'Residential Improvement Project', '#2563eb',
  'Commercial / Multi Family Project', '#ea580c',
  'Demolition', '#dc2626',
  'New Residential', '#16a34a',
  'Tenancy Change', '#9333ea',
  /* default */ '#64748b',
];

function toFeatureCollection(rows: PermitFeature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rows
      .filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(r.longitude), Number(r.latitude)] },
        properties: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? null])),
      })),
  };
}

function fmtMoney(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

function fmtDate(v: unknown): string {
  if (typeof v !== 'string') return '—';
  return v.slice(0, 10);
}

function esc(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function popupHTML(p: Record<string, unknown>): string {
  const row = (label: string, value: string) =>
    `<div class="flex justify-between gap-4 py-0.5"><span class="text-zinc-500">${label}</span><span class="font-medium text-right">${value}</span></div>`;
  const permitnum = esc(p.permitnum);
  const type = esc(p.permittype);
  const cls = esc(p.permitclass);
  const work = esc(p.workclass);
  const desc = p.description ? `<div class="text-xs text-zinc-700 mt-1 italic">${esc(p.description)}</div>` : '';
  const rows = [
    row('Address', esc(p.originaladdress)),
    row('Community', esc(p.communityname)),
    row('Type', type),
    p.permitclass ? row('Class', cls) : '',
    p.workclass ? row('Work', work) : '',
    row('Cost', fmtMoney(p.estprojectcost)),
    row('Status', esc(p.statuscurrent)),
    row('Issued', fmtDate(p.issueddate)),
    row('Applied', fmtDate(p.applieddate)),
    p.contractorname ? row('Contractor', esc(p.contractorname)) : '',
    p.applicantname ? row('Applicant', esc(p.applicantname)) : '',
    p.housingunits ? row('Units', esc(p.housingunits)) : '',
  ].join('');
  return `<div class="text-xs min-w-[260px]">
    <div class="font-mono font-semibold text-sm mb-1">${permitnum}</div>
    ${desc}
    <div class="mt-2 space-y-0 border-t border-zinc-200 pt-2">${rows}</div>
  </div>`;
}

export default function PermitMap({ rows }: { rows: PermitFeature[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: CALGARY,
      zoom: 10,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource(SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#93c5fd', 25, '#60a5fa', 100, '#2563eb'],
          'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 100, 28],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SRC,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SRC,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': typeColor,
          'circle-radius': 7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click a cluster to zoom in.
      map.on('click', 'clusters', async (e) => {
        const feat = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        const clusterId = feat?.properties?.cluster_id;
        if (clusterId == null) return;
        const src = map.getSource(SRC) as maplibregl.GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: (feat.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });

      // Popup on individual point.
      map.on('click', 'unclustered-point', (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        new maplibregl.Popup({ offset: 12, maxWidth: '320px' })
          .setLngLat(coords)
          .setHTML(popupHTML(feat.properties ?? {}))
          .addTo(map);
      });

      // Cursor feedback.
      for (const layer of ['clusters', 'unclustered-point']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Push new data on every rows change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const fc = toFeatureCollection(rows);
      src.setData(fc);
      if (fc.features.length === 0) return;
      const bounds = new maplibregl.LngLatBounds();
      for (const f of fc.features) bounds.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
      if (fc.features.length === 1) {
        const c = (fc.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.flyTo({ center: c, zoom: 14, duration: 600 });
      } else {
        map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 600 });
      }
    };
    if (map.isStyleLoaded() && map.getSource(SRC)) apply();
    else map.once('load', apply);
  }, [rows]);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ width: '100%', height: 480 }} />
      <Legend />
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ['#2563eb', 'Residential'],
    ['#ea580c', 'Commercial / MF'],
    ['#dc2626', 'Demolition'],
    ['#16a34a', 'New Residential'],
    ['#9333ea', 'Tenancy Change'],
    ['#64748b', 'Other'],
  ];
  return (
    <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-md px-3 py-2 text-xs shadow border border-zinc-200 dark:border-zinc-700">
      <div className="font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Permit type</div>
      <div className="flex flex-col gap-0.5">
        {items.map(([c, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: c }} />
            <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
