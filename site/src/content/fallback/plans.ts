import type { PricingPlan } from '../types';

/** Caps match the database: supabase/migrations (enforce_application_cap, enforce_plan_limits). Prices are planned, not final. */
const core = [
  'Application tracking',
  'Interview preparation',
  'Resume rewrite',
  'Fit message generation',
  'Job alerts',
  'Application autofill',
  'AI integrations (Claude, OpenAI, Gemini)',
];

export const plans: PricingPlan[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Everything you need to start your search.',
    priceMonthly: 0,
    currency: 'EUR',
    priceVisible: true,
    comingSoon: false,
    caps: { applications: 15, searchProfiles: 1, interviewTemplates: 1 },
    features: core,
    ctaLabel: 'Start for free',
    order: 1,
  },
  {
    key: 'plus',
    name: 'Plus',
    tagline: 'More room, sharper search.',
    priceMonthly: 0.99,
    currency: 'EUR',
    priceVisible: true,
    comingSoon: true,
    caps: { applications: 99, searchProfiles: 3, interviewTemplates: 3 },
    intro: 'Everything in Free, plus…',
    features: ['Advanced search filters', 'Company insights', 'Network connections', 'Reply tracking', 'Interview calendar sync'],
    ctaLabel: 'Start for free',
    order: 2,
  },
  {
    key: 'max',
    name: 'Max',
    tagline: 'No limits on anything.',
    priceMonthly: 3.99,
    currency: 'EUR',
    priceVisible: true,
    comingSoon: true,
    caps: { applications: null, searchProfiles: null, interviewTemplates: null },
    intro: 'Everything in Plus, plus…',
    features: ['AI interview simulation', 'Shareable progress page', 'Custom job offers source'],
    ctaLabel: 'Start for free',
    order: 3,
  },
];
