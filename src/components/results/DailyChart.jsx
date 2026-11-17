import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { chartPts, murliPts } from "@/services/stats";
import { formatShort, parseDateKey } from "@/utils/date";

/* Murli = rose, Chart = gold: the same colours as the points cards and score bars.
   (Validated as a pair for colour-blind separation; gold is light on white, so the
   selected day's numbers are always written out and a table is available.) */
const MURLI = "#C2455A";
const CHART = "#C9973B";

const H = 170; // plot height
const TOP = 12; // room above the tallest bar
const BOTTOM = 34; // x labels
const YW = 28; // fixed y-label column
const LEFT = 4; // left padding inside the scrolling plot
const RIGHT = 10;
const MIN_STEP = 38; // px per day before the chart scrolls sideways
const BAR = 12;
const GAP = 2;

/** Bar with 4px rounded top corners, sitting on the baseline. */
function barPath(x, top, w, base) {
  const h = base - top;
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

/**
 * Results tab: Murli and Chart points of every day as two bars side by side.
 * Tap a day to see its numbers.
 * @param plays plays of the selected period (any order)
 */
export default function DailyChart({ plays }) {
  const { t, cal, lang } = useLang();
  const days = plays.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const boxRef = useRef(null);
  const [width, setWidth] = useState(340);
  const [sel, setSel] = useState(days.length - 1);

  // fit the container; wider periods scroll sideways
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 340));
    ro.observe(el);
    setWidth(el.clientWidth || 340);
    return () => ro.disconnect();
  }, []);

  // a new period: select the latest day and scroll to it
  const key = days.map((p) => p.date).join();
  useEffect(() => {
    setSel(days.length - 1);
    const el = boxRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!days.length) return null;

  const max = Math.max(
    100,
    ...days.map((p) =>
      Math.max(p.mMax ?? 100, p.cMax ?? 100, murliPts(p), chartPts(p)),
    ),
  );
  const step = Math.max(
    MIN_STEP,
    Math.floor((width - LEFT - RIGHT - 1) / days.length),
  );
  const W = LEFT + RIGHT + step * days.length;
  const base = TOP + H;
  const y = (v) => base - (Math.max(0, v) / max) * H;
  const cx = (i) => LEFT + step * i + step / 2;
  const mx = (i) => cx(i) - GAP / 2 - BAR; // murli bar left edge
  const chx = (i) => cx(i) + GAP / 2; // chart bar left edge

  const si = Math.min(sel, days.length - 1);
  const s = days[si];
  const sd = parseDateKey(s.date);

  return (
    <section className="dchart" aria-label={t("हर दिन के अंक")}>
      <div className="dchart-head">
        <h3>{t("हर दिन के अंक")}</h3>
        <div className="dchart-legend">
          <span>
            <i style={{ background: MURLI }} />
            {t("मुरली")}
          </span>
          <span>
            <i style={{ background: CHART }} />
            {t("चार्ट")}
          </span>
        </div>
      </div>

      {/* the selected day's numbers, always written out */}
      <p className="dchart-sel" aria-live="polite">
        <b>
          {cal.days[sd.getDay()]}, {sd.getDate()} {cal.months[sd.getMonth()]}
        </b>
        <span>
          <i style={{ background: MURLI }} />
          {t("मुरली")} {murliPts(s)}/{s.mMax ?? 100}
        </span>
        <span>
          <i style={{ background: CHART }} />
          {t("चार्ट")} {chartPts(s)}/{s.cMax ?? 100}
        </span>
      </p>

      <div className="dchart-plot">
        {/* y labels stay put while the days scroll */}
        <svg
          className="dchart-y"
          width={YW}
          height={TOP + H + BOTTOM}
          aria-hidden="true"
        >
          {[0, max / 2, max].map((v) => (
            <text
              key={v}
              x={YW - 4}
              y={y(v) + 4}
              textAnchor="end"
              className="ytick"
            >
              {Math.round(v)}
            </text>
          ))}
        </svg>
        <div className="dchart-box" ref={boxRef}>
          <svg
            width={W}
            height={TOP + H + BOTTOM}
            viewBox={`0 0 ${W} ${TOP + H + BOTTOM}`}
            role="img"
            aria-hidden="true"
          >
            {/* recessive grid: 0, half, max */}
            {[0, max / 2, max].map((v) => (
              <line
                key={v}
                x1={0}
                x2={W}
                y1={y(v)}
                y2={y(v)}
                className={v ? "grid" : "axis"}
              />
            ))}

            {/* selected day highlight */}
            <rect
              x={LEFT + step * si + 2}
              y={TOP - 8}
              width={step - 4}
              height={H + 8}
              rx="8"
              className="selbg"
            />

            {/* bars: Murli and Chart side by side, a 2px gap between them */}
            {days.map((p, i) => (
              <g key={p.date}>
                <path
                  d={barPath(mx(i), y(murliPts(p)), BAR, base)}
                  fill={MURLI}
                  className="bar"
                />
                <path
                  d={barPath(chx(i), y(chartPts(p)), BAR, base)}
                  fill={CHART}
                  className="bar"
                />
              </g>
            ))}

            {/* x labels */}
            {days.map((p, i) => {
              const d = parseDateKey(p.date);
              return (
                <g key={`x${p.date}`} className={i === si ? "xsel" : undefined}>
                  <text
                    x={cx(i)}
                    y={base + 15}
                    textAnchor="middle"
                    className="xday"
                  >
                    {d.getDate()}
                  </text>
                  <text
                    x={cx(i)}
                    y={base + 28}
                    textAnchor="middle"
                    className="xmon"
                  >
                    {formatShort(p.date, cal, lang)
                      .split(" ")
                      .slice(1)
                      .join(" ")}
                  </text>
                </g>
              );
            })}

            {/* tap / hover targets: the whole day column, bigger than the marks */}
            {days.map((p, i) => (
              <rect
                key={`h${p.date}`}
                x={LEFT + step * i}
                y={0}
                width={step}
                height={TOP + H + BOTTOM}
                className="hit"
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
              />
            ))}
          </svg>
        </div>
      </div>

      <details className="dchart-table">
        <summary>{t("अंक तालिका")}</summary>
        <table>
          <thead>
            <tr>
              <th>{t("तारीख")}</th>
              <th>{t("मुरली")}</th>
              <th>{t("चार्ट")}</th>
            </tr>
          </thead>
          <tbody>
            {days
              .slice()
              .reverse()
              .map((p) => (
                <tr key={p.date}>
                  <td>{formatShort(p.date, cal, lang)}</td>
                  <td>
                    {murliPts(p)}/{p.mMax ?? 100}
                  </td>
                  <td>
                    {chartPts(p)}/{p.cMax ?? 100}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
