import type { Connector, ConnectorDeps, Job, JobSummary, SearchCriteria } from '../../types.js';
import { ConnectorError } from '../../types.js';
import { detectBlock } from '../../blocks.js';
import { parseIndeedDetail, parseIndeedResults } from './parse.js';
import { buildIndeedDetailUrl, buildIndeedSearchUrl, INDEED_DEFAULT_HOST } from './urls.js';

export interface IndeedDeps extends ConnectorDeps {
  host?: string;
}

/** Meant to run in the user's own browser (extension). */
export function createIndeedConnector(deps: IndeedDeps): Connector {
  const host = deps.host ?? INDEED_DEFAULT_HOST;
  const now = () => deps.now?.() ?? new Date();
  const guard = (html: string) => {
    const block = detectBlock({ platform: 'indeed', html });
    if (block.blocked) throw new ConnectorError('blocked', block.reason ?? 'blocked', 'indeed');
  };
  return {
    platform: 'indeed',
    async search(criteria: SearchCriteria, page: number): Promise<JobSummary[]> {
      const html = await deps.fetchText(buildIndeedSearchUrl(criteria, page, { host }).url);
      guard(html);
      return parseIndeedResults(html, host, now());
    },
    async detail(id: string): Promise<Job> {
      const html = await deps.fetchText(buildIndeedDetailUrl(id, host).url);
      guard(html);
      return parseIndeedDetail(html, id, host, now());
    },
  };
}
