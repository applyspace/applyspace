/**
 * Best-effort redaction of anything that looks like a credential before a file is written.
 * The probe never reads cookies or storage state; this only covers values that pages or JSON
 * responses echo (csrf tokens, API keys in URLs, bearer strings). Review probe-output before
 * sharing it anywhere.
 */
const SENSITIVE_KEY = /(token|secret|password|passwd|cookie|session|csrf|xsrf|auth|api[-_]?key|apikey|signature|credential|jwt|bearer)/i;
const SENSITIVE_PARAM = /(token|secret|password|key|sig|signature|auth|session|csrf|jwt|bearer|credential|appid|application-id|x-algolia)/i;

export const REDACTED = '[REDACTED]';

export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const name of [...u.searchParams.keys()]) {
      if (SENSITIVE_PARAM.test(name)) u.searchParams.set(name, REDACTED);
    }
    u.username = '';
    u.password = '';
    return u.toString();
  } catch {
    return raw;
  }
}

export function redactJson(value: unknown, depth = 0): unknown {
  if (depth > 30) return value;
  if (Array.isArray(value)) return value.map((v) => redactJson(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY.test(k) && typeof v !== 'object' ? REDACTED : redactJson(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function redactHtml(html: string): string {
  return html
    .replace(/(["']?(?:csrf|xsrf)[\w-]*["']?\s*[:=]\s*["'])[^"']{6,}(["'])/gi, `$1${REDACTED}$2`)
    .replace(/(<meta[^>]+name=["'][^"']*(?:csrf|xsrf)[^"']*["'][^>]+content=["'])[^"']*(["'])/gi, `$1${REDACTED}$2`)
    .replace(/(<input[^>]+name=["'][^"']*(?:csrf|xsrf|token)[^"']*["'][^>]+value=["'])[^"']*(["'])/gi, `$1${REDACTED}$2`)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/g, `Bearer ${REDACTED}`)
    .replace(/(["'](?:api[-_]?key|access[-_]?token|auth[-_]?token|session[-_]?id)["']\s*:\s*["'])[^"']+(["'])/gi, `$1${REDACTED}$2`);
}
