import type { Connector, ConnectorDeps, Job, JobSummary, SearchCriteria } from '../../types.js';
import { ConnectorError } from '../../types.js';
import { detectBlock } from '../../blocks.js';
import { parseLinkedInDetail, parseLinkedInGuestCards } from './parse.js';
import { buildLinkedInDetailUrl, buildLinkedInSearchUrl, type LinkedInSearchOptions } from './urls.js';

export interface LinkedInDeps extends ConnectorDeps {
  search?: LinkedInSearchOptions;
}

/** Guest mode only, from the user's own browser. Never takes or stores a session cookie. */
export function createLinkedInConnector(deps: LinkedInDeps): Connector {
  const now = () => deps.now?.() ?? new Date();
  const guard = (html: string) => {
    const block = detectBlock({ platform: 'linkedin', html });
    if (block.blocked) throw new ConnectorError('blocked', block.reason ?? 'blocked', 'linkedin');
  };
  return {
    platform: 'linkedin',
    async search(criteria: SearchCriteria, page: number): Promise<JobSummary[]> {
      const html = await deps.fetchText(buildLinkedInSearchUrl(criteria, page, deps.search).url);
      guard(html);
      return parseLinkedInGuestCards(html, now());
    },
    async detail(id: string): Promise<Job> {
      const html = await deps.fetchText(buildLinkedInDetailUrl(id).url);
      guard(html);
      return parseLinkedInDetail(html, id, now()).job;
    },
  };
}
