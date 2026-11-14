import { useLang } from '@/context/LanguageContext';
import { WISH } from '@/data/vardans';

const CX = 150;
const CY = 150;
const R = 140;

let measureCtx;
function textWidth(text, size, lang) {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  measureCtx.font = `700 ${size}px ${lang === 'gu' ? '"Noto Sans Gujarati",' : ''}"Noto Sans Devanagari",sans-serif`;
  return measureCtx.measureText(text).width || text.length * size * 0.55;
}

/** Rotation (deg) that lands segment `idx` under the pointer after five full turns. */
export function targetRotation(idx) {
  const sg = 360 / WISH.length;
  return 360 * 5 - ((idx % WISH.length) * sg + sg / 2);
}

/**
 * The vardan spin wheel.
 * @param rotation  current rotation in degrees
 * @param mini      small icon version without labels
 * @param spinning  animate the rotation change
 */
export default function VardanWheel({ rotation = 0, mini = false, spinning = false }) {
  const { lang, t } = useLang();
  const N = WISH.length;
  const sg = 360 / N;

  const segments = WISH.map((wish, i) => {
    const a0 = ((i * sg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * sg - 90) * Math.PI) / 180;
    const mid = i * sg + sg / 2;
    const x0 = CX + R * Math.cos(a0);
    const y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY + R * Math.sin(a1);
    const odd = N % 2 && i === N - 1;
    const fill = odd ? '#C9973B' : i % 2 ? '#FBE4E7' : '#C2455A';
    const textColor = i % 2 && !odd ? '#7A2438' : '#fff';

    let label = null;
    if (!mini) {
      const lb = wish.s[lang] || wish.s.hi;
      const fs = Math.max(9, Math.min(15, Math.floor((15 * 92) / textWidth(lb, 15, lang))));
      const left = mid > 180; // left-side labels are turned so they read upright
      label = (
        <text
          x={left ? CX - 82 : CX + 82}
          y={(CY + fs * 0.35).toFixed(1)}
          textAnchor="middle"
          fontSize={fs}
          fontWeight="700"
          fill={textColor}
          fontFamily="Noto Sans Devanagari,Noto Sans Gujarati,sans-serif"
          transform={`rotate(${(left ? mid + 90 : mid - 90).toFixed(2)} ${CX} ${CY})`}
        >
          {lb}
        </text>
      );
    }
    return (
      <g key={i}>
        <path
          d={`M${CX},${CY} L${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z`}
          fill={fill}
        />
        {label}
      </g>
    );
  });

  return (
    <svg viewBox="0 0 300 300" {...(mini ? { 'aria-hidden': true } : { role: 'img', 'aria-label': t('वरदान चक्र') })}>
      <circle cx="150" cy="150" r="146" fill="#fff" stroke="#F3D5D6" strokeWidth="3" />
      <g className={`wheel-g${spinning ? ' spinning' : ''}`} style={{ transform: `rotate(${rotation}deg)` }}>
        {segments}
      </g>
      <circle cx="150" cy="150" r="22" fill="#fff" stroke="#C2455A" strokeWidth="3" />
      <circle cx="150" cy="150" r="6" fill="#C2455A" />
      <polygon points="136,2 164,2 150,30" fill="#C9973B" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
