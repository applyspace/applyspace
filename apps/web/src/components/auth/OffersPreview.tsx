"use client";

import { useState } from "react";

/*
 * Placeholder offers. Brand logos are read from /public/logos/<file> (drop the
 * image files there); until a file exists the tile shows the brand's initial.
 */
const OFFERS: ReadonlyArray<{
  company: string;
  title: string;
  place: string;
  salary: string;
  logo: string;
}> = [
  { company: "Nike", title: "Senior Footwear Designer", place: "Amsterdam", salary: "65–80K", logo: "/logos/nike.svg" },
  { company: "On", title: "Footwear Designer, Running", place: "Zurich · Hybride", salary: "70–90K", logo: "/logos/on.svg" },
  { company: "Adidas", title: "Footwear Designer, Lifestyle", place: "Herzogenaurach", salary: "55–70K", logo: "/logos/adidas.svg" },
  { company: "Asics", title: "Lead Footwear Designer", place: "Paris", salary: "70–85K", logo: "/logos/asics.svg" },
  { company: "Puma", title: "Footwear Designer, Football", place: "Herzogenaurach", salary: "50–62K", logo: "/logos/puma.svg" },
  { company: "Salomon", title: "Footwear Designer, Performance", place: "Annecy", salary: "55–68K", logo: "/logos/salomon.svg" },
  { company: "Nike", title: "Footwear Designer, Basketball", place: "Amsterdam", salary: "60–75K", logo: "/logos/nike.svg" },
  { company: "On", title: "Senior Footwear Designer", place: "Zurich", salary: "75–95K", logo: "/logos/on.svg" },
];

function LogoTile({ company, logo }: { company: string; logo: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 text-2xl font-semibold text-stone-900">
      {missing ? (
        company[0]
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="size-full object-contain p-2.5"
          onError={() => setMissing(true)}
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
          <LogoTile company={o.company} logo={o.logo} />
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
