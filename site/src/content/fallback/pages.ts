import type { PageContent, PageSlug } from '../types';

export const pages: Record<PageSlug, PageContent> = {
  home: {
    slug: 'home',
    seo: {
      title: 'applyspace: your job search, finally in one space',
      description: 'Find the right offers, track your applications and prepare your interviews, all in one space. Free to start.',
    },
    heading: 'Your job search, finally in one space',
    intro: 'Find the right offers, track your applications and prepare your interviews.',
    ctas: [
      { label: 'Start for free', href: '/login', kind: 'app' },
      { label: 'See the product', href: '/product', kind: 'internal' },
    ],
    sections: [
      {
        type: 'cards',
        title: 'Three jobs, one space',
        items: [
          { title: 'Find the right offers', text: 'Search several job boards from one space with search profiles that follow your criteria.', href: '/product#offers-search', icon: 'search' },
          { title: 'Track your applications', text: 'Board, table, timeline or map: the same applications, the view you need.', href: '/product#applications-board', icon: 'board' },
          { title: 'Prepare your interviews', text: 'Keep every interview, date and note next to its application.', href: '/product#interview-tracking', icon: 'interview' },
        ],
      },
      {
        type: 'steps',
        title: 'How it works',
        items: [
          { title: 'Import your resume', text: 'applyspace fills your profile from a PDF or DOCX. You review everything before it is saved.' },
          { title: 'Set your search', text: 'Job titles, places, contracts, salary: describe what you want once.' },
          { title: 'Apply and follow up', text: 'Save applications, move them across statuses and keep your interviews in order.' },
        ],
      },
      {
        type: 'text',
        title: 'Your data stays yours',
        tone: 'tinted',
        body: 'Your data is stored in the cloud and scoped to your account. You choose what to import. AI features run on your own AI accounts, so you stay in control of the cost and of your documents.',
      },
      {
        type: 'plans',
        title: 'Start free, upgrade when you need more',
        variant: 'compact',
      },
      {
        type: 'cta',
        title: 'Bring your search into one space',
        text: 'Free to start. No card needed.',
        cta: { label: 'Start for free', href: '/login', kind: 'app' },
      },
    ],
  },
  product: {
    slug: 'product',
    seo: {
      title: 'Product: search, track and prepare in one app',
      description: 'Job offers search, an applications hub with board, table, timeline and map, interview tracking and a resume-powered profile.',
    },
    heading: 'Everything for your job search, in one app',
    intro: 'From the first offer to the final interview, every space works on the same data.',
    sections: [
      { type: 'features' },
      {
        type: 'cta',
        title: 'See it with your own search',
        text: 'Free to start. Import your resume and set up in minutes.',
        cta: { label: 'Start for free', href: '/login', kind: 'app' },
      },
    ],
  },
  pricing: {
    slug: 'pricing',
    seo: {
      title: 'Pricing: Free, Plus and Max',
      description: 'Start free with 15 applications. Plus raises the cap to 99 and Max has no limits.',
    },
    heading: 'Start free, upgrade when you need more',
    intro: 'Pick the room you need for your search. Change plan at any time.',
    sections: [
      {
        type: 'plans',
        variant: 'full',
      },
      {
        type: 'faq',
        title: 'Frequently asked questions',
        items: [
          { question: 'Is applyspace free?', answer: 'Yes. The Free plan includes application tracking, interview preparation and the core tools, with a cap of 15 applications, one search profile and one interview template.' },
          { question: 'What counts as an application?', answer: 'Every application you save counts toward your cap. Free allows 15, Plus 99 and Max has no limit.' },
          { question: 'Can I change plan later?', answer: 'Yes. You can upgrade when you need more room and return to Free at any time.' },
          { question: 'What happens to my data if I go back to Free?', answer: 'Your data is kept. You return to the Free possibilities, which means a lower cap and fewer search profiles.' },
          { question: 'Does applyspace pay for AI?', answer: 'No. AI features run on your own AI accounts (Claude, OpenAI or Gemini), so you stay in control of the cost and of your documents.' },
          { question: 'Where is my data stored?', answer: 'Everything is stored in the cloud, in a hosted database with per-user access rules, so you find your search on any device.' },
        ],
      },
      {
        type: 'cta',
        title: 'Start on the Free plan',
        text: 'No card needed.',
        cta: { label: 'Start for free', href: '/login', kind: 'app' },
      },
    ],
  },
  resources: {
    slug: 'resources',
    seo: {
      title: 'Resources: guides for a calmer job search',
      description: 'Practical guides on searching, tracking applications and preparing interviews.',
    },
    heading: 'Resources',
    intro: 'Practical guides on searching, tracking and interviewing.',
    sections: [],
  },
};
