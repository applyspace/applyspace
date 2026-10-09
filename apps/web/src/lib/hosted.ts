/**
 * Hosted build (Vercel) or `APPLY_DEMO=1`: signed-out visitors browse the demo
 * content from `lib/demo.ts`, with no database behind it. Desktop is not hosted.
 */
export const IS_DEMO = process.env.APPLY_DEMO === '1' || Boolean(process.env.VERCEL);
