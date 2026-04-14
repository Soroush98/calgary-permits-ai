'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type PermitFeature = Record<string, unknown> & {
  latitude: number;
  longitude: number;
};

export type Anchor = { latitude: number; longitude: number; radiusM: number };

function circlePolygon(center: [number, number], radiusM: number, steps = 64): GeoJSON.Feature {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const latDeg = radiusM / 110574;
  const lngDeg = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngDeg * Math.cos(a), lat + latDeg * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

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
  return `<div class="text-xs w-[240px] max-h-[260px] overflow-y-auto">
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="font-mono font-semibold text-sm truncate">${permitnum}</div>
      <button data-action="goto-row" class="shrink-0 text-[11px] text-blue-600 hover:text-blue-800 underline underline-offset-2">Go to row ↓</button>
    </div>
    ${desc}
    <div class="mt-2 space-y-0 border-t border-zinc-200 pt-2">${rows}</div>
  </div>`;
}

const SPIDER_SRC = 'spider';
const SPIDER_LEGS = 'spider-legs';
const SPIDER_POINTS = 'spider-points';

function clearSpider(map: maplibregl.Map) {
  const src = map.getSource(SPIDER_SRC) as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData({ type: 'FeatureCollection', features: [] });
  const legSrc = map.getSource(SPIDER_LEGS) as maplibregl.GeoJSONSource | undefined;
  if (legSrc) legSrc.setData({ type: 'FeatureCollection', features: [] });
}

function spiderfy(map: maplibregl.Map, center: [number, number], leaves: GeoJSON.Feature[]) {
  const count = leaves.length;
  // Radius in pixels, converted to degrees roughly at current zoom
  const pixelRadius = Math.min(40 + count * 3, 120);
  const zoom = map.getZoom();
  const metersPerPixel = (40075016.686 * Math.cos((center[1] * Math.PI) / 180)) / (256 * Math.pow(2, zoom));
  const degPerPixel = metersPerPixel / 111320;
  const radius = pixelRadius * degPerPixel;

  const spiderFeatures: GeoJSON.Feature[] = [];
  const legFeatures: GeoJSON.Feature[] = [];

  const lngStretch = 1 / Math.cos((center[1] * Math.PI) / 180);
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const lng = center[0] + radius * Math.cos(angle) * lngStretch;
    const lat = center[1] + radius * Math.sin(angle);
    spiderFeatures.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: leaves[i].properties,
    });
    legFeatures.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [center, [lng, lat]] },
      properties: {},
    });
  }

  const legSrc = map.getSource(SPIDER_LEGS) as maplibregl.GeoJSONSource;
  legSrc.setData({ type: 'FeatureCollection', features: legFeatures });
  const src = map.getSource(SPIDER_SRC) as maplibregl.GeoJSONSource;
  src.setData({ type: 'FeatureCollection', features: spiderFeatures });
}

const ANCHOR_SRC = 'anchor';
const RADIUS_SRC = 'radius';

