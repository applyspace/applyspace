import type { ResumeLlmProvider } from '@apply/core/resume';

/**
 * Optional Claude provider for the resume parser (APP-108). Server-side only.
 *
 * OFF by default: nothing leaves the server unless the founder enables it with
 * three environment variables (set in Vercel, never committed):
 *   RESUME_LLM_ENABLED=1        explicit opt-in (resume text is sent to Anthropic)
 *   ANTHROPIC_API_KEY=...       secret, server-side only
 *   RESUME_LLM_MODEL=...        model id to use
 * Without all three the parser runs on the deterministic rules only.
 *
 * The request and the answer carry personal data: they are never logged here.
 */

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 45_000;

export function getResumeLlmProvider(): ResumeLlmProvider | null {
  if (process.env.RESUME_LLM_ENABLED !== '1') return null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.RESUME_LLM_MODEL;
  if (!apiKey || !model) return null;

  return {
    name: 'claude',
    async complete({ system, user, maxTokens }) {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { content?: { type: string; text?: string }[] };
      const text = data.content?.find((block) => block.type === 'text')?.text;
      if (!text) throw new Error('empty answer');
      return text;
    },
  };
}
