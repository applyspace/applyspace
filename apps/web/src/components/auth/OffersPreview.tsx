/* Placeholder offers. Set `logo` (an image path) to replace the initial tile with the real brand logo. */
const OFFERS: ReadonlyArray<{
  company: string;
  title: string;
  place: string;
  salary: string;
  logo?: string;
}> = [
  { company: "Nike", title: "Senior Product Designer", place: "Paris", salary: "65–80K" },
  { company: "On", title: "Product Designer", place: "Zurich · Hybride", salary: "70–90K" },
  { company: "Adidas", title: "UX Designer", place: "Remote", salary: "55–70K" },
  { company: "Asics", title: "Lead Product Designer", place: "Paris", salary: "70–85K" },
  { company: "Puma", title: "Digital Product Designer", place: "Lyon · Hybride", salary: "50–62K" },
  { company: "Salomon", title: "Product Designer, Apps", place: "Annecy", salary: "55–68K" },
  { company: "Nike", title: "Product Designer", place: "Amsterdam", salary: "60–75K" },
  { company: "On", title: "Senior UX/UI Designer", place: "Zurich", salary: "75–95K" },
];

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
          {/* Logo slot */}
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 text-2xl font-semibold text-stone-900">
            {o.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.logo} alt="" className="size-full object-contain p-2" />
            ) : (
              o.company[0]
            )}
          </span>
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
