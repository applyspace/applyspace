import type { Locale } from '@/site/lib/i18n';

/** Interface strings that are not CMS content. One object per locale. */
export type Ui = {
  signIn: string;
  startFree: string;
  menu: string;
  closeMenu: string;
  skipToContent: string;
  mainNav: string;
  footerNav: string;
  perMonth: string;
  free: string;
  unlimited: string;
  applications: string;
  searchProfiles: string;
  interviewTemplates: string;
  searchProfile: string;
  interviewTemplate: string;
  application: string;
  planTag: Record<'free' | 'plus' | 'max', string>;
  readMore: string;
  readingTime: (min: number) => string;
  published: string;
  updated: string;
  by: string;
  breadcrumbHome: string;
  allResources: string;
  comparePlans: string;
  noArticles: string;
  notFoundTitle: string;
  notFoundText: string;
  backHome: string;
  onThisPage: string;
  copyright: (year: number) => string;
  screenshotLabel: string;
};

const en: Ui = {
  signIn: 'Sign in',
  startFree: 'Start for free',
  menu: 'Menu',
  closeMenu: 'Close menu',
  skipToContent: 'Skip to content',
  mainNav: 'Main',
  footerNav: 'Footer',
  perMonth: '/mo',
  free: 'Free',
  unlimited: 'Unlimited',
  applications: 'applications',
  searchProfiles: 'search profiles',
  interviewTemplates: 'interview templates',
  searchProfile: 'search profile',
  interviewTemplate: 'interview template',
  application: 'application',
  planTag: { free: 'Free', plus: 'Plus', max: 'Max' },
  readMore: 'Read the guide',
  readingTime: (min) => `${min} min read`,
  published: 'Published',
  updated: 'Updated',
  by: 'By',
  breadcrumbHome: 'Home',
  allResources: 'All resources',
  comparePlans: 'Compare plans',
  noArticles: 'No guides yet.',
  notFoundTitle: 'Page not found',
  notFoundText: 'The page you are looking for does not exist or has moved.',
  backHome: 'Back to home',
  onThisPage: 'On this page',
  copyright: (year) => `© ${year} applyspace`,
  screenshotLabel: 'Screenshot placeholder',
};

export const ui: Record<Locale, Ui> = { en };
