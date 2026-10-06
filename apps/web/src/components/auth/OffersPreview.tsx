const OFFERS = [
  { company: "Alan", title: "Senior Product Designer", place: "Paris", salary: "60–75K", color: "#4D6EF8" },
  { company: "Qonto", title: "Product Designer", place: "Paris · Hybride", salary: "55–70K", color: "#7C5CFC" },
  { company: "Doctolib", title: "Lead Product Designer", place: "Remote", salary: "70–90K", color: "#2EA3F2" },
  { company: "PayFit", title: "Product Designer, Design System", place: "Paris", salary: "55–68K", color: "#E2528B" },
  { company: "Swile", title: "Product Designer", place: "Lyon · Hybride", salary: "50–62K", color: "#F59E42" },
  { company: "Back Market", title: "Senior UX/UI Designer", place: "Paris", salary: "60–72K", color: "#22A06B" },
  { company: "Pennylane", title: "Product Designer", place: "Paris · Hybride", salary: "52–65K", color: "#3B82F6" },
  { company: "Ledger", title: "Senior Product Designer", place: "Paris", salary: "65–80K", color: "#1F0D2C" },
] as const;

/**
 * Decorative list of offers shown beside the sign-in card. Static and
 * aria-hidden. Rows are much wider than the panel that holds them, so only
 * their left side shows: the right side is cropped by the panel's overflow.
 */
export function OffersPreview() {
  return (
    <ul aria-hidden className="flex w-[60rem] select-none flex-col gap-4">
      {OFFERS.map((o) => (
        <li
          key={o.company + o.title}
          className="flex items-center gap-5 rounded-2xl border border-[#E2B8FF]/60 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(31,13,44,0.2)]"
        >
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold text-white"
            style={{ backgroundColor: o.color }}
          >
            {o.company[0]}
          </span>
          <div className="whitespace-nowrap">
            <div className="text-2xl font-semibold text-[#1F0D2C]">{o.title}</div>
            <div className="mt-1 text-lg text-[#1F0D2C]/60">
              {o.company} · {o.place}
            </div>
          </div>
          <span className="ml-auto whitespace-nowrap text-lg font-medium text-[#1F0D2C]">{o.salary}</span>
        </li>
      ))}
    </ul>
  );
}
