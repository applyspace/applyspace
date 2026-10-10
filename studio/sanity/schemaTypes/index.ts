import { feature, page, pricingPlan, resource, siteSettings } from './documents';
import { cta, navLink } from './shared';
import { cardsSection, ctaSection, faqSection, featuresSection, plansSection, stepsSection, textSection } from './sections';

export const schemaTypes = [
  siteSettings, page, feature, pricingPlan, resource,
  cta, navLink, cardsSection, stepsSection, textSection, faqSection, plansSection, featuresSection, ctaSection,
];
