import snapshot from '@/data/demo-offers.json';
import { isDemoRequest } from '@/lib/hosted';
import type { ConnectorOffer, OfferConnector } from './types';

/**
 * Welcome to the Jungle connector.
 *
 * WTTJ forbids automated access in its robots.txt and Vercel cannot run a
 * browser, so the web app never contacts WTTJ. Live searches belong to an
 * execution backend that runs on the user's side (desktop window or browser
 * extension), which will replace this implementation.
 *
 * Until then: on the demo host (or with `APPLY_DEMO=1`) it serves the committed
 * snapshot, otherwise it reports that search is not available on the web yet.
 */

interface SnapshotJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  contract?: string;
  salary?: string;
  description?: string;
  url: string;
  postedAt?: string;
}

export const wttjConnector: OfferConnector = {
  slug: 'wttj',
  async searchOffers() {
    if (!(await isDemoRequest())) {
      return {
        status: 'unavailable',
        message:
          'Searching Welcome to the Jungle is not available on the web yet. It will run from the desktop app.',
      };
    }
    const offers: ConnectorOffer[] = (snapshot.jobs as SnapshotJob[]).map((job) => ({
      externalId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      contract: job.contract,
      salary: job.salary,
      description: job.description,
      url: job.url,
      postedAt: job.postedAt,
    }));
    return { status: 'ok', offers };
  },
};
