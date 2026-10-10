import { AUTH_STAGES, type AuthReport, type AuthStage } from '../shared/ipc.js';

/**
 * Error names the renderer may report. Anything else is logged as `other`, so a message
 * (which could echo a code) never reaches the log.
 */
const KNOWN_ERROR_NAMES = [
  'AuthApiError',
  'AuthPKCECodeVerifierMissingError',
  'AuthPKCEGrantCodeExchangeError',
  'AuthRetryableFetchError',
  'AuthSessionMissingError',
  'AuthUnknownError',
  'ExchangeTimeout',
  'TypeError',
  'Error',
] as const;
type KnownErrorName = (typeof KNOWN_ERROR_NAMES)[number];

const WORDS = [
  // where a deep link came from
  'macos-open-url',
  'second-instance',
  'cold-start',
  // what it was
  'code',
  'no-code',
  'bad-code',
  'not-ours',
  // what we did with it
  'stored',
  'duplicate',
  'link',
  'retry',
  'loaded',
  'page-load',
  'in-page-nav',
  'error',
  'other',
  'none',
  ...AUTH_STAGES,
  ...KNOWN_ERROR_NAMES,
] as const;
/** The only strings the auth log accepts as values. Codes, tokens and URLs cannot be logged. */
export type LogWord = (typeof WORDS)[number];
const WORD_SET: ReadonlySet<string> = new Set(WORDS);

export type AuthLogEvent =
  | 'deep-link'
  | 'deep-link-ignored'
  | 'notify'
  | 'taken'
  | 'reset'
  | 'gave-up'
  | 'renderer'
  | 'window';

export type AuthLogFields = Readonly<Record<string, number | boolean | null | LogWord>>;
export type AuthLog = (event: AuthLogEvent, fields?: AuthLogFields) => void;

/** One log line: ISO time, event, then `key=value` pairs. Unknown strings are replaced by their length. */
export function formatAuthLog(event: AuthLogEvent, fields: AuthLogFields, at: Date): string {
  const pairs = Object.entries(fields).map(([key, value]) => {
    const printed =
      typeof value === 'string' && !WORD_SET.has(value) ? `<redacted:${value.length}>` : String(value);
    return `${key}=${printed}`;
  });
  return `${at.toISOString()} [auth] ${event}${pairs.length ? ` ${pairs.join(' ')}` : ''}`;
}

export function createAuthLogger(write: (line: string) => void, now: () => Date = () => new Date()): AuthLog {
  return (event, fields = {}) => write(formatAuthLog(event, fields, now()));
}

export interface SanitizedReport {
  stage: AuthStage | 'other';
  errorName: KnownErrorName | 'other' | 'none';
  status: number | null;
}

/** The renderer is untrusted input: keep only a known stage, a known error name and a small integer status. */
export function sanitizeReport(raw: unknown): SanitizedReport {
  const report = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<AuthReport>;
  const stage = (AUTH_STAGES as readonly string[]).includes(report.stage as string)
    ? (report.stage as AuthStage)
    : 'other';
  const errorName =
    report.errorName === undefined
      ? 'none'
      : (KNOWN_ERROR_NAMES as readonly string[]).includes(report.errorName)
        ? (report.errorName as KnownErrorName)
        : 'other';
  const status =
    typeof report.status === 'number' && Number.isInteger(report.status) && report.status >= 100 && report.status <= 599
      ? report.status
      : null;
  return { stage, errorName, status };
}
