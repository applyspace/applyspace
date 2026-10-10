import { redirect } from 'next/navigation';
import { NewApplicationScreen } from '@/components/applications/NewApplicationScreen';
import { readApplications } from '@/lib/applications';
import { readApplicationsContext } from '@/lib/applicationsForm';
import type { NewApplicationInput } from '@/lib/applicationsCreate';
import { readOffer } from '@/lib/offers';
import { UUID_RE } from '@/lib/supabase/rows';

/** Full-page creation form. `?offer=<id>` prefills it from an offer and links the application to it. */
export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string | string[] }>;
}) {
  const { offer: offerParam } = await searchParams;
  const offerId = Array.isArray(offerParam) ? offerParam[0] : offerParam;

  const [context, applications, offer] = await Promise.all([
    readApplicationsContext(),
    readApplications(),
    offerId && UUID_RE.test(offerId) ? readOffer(offerId).catch(() => null) : null,
  ]);
  // No account, nothing to create (demo host, signed out).
  if (!context.signedIn) redirect('/applications');

  const initial: Partial<NewApplicationInput> | undefined = offer
    ? { companyName: offer.company.name, jobTitle: offer.title, url: offer.url, location: offer.location, offerId: offer.id }
    : undefined;

  return (
    <NewApplicationScreen
      today={context.today}
      companyNames={context.companyNames}
      documents={context.documents}
      capReached={context.cap !== null && applications.length >= context.cap}
      cap={context.cap}
      initial={initial}
      fromOffer={offer !== null}
    />
  );
}
