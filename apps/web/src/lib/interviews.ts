/**
 * Interview-specific readers. For the transition period these forward to
 * `lib/applications.ts` so existing consumers of `readInterviews` /
 * `readInterview` from that module keep working; new code should import
 * from here.
 */
export { readInterviews, readInterview } from '@/lib/applications';
