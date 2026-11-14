import { useLang } from '@/context/LanguageContext';

const LEAF_COUNT = 28;
const GOLD = '#E3B25A';

/* Leaves laid out on a sunflower (golden-angle) spiral. */
const LEAVES = Array.from({ length: LEAF_COUNT }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / LEAF_COUNT);
  const a = i * 2.39996;
  return {
    x: +(100 + 72 * r * Math.cos(a)).toFixed(1),
    y: +(74 + 52 * r * Math.sin(a)).toFixed(1),
    rot: Math.round((a * 57.3) % 180),
  };
});

const FRUITS = [[56, 52], [146, 54], [100, 18], [80, 104], [124, 100]];

/**
 * Growing tree: one leaf for every day of practice.
 * @param leaves  number of practice days
 * @param fresh   index of a newly added leaf to highlight (-1 for none)
 */
export default function GrowthTree({ leaves, fresh = -1 }) {
  const { t } = useLang();
  const lit = Math.min(leaves, LEAF_COUNT);
  return (
    <svg viewBox="0 0 200 200" className="tree" role="img" aria-label={t(`आपका वृक्ष: ${leaves} पत्ते`)}>
      <ellipse cx="100" cy="193" rx="46" ry="5" fill="#F8E3E4" />
      <g stroke="#7A4A52" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M100 190V118" />
        <path d="M100 152L74 126" />
        <path d="M100 142L128 114" />
      </g>
      {LEAVES.map((L, i) => {
        const isFresh = i === fresh;
        const fill = isFresh ? GOLD : i < lit ? (i % 3 ? '#C2455A' : '#E9A8B0') : '#F8E3E4';
        return (
          <ellipse
            key={i}
            cx={L.x}
            cy={L.y}
            rx="8"
            ry="4.8"
            transform={`rotate(${L.rot} ${L.x} ${L.y})`}
            fill={fill}
            className={isFresh ? 'fresh' : undefined}
          />
        );
      })}
      {leaves >= LEAF_COUNT && FRUITS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill={GOLD} />)}
    </svg>
  );
}
