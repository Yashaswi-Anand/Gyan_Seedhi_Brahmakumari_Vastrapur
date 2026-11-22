/* Original question set (murli of 11 November 2026).
   Questions now live in Firestore and the teacher manages them in the Question/Answer tab.
   This file seeds an empty database and is the offline fallback.
   Hindi text is the source of truth. English and Gujarati come from src/i18n/locales/*.json,
   looked up by the exact Hindi string; questions the teacher adds show as typed.

   Question types:
     mcq   – pick one option; `ans` is the index of the right option
     self  – self-check "chart" question; the person enters their own marks 0–max (10 or 20)
     match – (supported by the quiz engine, not used today) `pairs: [[left, right], …]`
*/

/** Today's five murli questions (1–5). */
export const MURLI_QUESTIONS = [
  {
    type: 'mcq',
    tag: 'खाली जगह भरें',
    q: '"हर एक बच्चा शक्ल से दिखाई दे कि यह ______ और खुशकिस्मत वाली आत्मा है।"',
    opts: ['गम्भीर', 'खुशनुमा', 'शान्त'],
    ans: 1,
    hint: 'खुशी चेहरे से झलकती है।',
    exp: 'हर बच्चे की शक्ल से दिखाई दे कि यह खुशनुमा और खुशकिस्मत आत्मा है।',
  },
  {
    type: 'mcq',
    tag: 'सही उत्तर चुनें',
    q: 'सन्तुष्टमणि आत्मा माया या प्रकृति की हलचल को कैसे अनुभव करती है?',
    opts: ['जैसे एक कार्टून देख रहे हैं', 'बड़ी परीक्षा की तरह', 'डर और चिंता के साथ'],
    ans: 0,
    hint: 'सन्तुष्ट आत्मा हलचल में भी हल्की रहती है।',
    exp: 'सन्तुष्टमणि आत्मा माया या प्रकृति की हलचल को ऐसे देखती है जैसे एक कार्टून देख रहे हैं।',
  },
  {
    type: 'mcq',
    tag: 'सही उत्तर चुनें',
    q: 'एक मिनट अशरीरी ड्रिल के लिए बापदादा ने कौन-सा उदाहरण दिया?',
    opts: ['भोजन का समय', 'सुबह जल्दी उठना', 'प्यास लगने पर पानी पीने ज़रूर उठते हैं'],
    ans: 2,
    hint: 'जिस चीज़ की ज़रूरत महसूस हो, उसके लिए समय निकल ही आता है।',
    exp: 'जैसे प्यास लगने पर पानी पीने ज़रूर उठते हैं, वैसे ही एक मिनट अशरीरी बनने की ड्रिल ज़रूर करो।',
  },
  {
    type: 'mcq',
    tag: 'सही उत्तर चुनें',
    q: 'कोई आपके साथ ठीक व्यवहार न करे तो बापदादा क्या युक्ति बताते हैं?',
    opts: ['उसकी बात सबको बताओ', 'दिल में न रखो, उसके प्रति शुभ भावना और शुभ कामना रखो', 'उससे दूरी बना लो'],
    ans: 1,
    hint: 'दूसरे के व्यवहार का बोझ अपने दिल पर न लें।',
    exp: 'कोई ठीक व्यवहार न करे तो उसकी बात दिल में न रखो, उसके प्रति शुभ भावना और शुभ कामना रखो।',
  },
  {
    type: 'mcq',
    tag: 'सही या गलत',
    q: '"सन्तुष्टता की शक्ति में सर्व शक्तियां समाई हुई हैं।" क्या यह बात सही है?',
    opts: ['हाँ, सही है', 'नहीं, गलत है'],
    ans: 0,
    hint: 'सन्तुष्ट आत्मा के पास किसी शक्ति की कमी नहीं रहती।',
    exp: 'हाँ, यह सही है। सन्तुष्टता की शक्ति में सर्व शक्तियां समाई हुई हैं।',
  },
];

/** Self-check chart questions (6–10): the person enters their own marks, 0 to 20. */
export const CHART_QUESTIONS = [
  {
    t: '15 Min अमृतवेला योग',
    q: 'आज अमृतवेले के योग में 15 min तक सम्पूर्ण दिव्यता की धारणा के लिए स्वयं को साकार स्वरूप में अनुभव कराया?',
  },
  {
    t: 'पाँचों ट्रैफिक कंट्रोल के समय योग',
    q: 'पाँचों ट्रैफिक कंट्रोल के समय योग में सम्पूर्ण साक्षी दृष्टि बनकर, उपराम दृष्टि से योग किया?',
  },
  {
    t: 'हर घंटे एक मिनट योग',
    q: 'हर घंटे एक मिनट, कारोबार समेटकर साइलेंस की स्थिति में रहे?',
  },
  {
    t: 'सभी सम्बन्धों में सम्मान और स्नेह',
    q: 'आज सभी सम्बन्धों में परस्पर सम्मान और स्नेह की भावना रही?',
  },
  {
    t: 'अशांत विश्व में शान्ति के वायब्रेशन',
    q: 'वर्तमान अशांत विश्व में ऊर्जा भरकर, अपने आसपास के वातावरण में योग द्वारा शान्ति के वायब्रेशन फैलाये?',
  },
];

/** Date of the murli the questions above come from. */
export const SEED_DATE = '2026-11-15';

/**
 * The questions above in the Firestore document shape. Used to fill an empty database
 * (scripts/seed-questions.mjs) and as the offline fallback when Firestore can't be reached.
 */
export function seedQuestionDocs() {
  return [
    ...MURLI_QUESTIONS.map((q, i) => ({
      id: `seed-m${i + 1}`,
      date: SEED_DATE,
      category: 'murli',
      tag: q.tag,
      q: q.q,
      opts: q.opts,
      ans: q.ans,
      hint: q.hint,
      exp: q.exp,
      order: i + 1,
    })),
    ...CHART_QUESTIONS.map((c, i) => ({
      id: `seed-c${i + 1}`,
      date: SEED_DATE,
      category: 'chart',
      title: c.t,
      q: c.q,
      order: 100 + i,
    })),
  ];
}

/** Firestore question document → the shape the quiz engine uses. */
export function toQuizQuestion(d) {
  if (d.category === 'chart') {
    return { id: d.id, type: 'self', tag: 'चार्ट', ctxChip: d.title || '', q: d.q, max: d.max, i18n: d.i18n };
  }
  return {
    id: d.id,
    type: 'mcq',
    tag: d.tag || 'सही उत्तर चुनें',
    q: d.q,
    opts: d.opts,
    ans: d.ans,
    hint: d.hint || '',
    exp: d.exp || '',
    i18n: d.i18n,
  };
}

/** Builds the quiz from a day's question documents (murli first, then chart). */
export const buildQuestions = (docs) => docs.map(toQuizQuestion);
