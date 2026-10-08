import type { Connector, ConnectorDeps, Job, JobSummary, SearchCriteria } from '../../types.js';
import { ConnectorError } from '../../types.js';
import { detectBlock } from '../../blocks.js';
import { parseHelloWorkDetail, parseHelloWorkListing } from './parse.js';
import { buildHelloWorkDetailUrl, buildHelloWorkSearchUrl } from './urls.js';

export function createHelloWorkConnector(deps: ConnectorDeps): Connector {
  const now = () => deps.now?.() ?? new Date();
  return {
    platform: 'hellowork',
    async search(criteria: SearchCriteria, page: number): Promise<JobSummary[]> {
      const html = await deps.fetchText(buildHelloWorkSearchUrl(criteria, page).url);
      const block = detectBlock({ platform: 'hellowork', html });
      if (block.blocked) throw new ConnectorError('blocked', block.reason ?? 'blocked', 'hellowork');
      return parseHelloWorkListing(html, now()).jobs;
    },
    async detail(id: string): Promise<Job> {
      const url = /^https?:\/\//.test(id) ? id : buildHelloWorkDetailUrl(id);
      const html = await deps.fetchText(url);
      const block = detectBlock({ platform: 'hellowork', html });
      if (block.blocked) throw new ConnectorError('blocked', block.reason ?? 'blocked', 'hellowork');
      return parseHelloWorkDetail(html, url, now());
    },
  };
}
