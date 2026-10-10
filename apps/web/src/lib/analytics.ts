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
  setPersonProperties(properties: Record<string, unknown>): unknown;
  reset(): unknown;
  register(properties: Record<string, unknown>): unknown;
  opt_in_capturing(): unknown;
  opt_out_capturing(): unknown;
  get_explicit_consent_status(): ConsentStatus;
}

/** `pending` = the user has not chosen yet (nothing is captured); the banner shows. */
export type ConsentStatus = 'granted' | 'denied' | 'pending';

/** The id is the distinct id; the email is attached as a person property (opt-in only). Name is never sent. */
export interface AnalyticsUser {
  id: string;
  email?: string | null;
}

export function createAnalytics(client: AnalyticsClient, platform: () => AppPlatform) {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const status = (): ConsentStatus => {
    try {
      return client.get_explicit_consent_status();
    } catch {
      return 'denied'; // PostHog not initialised (no token configured): capture nothing, no prompt
    }
  };
  const granted = () => status() === 'granted';
  let plan: string | undefined;

  /** Super property on every event: lets dashboards split web from desktop. */
  const registerPlatform = () => {
    if (granted()) client.register({ app_platform: platform() });
  };

  return {
    /** Analytics is opt-in: nothing is captured until the user accepts. */
    capture<E extends AnalyticsEventName>(...args: CaptureArgs<E>) {
      if (!granted()) return;
      const [event, properties] = args as [E, Record<string, unknown>?];
      client.capture(event, properties);
    },
    /**
     * Distinct id is always the Supabase user id, on web and desktop. The
     * email is sent as a person property (never the name), and only after consent.
     */
    identify(user: AnalyticsUser, context: { locale?: string } = {}) {
      if (!granted()) return;
      registerPlatform();
      client.identify(user.id, {
        app_platform: platform(),
        locale: context.locale,
        plan,
        ...(user.email ? { email: user.email } : {}),
      });
    },
    /** Account plan (`free`/`plus`/`max`), attached to events and the person once known. */
    setPlan(next: string | null | undefined) {
      plan = next ?? undefined;
      if (!plan || !granted()) return;
      client.register({ plan });
      client.setPersonProperties({ plan });
    },
    /**
     * Sign-out or account switch: new anonymous id, no merge with the previous user.
     * posthog-js clears the consent choice on reset(), so it is restored right after.
     */
    reset() {
      const before = status();
      client.reset();
      if (before === 'granted') client.opt_in_capturing();
      else if (before === 'denied') client.opt_out_capturing();
      registerPlatform();
    },
    registerPlatform,
    consentStatus: status,
    hasConsent: granted,
    /** Subscribe to consent changes (banner and Settings switch). Returns the unsubscribe. */
    subscribeConsent(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Accept = opt in. Decline or switch off = reset first (drops the identity), then opt out. */
    setConsent(accepted: boolean) {
      if (accepted) {
        client.opt_in_capturing();
      } else {
        client.reset();
        client.opt_out_capturing();
      }
      notify();
    },
  };
}

function detectPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';
  return (window as unknown as { apply?: unknown }).apply ? 'desktop' : 'web';
}

export const analytics = createAnalytics(posthog, detectPlatform);
