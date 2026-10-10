'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, ArrowLeft01Icon, MapPinpoint01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import type { HubApplication } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import {
  clampZoom,
  fitView,
  groupByPlace,
  pan,
  toScreen,
  visibleTiles,
  type Coord,
  type Place,
  type View,
} from '@/lib/applicationsMap';
import { cn } from '@/lib/utils';
import { CompanyLogo } from './CompanyLogo';
import { STATUS_TONE } from './statusTone';

/** Coordinates by place key, kept for the session so switching layouts does not geocode again. */
const coordCache = new Map<string, Coord | null>();
const inflight = new Set<string>();

type Lookup = 'ok' | 'failed';

async function lookup(place: Place): Promise<Lookup> {
  inflight.add(place.key);
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(place.label)}`);
    if (!res.ok) return 'failed';
    const data = (await res.json()) as { lat: number | null; lon: number | null };
    coordCache.set(place.key, typeof data.lat === 'number' && typeof data.lon === 'number' ? { lat: data.lat, lon: data.lon } : null);
    return 'ok';
  } catch {
    return 'failed';
  } finally {
    inflight.delete(place.key);
  }
}

/** Applications on a map by place (Geoapify through our own routes). Remote and unlocated ones are listed apart. */
export function MapLayout({
  applications,
  onOpen,
}: {
  applications: HubApplication[];
  onOpen: (application: HubApplication) => void;
}) {
  const { t } = useHubT();
  const { places, unlocated } = useMemo(() => groupByPlace(applications), [applications]);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState(false);
  const [userView, setUserView] = useState<View | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Geocode the places we do not know yet, one at a time.
  useEffect(() => {
    let cancelled = false;
    const missing = places.filter((p) => !coordCache.has(p.key) && !inflight.has(p.key));
    if (missing.length === 0) return;
    void (async () => {
      for (const place of missing) {
        const result = await lookup(place);
        if (cancelled) return;
        if (result === 'failed') {
          setFailed(true);
          return;
        }
        bump();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [places]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const located = places.flatMap((p) => {
    const coord = coordCache.get(p.key);
    return coord ? [{ place: p, coord }] : [];
  });
  const notFound = places.filter((p) => coordCache.get(p.key) === null);
  const pending = places.filter((p) => !coordCache.has(p.key));
  const apart = [...unlocated, ...notFound.flatMap((p) => p.applications)];

  const view = userView ?? fitView(located.map((l) => l.coord), size.w, size.h);
  const selected = places.find((p) => p.key === selectedKey) ?? null;
  const ready = size.w > 0 && size.h > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <div
        ref={boxRef}
        className="relative h-[420px] min-h-[320px] touch-none overflow-hidden rounded-2xl border bg-muted lg:h-auto lg:flex-1"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setUserView(pan(view, dx, dy));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {ready && (
          <>
            {visibleTiles(view, size.w, size.h).map((tile) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.key}
                src={`/api/map/tiles/${tile.z}/${tile.x}/${tile.y}`}
                alt=""
                width={256}
                height={256}
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none dark:opacity-80 dark:invert-[0.88] dark:hue-rotate-180"
                style={{ left: tile.left, top: tile.top }}
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
              />
            ))}
            {located.map(({ place, coord }) => {
              const p = toScreen(coord, view, size.w, size.h);
              if (p.x < -40 || p.y < -40 || p.x > size.w + 40 || p.y > size.h + 40) return null;
              const active = place.key === selectedKey;
              return (
                <button
                  key={place.key}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setSelectedKey(active ? null : place.key)}
                  aria-label={`${place.label}, ${t.map.count(place.applications.length)}`}
                  aria-pressed={active}
                  className={cn(
                    'absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-xs font-semibold tabular-nums shadow-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                    active ? 'bg-primary text-primary-foreground' : 'bg-foreground text-background',
                  )}
                  style={{ left: p.x, top: p.y }}
                >
                  {place.applications.length}
                </button>
              );
            })}
          </>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <MapButton label={t.map.zoomIn} onClick={() => setUserView({ center: view.center, zoom: clampZoom(view.zoom + 1) })}>
            <HugeiconsIcon icon={Add01Icon} size={16} />
          </MapButton>
          <MapButton label={t.map.zoomOut} onClick={() => setUserView({ center: view.center, zoom: clampZoom(view.zoom - 1) })}>
            <HugeiconsIcon icon={MinusSignIcon} size={16} />
          </MapButton>
          <MapButton label={t.map.fit} onClick={() => setUserView(null)}>
            <HugeiconsIcon icon={MapPinpoint01Icon} size={16} />
          </MapButton>
        </div>

        {(failed || (ready && located.length === 0 && pending.length === 0)) && (
          <p className="absolute inset-x-3 bottom-8 rounded-xl bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground">
            {failed ? t.map.unavailable : t.map.nothingToShow}
          </p>
        )}
        <p className="pointer-events-none absolute right-2 bottom-1 text-[10px] text-muted-foreground">
          &copy; OpenStreetMap contributors, Powered by Geoapify
        </p>
      </div>

      <aside className="flex max-h-[60vh] shrink-0 flex-col gap-4 overflow-y-auto lg:max-h-none lg:w-80">
        {selected ? (
          <section className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              className="inline-flex w-fit items-center gap-1 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              {t.map.allPlaces}
            </button>
            <h2 className="text-sm font-medium text-foreground">{selected.label}</h2>
            <AppList applications={selected.applications} onOpen={onOpen} />
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.map.places}</h2>
              {places.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.map.nothingToShow}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {places.map((p) => (
                    <li key={p.key}>
                      <button
                        type="button"
                        disabled={!coordCache.get(p.key)}
                        onClick={() => setSelectedKey(p.key)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 enabled:hover:bg-muted disabled:opacity-60"
                      >
                        <span className="truncate text-foreground">{p.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {coordCache.has(p.key) ? t.map.count(p.applications.length) : t.map.locating}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {apart.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.map.unlocated}</h2>
                <AppList applications={apart} onOpen={onOpen} />
              </section>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border bg-background text-foreground shadow-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </button>
  );
}

function AppList({
  applications,
  onOpen,
}: {
  applications: HubApplication[];
  onOpen: (application: HubApplication) => void;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {applications.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onOpen(a)}
            className="flex w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <CompanyLogo name={a.companyName} domain={a.companyDomain} className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{a.companyName}</span>
              <span className="block truncate text-xs text-muted-foreground">{a.jobTitle}</span>
            </span>
            <span className={cn('size-2 shrink-0 rounded-full', STATUS_TONE[a.status].dot)} />
          </button>
        </li>
      ))}
    </ul>
  );
}
