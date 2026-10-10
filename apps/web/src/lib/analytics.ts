import posthog from 'posthog-js';

/**
 * The single entry point to product analytics. Every event is declared in
 * `AnalyticsEvents` (name -> typed properties); never call `posthog.capture`
 * directly. The taxonomy is documented in docs/analytics-taxonomy.md.
 */

export type Plan = 'free' | 'plus' | 'max';
export type AppPlatform = 'web' | 'desktop';

export interface AnalyticsEvents {
  // Auth
  sign_in_started: { provider: string };
  sign_out_completed: undefined;
  // Onboarding funnel
  onboarding_step_viewed: { step: string; step_index: number };
  onboarding_step_completed: { step: string; step_index: number; method: 'next' | 'skip' };
  onboarding_plan_selected: { plan: Plan };
  onboarding_completed: {
    completion_method: 'plan_selected' | 'completed' | 'skipped';
    plan?: Plan;
  };
  onboarding_save_failed: { reason: string };
  onboarding_import_save_failed: { reason: string };
  // Offers and searches
  search_created: {
    has_location: boolean;
    contract_types_count: number;
    experience_levels_count: number;
  };
  search_run_completed: { offers_found: number; offers_inserted: number; offers_updated: number };
  offer_declined: undefined;
  offer_application_started: undefined;
  // Profile and documents
  cv_uploaded: { file_format: 'pdf' | 'docx'; size_bucket: 'under_1mb' | '1mb_to_10mb' };
  primary_cv_selected: undefined;
  fit_message_saved: undefined;
  profile_section_saved: { section: string };
  profile_section_removed: { section: string };
  linkedin_profile_sync_completed: undefined;
  // Settings
  settings_saved: { section: 'profile' | 'search_criteria' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

type CaptureArgs<E extends AnalyticsEventName> = AnalyticsEvents[E] extends undefined
  ? [event: E]
  : [event: E, properties: AnalyticsEvents[E]];

/** The subset of posthog-js used here, so tests can inject a fake. */
export interface AnalyticsClient {
  capture(event: string, properties?: Record<string, unknown>): unknown;
  identify(distinctId: string, properties?: Record<string, unknown>): unknown;
  reset(): unknown;
  register(properties: Record<string, unknown>): unknown;
  opt_in_capturing(): unknown;
  opt_out_capturing(): unknown;
  has_opted_out_capturing(): boolean;
}

export interface AnalyticsUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export function createAnalytics(client: AnalyticsClient, platform: () => AppPlatform) {
  /** Super property on every event: lets dashboards split web from desktop. */
  const registerPlatform = () => client.register({ app_platform: platform() });

  return {
    capture<E extends AnalyticsEventName>(...args: CaptureArgs<E>) {
      const [event, properties] = args as [E, Record<string, unknown>?];
      client.capture(event, properties);
    },
    /** Distinct id is always the Supabase user id, on web and desktop. */
    identify(user: AnalyticsUser) {
      registerPlatform();
      client.identify(user.id, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });
    },
    /** Sign-out or account switch: new anonymous id, no merge with the previous user. */
    reset() {
      client.reset();
      registerPlatform();
    },
    registerPlatform,
    /** Consent is stored by posthog-js itself (survives reset); opting out stops all capture. */
    hasConsent: () => !client.has_opted_out_capturing(),
    setConsent(granted: boolean) {
      if (granted) client.opt_in_capturing();
      else client.opt_out_capturing();
    },
  };
}

function detectPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';
  return (window as unknown as { apply?: unknown }).apply ? 'desktop' : 'web';
}

export const analytics = createAnalytics(posthog, detectPlatform);
