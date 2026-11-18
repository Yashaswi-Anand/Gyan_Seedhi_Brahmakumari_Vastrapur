import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/utils/helpers';

/* Rose, gold, light rose, light gold, leaf green: the app's own colours. */
const COLORS = ['#C2455A', '#C9973B', '#E9A8B0', '#E3B25A', '#7FB77E'];
const COUNT = 40;
const SHOW_MS = 4500;

function makePieces() {
  return Array.from({ length: COUNT }, (_, i) => {
    const w = 6 + Math.random() * 5;
    const round = i % 4 === 0;
    return {
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      rot: Math.round(Math.random() * 360),
      drift: Math.round((Math.random() * 2 - 1) * 70),
      w,
      h: round ? w : w * 0.45,
      round,
    };
  });
}

/** Confetti that falls once over the screen when the result opens (skipped with reduced motion). */
export default function Celebration() {
  const [pieces, setPieces] = useState(() => (prefersReducedMotion() ? null : makePieces()));

  useEffect(() => {
    if (!pieces) return undefined;
    const id = setTimeout(() => setPieces(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [pieces]);

  if (!pieces) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
