"use client";

import { useState } from "react";
import { brandLogoFallbackUrl, brandLogoUrl } from "@/lib/brandfetch";

/* Placeholder offers. Brand logos come from Brandfetch by domain; the tile falls back to the brand's initial. */
const OFFERS: ReadonlyArray<{
  company: string;
  title: string;
  place: string;
  salary: string;
  domain: string;
}> = [
  { company: "Nike", title: "Senior Footwear Designer", place: "Amsterdam", salary: "65–80K", domain: "nike.com" },
  { company: "On", title: "Footwear Designer, Running", place: "Zurich · Hybride", salary: "70–90K", domain: "on.com" },
  { company: "Adidas", title: "Footwear Designer, Lifestyle", place: "Herzogenaurach", salary: "55–70K", domain: "adidas.com" },
  { company: "Asics", title: "Lead Footwear Designer", place: "Paris", salary: "70–85K", domain: "asics.com" },
  { company: "Puma", title: "Footwear Designer, Football", place: "Herzogenaurach", salary: "50–62K", domain: "puma.com" },
  { company: "Salomon", title: "Footwear Designer, Performance", place: "Annecy", salary: "55–68K", domain: "salomon.com" },
  { company: "Nike", title: "Footwear Designer, Basketball", place: "Amsterdam", salary: "60–75K", domain: "nike.com" },
  { company: "On", title: "Senior Footwear Designer", place: "Zurich", salary: "75–95K", domain: "on.com" },
];

function LogoTile({ company, domain }: { company: string; domain: string }) {
  // 0: simplified symbol, 1: default logo, 2: initial
  const [stage, setStage] = useState(0);
  // Idempotent per stage: onError and the ref check can both report the same failure.
  const next = () => setStage((s) => (s === stage ? stage + 1 : s));
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 text-2xl font-semibold text-stone-900">
      {stage > 1 ? (
        company[0]
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={stage}
          src={stage === 0 ? brandLogoUrl(domain) : brandLogoFallbackUrl(domain)}
          alt=""
          width={128}
          height={128}
          className={stage === 0 ? "size-full object-cover" : "size-full object-contain p-2.5"}
          onError={next}
          // The error can fire before hydration: catch images that already failed.
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) next();
          }}
        />
      )}
    </span>
  );
}

/**
 * Decorative list of offers shown beside the sign-in card: one list, rows
 * separated by hairlines. Static and aria-hidden. The list is much wider and
 * taller than the panel that holds it, so it is cropped on the right and bottom.
 */
export function OffersPreview() {
  return (
    <ul
      aria-hidden
      className="w-[60rem] select-none divide-y divide-stone-200 overflow-hidden rounded-[2rem] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
    >
      {OFFERS.map((o) => (
        <li key={o.company + o.title} className="flex items-center gap-5 px-7 py-6">
          <LogoTile company={o.company} domain={o.domain} />
          <div className="whitespace-nowrap">
            <div className="text-2xl font-semibold text-stone-950">{o.title}</div>
            <div className="mt-1 text-lg text-stone-500">
              {o.company} · {o.place}
            </div>
          </div>
          <span className="ml-auto whitespace-nowrap text-lg font-medium text-stone-950">{o.salary}</span>
        </li>
      ))}
    </ul>
  );
}
