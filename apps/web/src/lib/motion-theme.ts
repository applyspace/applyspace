/**
 * Apply motion theme: short, damped springs, no bounce. Same shape as Motion UI's defineTheme,
 * so it can move to `motion.theme.ts` as is when Motion+ is adopted.
 */
export const motionTheme = {
  transitions: {
    /** Controls: toggle pills, buttons. */
    ui: { type: 'spring', stiffness: 300, damping: 30 },
    /** Larger surfaces: step changes, plan cards. */
    gentle: { type: 'spring', stiffness: 120, damping: 20 },
  },
  stagger: { base: 0.06 },
  travel: { enter: 16, section: 32 },
  inView: { amount: 0.35, once: true },
  reducedMotion: 'calm',
} as const;
