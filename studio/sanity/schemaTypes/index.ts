import { feature, page, pricingPlan, resource, siteSettings } from './documents';
import { cta, navLink, productShot, textLink } from './shared';
import {
  cardsSection, ctaSection, factsSection, faqSection, featuresSection, flowSection, plansSection, scatterSection,
  spotlightSection, stepsSection, textSection, trustSection, viewsSection,
} from './sections';

export const schemaTypes = [
  siteSettings, page, feature, pricingPlan, resource,
  cta, navLink, productShot, textLink,
  cardsSection, stepsSection, textSection, faqSection, plansSection, featuresSection, ctaSection,
  scatterSection, spotlightSection, viewsSection, flowSection, trustSection, factsSection,
];
