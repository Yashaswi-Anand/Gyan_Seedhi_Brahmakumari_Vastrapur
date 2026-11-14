/* Question paper PDF (no answers).
   Each A4 page is drawn on a canvas so the browser shapes Hindi / Gujarati text correctly,
   then the JPEG pages are wrapped in a minimal PDF file. No PDF library needed. */
import { CENTRE_NAME, POINTS_PER_QUESTION, QUIZ_DATE } from '@/constants/config';
import { buildQuestions } from '@/data/questions';
import { OPTION_LETTERS } from '@/i18n/calendar';
import { translate } from '@/i18n/translate';
import { todayKey } from '@/utils/date';

function fontFamily(lang) {
  if (lang === 'gu') return '"Noto Sans Gujarati","Noto Sans Devanagari",sans-serif';
  if (lang === 'en') return 'system-ui,"Segoe UI",Roboto,"Noto Sans",sans-serif';
  return '"Noto Sans Devanagari",sans-serif';
}

function drawPages(lang) {
  const qs = buildQuestions();
  const W = 1240;
  const H = 1754;
  const M = 90;
  const pages = [];
  const FF = fontFamily(lang);
  const LT = OPTION_LETTERS[lang];
  const T = (s) => translate(lang, String(s));
  let ctx;
  let y;

  const newPage = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';
    pages.push(c);
    y = M;
  };
  const font = (sz, wt) => (ctx.font = `${wt || 400} ${sz}px ${FF}`);
  const wrap = (t, sz, wt, maxw) => {
    font(sz, wt);
    const out = [];
    let cur = '';
    String(t)
      .split(' ')
      .forEach((w) => {
        const tt = cur ? cur + ' ' + w : w;
        if (cur && ctx.measureText(tt).width > maxw) {
          out.push(cur);
          cur = w;
        } else cur = tt;
      });
    if (cur) out.push(cur);
    return out;
  };
  const draw = (ls, sz, wt, x, col, lh) => {
    font(sz, wt);
    ctx.fillStyle = col;
    ls.forEach((l) => {
      ctx.fillText(l, x, y + sz);
      y += lh;
    });
  };
  const fit = (h) => {
    if (y + h > H - 110) newPage();
  };

  newPage();
  draw([T('ज्ञान सीढ़ी') + ' · ' + T('आज का प्रश्न-पत्र')], 46, 700, M, '#7A2438', 64);
  draw([T('आज की मुरली · ' + QUIZ_DATE)], 26, 400, M, '#835C69', 44);
  draw([T('नाम') + ': ______________________      ' + T('दिनांक') + ': ______________'], 26, 400, M, '#4A2231', 50);
  ctx.fillStyle = '#F3D5D6';
  ctx.fillRect(M, y, W - 2 * M, 3);
  y += 30;

  const IN = M + 56;
  const TW = W - M - IN;
  const section = (t, col) => {
    fit(140);
    ctx.fillStyle = col;
    ctx.fillRect(M, y + 6, 8, 38);
    draw([T(t)], 30, 700, M + 24, col, 58);
    y += 6;
  };

  qs.forEach((q, k) => {
    if (k === 0) section('मुरली प्रश्न (1–5) · हर प्रश्न 20 अंक', '#C2455A');
    if (q.type === 'self' && qs[k - 1].type !== 'self') {
      y += 14;
      section('चार्ट प्रश्न (6–10) · हर प्रश्न 20 अंक', '#A87A22');
    }
    const sub = T(q.type === 'self' ? q.ctxChip : q.tag);
    const ql = wrap(T(q.q), 29, 600, TW);
    const ol = [];
    if (q.type === 'self') ol.push([wrap('________ / ' + POINTS_PER_QUESTION, 27, 400, TW), '']);
    else q.opts.forEach((o, i) => ol.push([wrap(T(o), 27, 400, TW - 58), LT[i] + ')']));
    const h = 36 + ql.length * 44 + 14 + ol.reduce((s, x) => s + x[0].length * 40 + 10, 0) + 30;
    fit(h);
    draw([sub], 22, 600, IN, '#835C69', 36);
    font(29, 700);
    ctx.fillStyle = '#7A2438';
    ctx.fillText(k + 1 + '.', M, y + 29);
    draw(ql, 29, 600, IN, '#4A2231', 44);
    y += 14;
    ol.forEach(([lines, letter]) => {
      if (letter) {
        font(27, 700);
        ctx.fillStyle = '#C2455A';
        ctx.fillText(letter, IN, y + 27);
        draw(lines, 27, 400, IN + 58, '#4A2231', 40);
      } else draw(lines, 27, 400, IN, '#4A2231', 40);
      y += 10;
    });
    y += 30;
  });

  pages.forEach((p, i) => {
    const g = p.getContext('2d');
    g.fillStyle = '#F3D5D6';
    g.fillRect(M, H - 104, W - 2 * M, 2);
    g.font = `700 24px ${FF}`;
    g.fillStyle = '#7A2438';
    g.fillText(CENTRE_NAME, (W - g.measureText(CENTRE_NAME).width) / 2, H - 66);
    g.font = `400 22px ${FF}`;
    g.fillStyle = '#835C69';
    g.fillText(T('ज्ञान सीढ़ी') + ' · ' + T('आज की मुरली · ' + QUIZ_DATE), M, H - 30);
    const r = T('पृष्ठ ') + (i + 1) + ' / ' + pages.length;
    g.fillText(r, W - M - g.measureText(r).width, H - 30);
  });
  return pages;
}

function toPdfBlob(pages) {
  const parts = [];
  const offs = [];
  const n = pages.length;
  const W = 595.28;
  const H = 841.89;
  let off = 0;
  const add = (x) => {
    if (typeof x === 'string') {
      const b = new Uint8Array(x.length);
      for (let i = 0; i < x.length; i++) b[i] = x.charCodeAt(i) & 255;
      x = b;
    }
    parts.push(x);
    off += x.length;
  };
  const obj = (num, body) => {
    offs[num] = off;
    add(`${num} 0 obj\n${body}\nendobj\n`);
  };

  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] /Count ${n} >>`);
  pages.forEach((cv, i) => {
    const pn = 3 + 3 * i;
    const cn = pn + 1;
    const im = pn + 2;
    const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    const bin = atob(cv.toDataURL('image/jpeg', 0.88).split(',')[1]);
    const jp = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) jp[j] = bin.charCodeAt(j);
    obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R >>`);
    obj(cn, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    offs[im] = off;
    add(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jp.length} >>\nstream\n`);
    add(jp);
    add('\nendstream\nendobj\n');
  });
  const tot = 3 + 3 * n;
  const xr = off;
  let x = `xref\n0 ${tot}\n0000000000 65535 f \n`;
  for (let k = 1; k < tot; k++) x += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \n';
  add(`${x}trailer\n<< /Size ${tot} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

function loadFonts() {
  const f = document.fonts;
  if (!f || !f.load) return Promise.resolve();
  return Promise.all([
    f.load('400 30px "Noto Sans Devanagari"', 'अ'),
    f.load('700 30px "Noto Sans Devanagari"', 'अ'),
    f.load('400 30px "Noto Sans Gujarati"', 'અ'),
    f.load('700 30px "Noto Sans Gujarati"', 'અ'),
  ]).catch(() => {});
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Builds today's question paper in the given language and downloads it. */
export async function downloadQuestionPaper(lang) {
  await loadFonts();
  const blob = toPdfBlob(drawPages(lang));
  saveBlob(blob, `gyan-seedhi-questions-${todayKey()}.pdf`);
}
