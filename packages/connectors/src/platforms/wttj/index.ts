import type { Connector, ConnectorDeps, Job, JobSummary, SearchCriteria } from '../../types.js';
import { ConnectorError } from '../../types.js';
import { buildWttjSearchRequest, type WttjSearchRequest } from './urls.js';
import { parseWttjHits, parseWttjJobPage } from './parse.js';

export interface WttjDeps extends ConnectorDeps {
  /**
   * Sends the search request to the search-only index and returns the JSON body. Left to the
   * host because the real endpoint is unverified (run the probe first).
   */
  searchIndex(request: WttjSearchRequest): Promise<unknown>;
}

export function createWttjConnector(deps: WttjDeps): Connector {
  const urls = new Map<string, string>();
  const now = () => deps.now?.() ?? new Date();
  return {
    platform: 'wttj',
    async search(criteria: SearchCriteria, page: number): Promise<JobSummary[]> {
      const body = await deps.searchIndex(buildWttjSearchRequest(criteria, page));
      const jobs = parseWttjHits(body, now());
      for (const j of jobs) if (j.url) urls.set(j.externalId, j.url);
      return jobs;
    },
    async detail(id: string): Promise<Job> {
      const url = /^https?:\/\//.test(id) ? id : urls.get(id);
      if (!url) {
        throw new ConnectorError('unknown_id', `WTTJ reference ${id} was not returned by search; pass the job page URL`, 'wttj');
      }
      return parseWttjJobPage(await deps.fetchText(url), url, now());
    },
  };
}
