import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// The public demo (demo.applyspace.app) never loads PostHog: nothing to opt out of, nothing sent.
const isDemoHost = window.location.hostname.toLowerCase().startsWith('demo.');

if (isDemoHost) {
  // Analytics disabled on the demo host.
} else if (!projectToken || !host) {
  if (process.env.NODE_ENV === 'development') {
    const missingVariable = projectToken
      ? 'NEXT_PUBLIC_POSTHOG_HOST'
      : 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN';

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-05-30',
    // Opt-in: nothing is captured (events, pageviews, exceptions, identify) until the user accepts.
    opt_out_capturing_by_default: true,
    capture_exceptions: true,
    tracing_headers: [window.location.hostname],
    debug: process.env.NODE_ENV === 'development',
  });
}
