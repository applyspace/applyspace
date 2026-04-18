import type { Source } from '@/types/platforms';

export const SOURCE_META: Record<
  Source,
  { label: string; badgeCls: string; dotCls: string; cookieKey: string }
> = {
  linkedin: {
    label: 'LinkedIn',
    badgeCls: 'bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90',
    dotCls: 'bg-[#0A66C2]',
    cookieKey: 'linkedin',
  },
  wttj: {
    label: 'Welcome to the Jungle',
    badgeCls: 'bg-[#FF4C4C] text-white hover:bg-[#FF4C4C]/90',
    dotCls: 'bg-[#FF4C4C]',
    cookieKey: 'wttj',
  },
  hellowork: {
    label: 'HelloWork',
    badgeCls: 'bg-orange-500 text-white hover:bg-orange-500/90',
    dotCls: 'bg-orange-500',
    cookieKey: 'hellowork',
  },
  jobsthatmakesense: {
    label: 'Jobs that Make Sense',
    badgeCls: 'bg-green-500 text-white hover:bg-green-500/90',
    dotCls: 'bg-green-500',
    cookieKey: 'jobsthatmakesense',
  },
};

export const ALL_SOURCES = Object.keys(SOURCE_META) as Source[];
