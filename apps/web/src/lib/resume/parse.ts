import { type ParseOutcome, parseResume } from '@apply/core/resume';
import { getResumeLlmProvider } from '@/lib/resume/provider';

/**
 * Resume text to a profile draft, on the server. Uses the Claude provider only
 * when it is explicitly enabled (see `provider.ts`); otherwise, and whenever
 * the model fails, the deterministic rules parser answers.
 */
export function parseResumeText(text: string): Promise<ParseOutcome> {
  return parseResume(text, { provider: getResumeLlmProvider() });
}