export default function PermitMap({
  rows,
  anchor,
  selectedPermitnum,
  onSelect,
  onGoToRow,
}: {
  rows: PermitFeature[];
  anchor?: Anchor | null;
  selectedPermitnum?: string | null;
  onSelect?: (permitnum: string | null) => void;
  onGoToRow?: (permitnum: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const onGoToRowRef = useRef(onGoToRow);
  onSelectRef.current = onSelect;
  onGoToRowRef.current = onGoToRow;

  // Initialize once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const mtKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const style: maplibregl.StyleSpecification | string = mtKey
      ? `https://api.maptiler.com/maps/dataviz/style.json?key=${mtKey}`
      : {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 18,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        };
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: CALGARY,
      zoom: 10,
      maxZoom: 19,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource(SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 17,
        clusterRadius: 20,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#93c5fd', 25, '#60a5fa', 100, '#2563eb'],
          'circle-radius': ['step', ['get', 'point_count'], 14, 25, 18, 100, 24],
          'circle-stroke-width': 1.5,
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
          'text-size': 11,
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
          'circle-radius': 4,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Highlight ring for selected permit (updated via filter).
      map.addLayer({
        id: 'unclustered-point-selected',
        type: 'circle',
        source: SRC,
        filter: ['==', ['get', 'permitnum'], '__none__'],
        paint: {
          'circle-radius': 9,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fbbf24',
        },
      });

      // Radius ring (below markers).
      map.addSource(RADIUS_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: RADIUS_SRC,
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.06 },
      }, 'clusters');
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: RADIUS_SRC,
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': 0.7 },
      }, 'clusters');

      // Anchor marker (above everything).
      map.addSource(ANCHOR_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'anchor-halo',
        type: 'circle',
        source: ANCHOR_SRC,
        paint: {
          'circle-radius': 14,
          'circle-color': '#fbbf24',
          'circle-opacity': 0.25,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f59e0b',
        },
      });
      map.addLayer({
        id: 'anchor-point',
        type: 'circle',
        source: ANCHOR_SRC,
        paint: {
          'circle-radius': 6,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Spider sources + layers for co-located permits.
      map.addSource(SPIDER_LEGS, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'spider-leg-lines',
        type: 'line',
        source: SPIDER_LEGS,
        paint: { 'line-color': '#94a3b8', 'line-width': 1 },
      });
      map.addSource(SPIDER_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: SPIDER_POINTS,
        type: 'circle',
        source: SPIDER_SRC,
        paint: {
          'circle-color': typeColor,
          'circle-radius': 6,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click a cluster: spiderfy if leaves are co-located, else fit bounds to leaves.
      map.on('click', 'clusters', async (e) => {
        clearSpider(map);
        const feat = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        const clusterId = feat?.properties?.cluster_id;
        const pointCount = feat?.properties?.point_count;
        if (clusterId == null) return;
        const src = map.getSource(SRC) as maplibregl.GeoJSONSource;
        const leaves = (await src.getClusterLeaves(clusterId, pointCount ?? 1000, 0)) as GeoJSON.Feature[];
        const center = (feat.geometry as GeoJSON.Point).coordinates as [number, number];

        // Measure how spread out the leaves are.
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        for (const l of leaves) {
          const [lng, lat] = (l.geometry as GeoJSON.Point).coordinates as [number, number];
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        const latMid = (minLat + maxLat) / 2;
        const spreadM = Math.max(
          (maxLat - minLat) * 110574,
          (maxLng - minLng) * 111320 * Math.cos((latMid * Math.PI) / 180),
        );

        if (spreadM < 5) {
          // Truly co-located — spiderfy around the shared point.
          map.easeTo({ center, zoom: Math.max(map.getZoom(), 17), duration: 300 });
          setTimeout(() => spiderfy(map, center, leaves), 350);
        } else {
          // Distinct positions — fit them so they separate into individual markers.
          const bounds = new maplibregl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);
          map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 400 });
        }
      });

      const panPopupIntoView = (popup: maplibregl.Popup) => {
        const container = map.getContainer();
        const popupEl = popup.getElement();
        if (!popupEl) return;
        const cRect = container.getBoundingClientRect();
        const pRect = popupEl.getBoundingClientRect();
        const margin = 8;
        let dx = 0;
        let dy = 0;
        if (pRect.top < cRect.top + margin) dy = pRect.top - (cRect.top + margin);
        else if (pRect.bottom > cRect.bottom - margin) dy = pRect.bottom - (cRect.bottom - margin);
        if (pRect.left < cRect.left + margin) dx = pRect.left - (cRect.left + margin);
        else if (pRect.right > cRect.right - margin) dx = pRect.right - (cRect.right - margin);
        if (dx === 0 && dy === 0) return;
        map.panBy([dx, dy], { duration: 200 });
      };

      const openPopup = (coords: [number, number], props: Record<string, unknown>) => {
        const pn = typeof props.permitnum === 'string' ? props.permitnum : null;
        if (pn) onSelectRef.current?.(pn);
        const popup = new maplibregl.Popup({ offset: 8, maxWidth: '260px' })
          .setLngLat(coords)
          .setHTML(popupHTML(props))
          .addTo(map);
        if (pn) {
          const el = popup.getElement().querySelector<HTMLButtonElement>('[data-action="goto-row"]');
          el?.addEventListener('click', () => onGoToRowRef.current?.(pn));
        }
        requestAnimationFrame(() => panPopupIntoView(popup));
      };

      // Popup on spider point.
      map.on('click', SPIDER_POINTS, (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        openPopup(coords, feat.properties ?? {});
      });

      // Clear spider on map click elsewhere.
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters', SPIDER_POINTS, 'unclustered-point'] });
        if (features.length === 0) clearSpider(map);
      });

      // Popup on individual point.
      map.on('click', 'unclustered-point', (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        openPopup(coords, feat.properties ?? {});
      });

      // Cursor feedback.
      for (const layer of ['clusters', 'unclustered-point', SPIDER_POINTS]) {
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
      clearSpider(map);
      const fc = toFeatureCollection(rows);
      src.setData(fc);

      const anchorSrc = map.getSource(ANCHOR_SRC) as maplibregl.GeoJSONSource | undefined;
      const radiusSrc = map.getSource(RADIUS_SRC) as maplibregl.GeoJSONSource | undefined;
      if (anchor && Number.isFinite(anchor.latitude) && Number.isFinite(anchor.longitude)) {
        const c: [number, number] = [anchor.longitude, anchor.latitude];
        anchorSrc?.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } }],
        });
        if (Number.isFinite(anchor.radiusM) && anchor.radiusM > 0) {
          radiusSrc?.setData({ type: 'FeatureCollection', features: [circlePolygon(c, anchor.radiusM)] });
        } else {
          radiusSrc?.setData({ type: 'FeatureCollection', features: [] });
        }
      } else {
        anchorSrc?.setData({ type: 'FeatureCollection', features: [] });
        radiusSrc?.setData({ type: 'FeatureCollection', features: [] });
      }

      if (fc.features.length === 0 && !anchor) return;
      const bounds = new maplibregl.LngLatBounds();
      for (const f of fc.features) bounds.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
      if (anchor) bounds.extend([anchor.longitude, anchor.latitude]);
      if (fc.features.length + (anchor ? 1 : 0) === 1) {
        const c = anchor ? [anchor.longitude, anchor.latitude] as [number, number]
          : (fc.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.flyTo({ center: c, zoom: 15, duration: 600 });
      } else {
        map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 600 });
      }
    };
    if (map.isStyleLoaded() && map.getSource(SRC)) apply();
    else map.once('load', apply);
  }, [rows, anchor]);

  // Selection highlight.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer('unclustered-point-selected')) return;
      map.setFilter('unclustered-point-selected', [
        '==', ['get', 'permitnum'], selectedPermitnum ?? '__none__',
      ]);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [selectedPermitnum]);

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
