import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/** Generated Open Graph card: lilac mark colour, near-black text on white. `?title=` is capped at 90 chars. */
export function GET(request: Request) {
  const title = (new URL(request.url).searchParams.get('title') || 'Your job search, finally in one space').slice(0, 90);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 36, color: '#0c0a09', fontWeight: 700 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: '#E2B8FF' }} />
          applyspace
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.1, color: '#0c0a09', fontWeight: 700, letterSpacing: -2 }}>{title}</div>
        <div style={{ fontSize: 28, color: '#57534e' }}>applyspace.app</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable' } },
  );
}
