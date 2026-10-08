export * from './types.js';
export { searchCriteriaFromProfile, splitCriteria, type SearchProfileRow } from './criteria.js';
export { applyClientFilters } from './filters.js';
export { detectBlock, type BlockCheck } from './blocks.js';
export * from './normalize.js';
export { extractJsonLd, findJobPosting, jobPostingToJob } from './jsonld.js';

export * from './platforms/wttj/urls.js';
export * from './platforms/wttj/parse.js';
export { createWttjConnector, type WttjDeps } from './platforms/wttj/index.js';

export * from './platforms/hellowork/urls.js';
export * from './platforms/hellowork/parse.js';
export { createHelloWorkConnector } from './platforms/hellowork/index.js';

export * from './platforms/indeed/urls.js';
export * from './platforms/indeed/parse.js';
export { createIndeedConnector, type IndeedDeps } from './platforms/indeed/index.js';

export * from './platforms/linkedin/urls.js';
export * from './platforms/linkedin/parse.js';
export { createLinkedInConnector, type LinkedInDeps } from './platforms/linkedin/index.js';
