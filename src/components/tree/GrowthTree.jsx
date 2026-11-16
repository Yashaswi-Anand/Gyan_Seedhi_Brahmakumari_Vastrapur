import { useLang } from '@/context/LanguageContext';
import { daysInMonth } from '@/services/stats';

const GOLD = '#E3B25A';

/* Leaves laid out on a sunflower (golden-angle) spiral, one layout per leaf count (28–31). */
const LAYOUTS = new Map();
function layout(count) {
  if (!LAYOUTS.has(count)) {
    LAYOUTS.set(
      count,
      Array.from({ length: count }, (_, i) => {
        const r = Math.sqrt((i + 0.5) / count);
        const a = i * 2.39996;
        return {
          x: +(100 + 72 * r * Math.cos(a)).toFixed(1),
          y: +(74 + 52 * r * Math.sin(a)).toFixed(1),
          rot: Math.round((a * 57.3) % 180),
        };
      }),
    );
  }
  return LAYOUTS.get(count);
}

const FRUITS = [[56, 52], [146, 54], [100, 18], [80, 104], [124, 100]];

/**
 * Growing tree: one leaf for every day of the month (28, 29, 30 or 31), coloured in for each
 * day practised. The tree starts again on the 1st of every month.
 * @param leaves  days practised this month
 * @param total   leaves on the tree (days in the month)
 * @param fresh   index of a newly added leaf to highlight (-1 for none)
 */
export default function GrowthTree({ leaves, total = daysInMonth(), fresh = -1 }) {
  const { t } = useLang();
  const lit = Math.min(leaves, total);
  const small = total > 28; // a little smaller so 29–31 leaves don't crowd
  return (
    <svg viewBox="0 0 200 200" className="tree" role="img" aria-label={t(`आपका वृक्ष: ${lit} / ${total} पत्ते`)}>
      <ellipse cx="100" cy="193" rx="46" ry="5" fill="#F8E3E4" />
      <g stroke="#7A4A52" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M100 190V118" />
        <path d="M100 152L74 126" />
        <path d="M100 142L128 114" />
      </g>
      {layout(total).map((L, i) => {
        const isFresh = i === fresh;
        const fill = isFresh ? GOLD : i < lit ? (i % 3 ? '#C2455A' : '#E9A8B0') : '#F8E3E4';
        return (
          <ellipse
            key={i}
            cx={L.x}
            cy={L.y}
            rx={small ? 7.6 : 8}
            ry={small ? 4.6 : 4.8}
            transform={`rotate(${L.rot} ${L.x} ${L.y})`}
            fill={fill}
            className={isFresh ? 'fresh' : undefined}
          />
        );
      })}
      {lit >= total && FRUITS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill={GOLD} />)}
    </svg>
  );
}
