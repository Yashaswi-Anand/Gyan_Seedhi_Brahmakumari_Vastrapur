/** Month and weekday names per language. */
export const CALENDAR = {
  hi: {
    months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
    days: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
    days1: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    days1: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
  gu: {
    months: ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'],
    days: ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'],
    days1: ['ર', 'સો', 'મં', 'બુ', 'ગુ', 'શુ', 'શ'],
  },
};

export const LANGUAGES = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'en', label: 'English' },
];

export const APP_TITLE = { hi: 'ज्ञान सीढ़ी', en: 'Gyan Seedhi', gu: 'જ્ઞાન સીડી' };

/** Option letters per language. */
export const OPTION_LETTERS = { hi: ['क', 'ख', 'ग', 'घ'], en: ['A', 'B', 'C', 'D'], gu: ['ક', 'ખ', 'ગ', 'ઘ'] };

/** Native digits for small step numbers. */
export const STEP_DIGITS = { hi: ['१', '२'], en: ['1', '2'], gu: ['૧', '૨'] };
