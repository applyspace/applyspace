const OFFERS = [
  { company: "Alan", title: "Senior Product Designer", place: "Paris", contract: "CDI", salary: "60–75K", color: "#4D6EF8", match: 94 },
  { company: "Qonto", title: "Product Designer", place: "Paris · Hybride", contract: "CDI", salary: "55–70K", color: "#7C5CFC", match: 91 },
  { company: "Doctolib", title: "Lead Product Designer", place: "Remote", contract: "CDI", salary: "70–90K", color: "#2EA3F2", match: 88 },
  { company: "PayFit", title: "Product Designer, Design System", place: "Paris", contract: "CDI", salary: "55–68K", color: "#E2528B", match: 85 },
  { company: "Swile", title: "Product Designer", place: "Lyon · Hybride", contract: "CDI", salary: "50–62K", color: "#F59E42", match: 82 },
  { company: "Back Market", title: "Senior UX/UI Designer", place: "Paris", contract: "CDI", salary: "60–72K", color: "#22A06B", match: 79 },
  { company: "Pennylane", title: "Product Designer", place: "Paris · Hybride", contract: "CDI", salary: "52–65K", color: "#3B82F6", match: 76 },
  { company: "Ledger", title: "Senior Product Designer", place: "Paris", contract: "CDI", salary: "65–80K", color: "#111827", match: 74 },
  { company: "Mirakl", title: "Product Designer", place: "Paris · Hybride", contract: "CDI", salary: "52–64K", color: "#0EA5A4", match: 72 },
  { company: "Spendesk", title: "UX Designer", place: "Paris", contract: "CDI", salary: "48–60K", color: "#A855F7", match: 70 },
] as const;

/**
 * Decorative list of offers shown beside the sign-in card. Static and
 * aria-hidden: it only suggests what the app looks like. The list is meant to
 * overflow its container, which crops it on the right and at the bottom.
 */
export function OffersPreview() {
  return (
    <div aria-hidden className="w-[38rem] select-none rounded-2xl border border-black/5 bg-white shadow-[0_30px_80px_-20px_rgba(77,50,140,0.35)]">
      <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
        <div className="text-sm font-semibold">Product Designer</div>
        <div className="flex gap-2">
          {["CDI", "Paris", "55K+"].map((chip) => (
            <span key={chip} className="rounded-full bg-[#F3E8FF] px-2.5 py-1 text-[11px] font-medium text-[#6B3FA0]">
              {chip}
            </span>
          ))}
        </div>
      </div>
      <ul>
        {OFFERS.map((o) => (
          <li key={o.company + o.title} className="flex items-center gap-4 border-b border-black/5 px-5 py-4 last:border-b-0">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: o.color }}
            >
              {o.company[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{o.title}</div>
              <div className="mt-0.5 truncate text-xs text-neutral-500">
                {o.company} · {o.place}
              </div>
            </div>
            <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">{o.contract}</span>
            <span className="w-16 text-right text-xs text-neutral-500">{o.salary}</span>
            <span className="w-10 rounded-full bg-[#F3E8FF] py-1 text-center text-[11px] font-semibold text-[#6B3FA0]">{o.match}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
