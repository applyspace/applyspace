/** Client helpers for the autocomplete routes. Each returns a plain list of labels, empty on any failure. */
const lang = () => (typeof document === 'undefined' ? 'en' : document.documentElement.lang.slice(0, 2) || 'en');

async function suggest(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch(`${path}?${new URLSearchParams({ ...params, lang: lang() })}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: string[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export const suggestPlaces = (q: string, signal?: AbortSignal) => suggest('/api/suggest/places', { q }, signal);
export const suggestJobTitles = (q: string, signal?: AbortSignal) => suggest('/api/suggest/titles', { q, kind: 'occupation' }, signal);
export const suggestSkills = (q: string, signal?: AbortSignal) => suggest('/api/suggest/titles', { q, kind: 'skill' }, signal);
