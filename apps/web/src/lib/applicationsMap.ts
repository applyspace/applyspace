import type { HubApplication } from '@/lib/applicationsHub';
import { parseLocation } from '@/lib/utils';

/** Pure helpers of the Map layout: grouping by place and Web Mercator maths (no React, no I/O). */

export const TILE_SIZE = 256;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 14;

export interface Coord {
  lat: number;
  lon: number;
}

export interface Place {
  /** Lower-cased "city, country" used as the cache key. */
  key: string;
  /** Text shown and sent to the geocoder. */
  label: string;
  applications: HubApplication[];
}

const REMOTE_RE = /\b(remote|full remote|télétravail|teletravail|à distance|a distance|anywhere|worldwide)\b/i;

/** True for locations that are not a place: empty, or remote work. */
export function isUnlocated(location: string | null): boolean {
  return location === null || location.trim() === '' || REMOTE_RE.test(parseLocation(location));
}

/** Groups applications by place; remote and location-less ones are returned apart, never dropped. */
export function groupByPlace(apps: HubApplication[]): { places: Place[]; unlocated: HubApplication[] } {
  const byKey = new Map<string, Place>();
  const unlocated: HubApplication[] = [];
  for (const a of apps) {
    if (isUnlocated(a.location)) {
      unlocated.push(a);
      continue;
    }
    const label = parseLocation(a.location as string);
    const key = label.toLowerCase();
    const place = byKey.get(key) ?? { key, label, applications: [] };
    place.applications.push(a);
    byKey.set(key, place);
  }
  const places = [...byKey.values()].sort(
    (x, y) => y.applications.length - x.applications.length || x.label.localeCompare(y.label),
  );
  return { places, unlocated };
}

// --- Web Mercator ------------------------------------------------------------------

const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

/** World pixel of a coordinate at a zoom level. */
export function project({ lat, lon }: Coord, zoom: number): { x: number; y: number } {
  const size = worldSize(zoom);
  const sin = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

/** Coordinate of a world pixel at a zoom level. */
export function unproject(x: number, y: number, zoom: number): Coord {
  const size = worldSize(zoom);
  const n = Math.PI - (2 * Math.PI * y) / size;
  return {
    lat: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    lon: (x / size) * 360 - 180,
  };
}

export interface View {
  center: Coord;
  zoom: number;
}

/** Centre and zoom that show every point inside a width x height box, with padding. */
export function fitView(points: Coord[], width: number, height: number, padding = 56): View {
  if (points.length === 0) return { center: { lat: 46.6, lon: 2.4 }, zoom: 5 };
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const box = { n: Math.max(...lats), s: Math.min(...lats), e: Math.max(...lons), w: Math.min(...lons) };
  const center = { lat: (box.n + box.s) / 2, lon: (box.e + box.w) / 2 };
  if (box.n === box.s && box.e === box.w) return { center, zoom: 9 };
  const availW = Math.max(width - padding * 2, 64);
  const availH = Math.max(height - padding * 2, 64);
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const a = project({ lat: box.n, lon: box.w }, zoom);
    const b = project({ lat: box.s, lon: box.e }, zoom);
    if (Math.abs(b.x - a.x) <= availW && Math.abs(b.y - a.y) <= availH) return { center, zoom };
  }
  return { center, zoom: MIN_ZOOM };
}

/** Screen position (px from the top left of the box) of a coordinate for a view. */
export function toScreen(coord: Coord, view: View, width: number, height: number): { x: number; y: number } {
  const c = project(view.center, view.zoom);
  const p = project(coord, view.zoom);
  return { x: p.x - c.x + width / 2, y: p.y - c.y + height / 2 };
}

export interface TileRef {
  key: string;
  z: number;
  x: number;
  y: number;
  /** Screen position of the tile's top left corner. */
  left: number;
  top: number;
}

/** Tiles that cover the box for a view (longitude wraps, latitude is clamped). */
export function visibleTiles(view: View, width: number, height: number): TileRef[] {
  const c = project(view.center, view.zoom);
  const originX = c.x - width / 2;
  const originY = c.y - height / 2;
  const count = 2 ** view.zoom;
  const tiles: TileRef[] = [];
  for (let ty = Math.floor(originY / TILE_SIZE); ty <= Math.floor((originY + height) / TILE_SIZE); ty += 1) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(originX / TILE_SIZE); tx <= Math.floor((originX + width) / TILE_SIZE); tx += 1) {
      const wrapped = ((tx % count) + count) % count;
      tiles.push({
        key: `${view.zoom}/${tx}/${ty}`,
        z: view.zoom,
        x: wrapped,
        y: ty,
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }
  return tiles;
}

/** View after dragging the map by (dx, dy) screen pixels. */
export function pan(view: View, dx: number, dy: number): View {
  const c = project(view.center, view.zoom);
  return { zoom: view.zoom, center: unproject(c.x - dx, c.y - dy, view.zoom) };
}

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
