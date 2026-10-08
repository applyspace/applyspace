'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { motionTheme } from '@/lib/motion-theme';

/**
 * One character of an animated value. When it changes, the old character leaves and the new one enters,
 * upwards if the new digit is larger and downwards if it is smaller.
 */
function RollingChar({ char, index }: { char: string; index: number }) {
  const [state, setState] = useState({ char, dir: 1 });
  if (state.char !== char) {
    const next = Number(char);
    const prev = Number(state.char);
    setState({ char, dir: Number.isNaN(next) || Number.isNaN(prev) || next > prev ? 1 : -1 });
  }
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false} custom={state.dir}>
        <motion.span
          key={char}
          custom={state.dir}
          variants={{
            enter: (d: number) => ({ y: `${d * 100}%`, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (d: number) => ({ y: `${d * -100}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ ...motionTheme.transitions.ui, delay: index * 0.06 }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A value whose digits roll one by one when it changes. */
export function RollingText({ value }: { value: string }) {
  return (
    <span className="inline-flex" aria-label={value}>
      {value.split('').map((c, i) => (
        <RollingChar key={i} char={c} index={i} />
      ))}
    </span>
  );
}
