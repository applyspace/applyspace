'use client';

import { cn } from '@/lib/utils';

/**
 * Source-owned flag SVGs (3:2). flagcn.dev could not be reached from the build sandbox, so these come from the MIT-licensed
 * country-flag-icons set; swap them for `npx shadcn add` flagcn components whenever convenient.
 */
const FLAGS: Record<string, { viewBox: string; body: React.ReactNode }> = {
  en: { viewBox: '0 0 513 342', body: <><g fill="#FFF"><path d="M0 0h513v341.3H0V0z"/><path d="M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6z"/></g><g fill="#012169"><path d="M393.8 230 513 295.7V230H393.8zm-82.1 0L513 341.3v-31.5L369.3 230h-57.6zm146.9 111.3-147-81.7v81.7h147zM90.3 230 0 280.2V230h90.3zm110 14.2v97.2H25.5l174.8-97.2zM118.2 111.3 0 45.6v65.7h118.2zm82.1 0L0 0v31.5l143.7 79.8h56.6zM53.4 0l147 81.7V0h-147zM421.7 111.3 513 61.1v50.2h-91.3zm-110-14.2V0h174.9L311.7 97.1z"/></g><g fill="#c8102e"><path d="M288 0h-64v138.7H0v64h224v138.7h64V202.7h224v-64H288V0z"/><path d="M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM143.7 230 0 309.9v31.5L200.3 230h-56.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6zM368.3 111.3 513 31.5V0L311.7 111.3h56.6z"/></g></> },
  fr: { viewBox: '0 0 513 342', body: <><path fill="#FFF" d="M0 0h513v342H0z"/><path fill="#00318A" d="M0 0h171v342H0z"/><path fill="#D80027" d="M342 0h171v342H342z"/></> },
  de: { viewBox: '0 0 513 342', body: <><path fill="#D80027" d="M0 0h513v342H0z"/><path d="M0 0h513v114H0z"/><path fill="#FFDA44" d="M0 228h513v114H0z"/></> },
  es: { viewBox: '0 0 22.5 15', body: <><path fill="#FFF" d="M0 0h22.5v15H0V0z"/><path fill="#D03433" d="M0 0h22.5v4H0V0zm0 11h22.5v4H0v-4z"/><path fill="#FBCA46" d="M0 4h22.5v7H0V4z"/><path fill="#FFF" d="M7.8 7h1v.5h-1V7z"/><path fill="#A41517" d="M7.2 8.5c0 .3.3.5.6.5s.6-.2.6-.5L8.5 7H7.1l.1 1.5zM6.6 7c0-.3.2-.5.4-.5h1.5c.3 0 .5.2.5.4V7l-.1 1.5c-.1.6-.5 1-1.1 1-.6 0-1-.4-1.1-1L6.6 7z"/><path fill="#A41517" d="M6.8 7.5h2V8h-.5l-.5 1-.5-1h-.5v-.5zM5.3 6h1v3.5h-1V6zm4 0h1v3.5h-1V6zm-2.5-.5c0-.3.2-.5.5-.5h1c.3 0 .5.2.5.5v.2c0 .2-.1.3-.3.3H7c-.1 0-.2-.1-.2-.2v-.3z"/></> },
  it: { viewBox: '0 0 513 342', body: <><path fill="#F4F5F0" d="M342 0H0v341.3h512V0z"/><path fill="#008C45" d="M0 0h171v342H0z"/><path fill="#CD212A" d="M342 0h171v342H342z"/></> },
  pt: { viewBox: '0 0 513 342', body: <><path fill="red" d="M0 0h513v342H0z"/><path fill="#060" d="M197 0v342H0V0z"/><circle fill="#FF0" cx="197.1" cy="171" r="64"/><path fill="red" d="M161.1 139v40c0 19.9 16.1 36 36 36s36-16.1 36-36v-40h-72z"/><path fill="#FFF" d="M197.1 191c-6.6 0-12-5.4-12-12v-16h24v16c0 6.6-5.3 12-12 12z"/></> },
};

export type FlagCode = keyof typeof FLAGS;

/** A small rounded country flag. */
export function Flag({ code, className }: { code: FlagCode; className?: string }) {
  const flag = FLAGS[code];
  return (
    <svg viewBox={flag.viewBox} className={cn('h-4 w-6 shrink-0 rounded-[3px]', className)} aria-hidden>
      {flag.body}
    </svg>
  );
}
