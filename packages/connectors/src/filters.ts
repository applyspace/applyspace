import { annualize } from './normalize.js';
import type { JobSummary, SearchCriteria } from './types.js';

/**
 * Applies the criteria a platform cannot filter by URL: posted-within days, minimum salary and
 * contract type. Offers with unknown values are kept (unknown is not a mismatch).
 */
export function applyClientFilters<T extends JobSummary>(
  jobs: T[],
  criteria: SearchCriteria,
  now: Date = new Date(),
): T[] {
  const cutoff =
    criteria.postedWithinDays && criteria.postedWithinDays > 0
      ? now.getTime() - criteria.postedWithinDays * 86_400_000
      : null;
  return jobs.filter((job) => {
    if (cutoff !== null && job.postedAt) {
      // Relative dates resolve to the start of the day: allow one extra day.
      if (new Date(job.postedAt).getTime() < cutoff - 86_400_000) return false;
    }
    if (criteria.salaryMin && job.salary) {
      const currencyOk = !job.salary.currency || !criteria.salaryCurrency || job.salary.currency === criteria.salaryCurrency;
      const top = job.salary.max ?? job.salary.min;
      const yearlyTop = annualize(top, job.salary.period) ?? (job.salary.period ? null : top);
      if (currencyOk && yearlyTop !== null && yearlyTop < criteria.salaryMin) return false;
    }
    if (criteria.contractTypes.length && job.contract && !criteria.contractTypes.includes(job.contract)) {
      return false;
    }
    return true;
  });
}
