# ज्ञान सीढ़ी · Gyan Seedhi

Daily Murli quiz app for Brahmakumaris Vastrapur: React 18 + Vite, in Hindi, Gujarati and English.

Members sign in with their mobile number and answer 10 questions a day: 5 murli questions and 5 self-check "chart" questions, one minute each. Every day of practice adds a leaf to their tree. After practising they can spin the vardan wheel, and they can see centre ranks, badges, streaks and a monthly calendar. They can also download the day's question paper as a PDF.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run preview      # serve the build
npm run check:i18n   # verify every Hindi string translates to English and Gujarati
```

The app uses hash routing (`/#/rank`), so `dist/` works on any static host without server rewrites.

## Folder structure

```
├── index.html                 Fonts (Noto Sans Devanagari / Gujarati) + root element
├── scripts/
│   └── check-translations.mjs Finds Hindi strings with no English/Gujarati translation
└── src/
    ├── main.jsx               Entry point, global styles
    ├── App.jsx                Providers + routes
    ├── assets/logo.webp       Centre logo
    ├── constants/config.js    Murli date, marks per question, time limit, levels, demo names
    ├── data/                  ← edit these to change the day's content
    │   ├── questions.js       Today's 5 murli questions + 5 chart questions
    │   ├── vardans.js         This month's 7 vardans for the wheel (hi/en/gu)
    │   └── badges.js          Badge list
    ├── i18n/
    │   ├── locales/en.json    Hindi → English dictionary
    │   ├── locales/gu.json    Hindi → Gujarati dictionary
    │   ├── translate.js       Lookup (exact match, then key-by-key substitution)
    │   └── calendar.js        Month/day names, option letters, language list
    ├── context/
    │   ├── LanguageContext.jsx   useLang(): lang, t(), tn(), v(), calendar names
    │   └── AppContext.jsx        useApp(): users, session, plays, spins, last quiz
    ├── hooks/
    │   └── useQuizEngine.js   Quiz state machine: timer, retries, 50:50, hint, scoring
    ├── services/
    │   ├── storage.js         localStorage (with in-memory fallback)
    │   ├── stats.js           Streaks, badges, levels, tree stages, rank list
    │   ├── scoring.js         Turns a finished quiz into a result + saved play
    │   └── pdf.js             Question-paper PDF (canvas → JPEG → PDF, no library)
    ├── utils/                 date.js, helpers.js
    ├── layouts/AppShell.jsx   Auth guard + bottom nav wrapper
    ├── pages/                 Login, Home, Rank, Profile, Quiz, Result, Wheel
    ├── components/
    │   ├── common/            Icon, Logo, TopBar, BottomNav, LanguageSwitch, PointsSplit
    │   ├── home/              PracticeCalendar
    │   ├── quiz/              QuizHeader, Timer, ProgressLadder, Lifelines, QuestionCard,
    │   │                      OptionList, MatchBoard, SelfScoreInput, AnswerFeedback, QuitSheet
    │   ├── tree/              GrowthTree, TreeBox
    │   └── wheel/             VardanWheel, WheelBlock
    └── styles/
        ├── global.css         Original design (lotus-rose theme), unchanged
        └── overrides.css      Small additions for React (nav links, wheel spin)
```

## Changing the daily questions

1. Edit `src/data/questions.js` (Hindi) and `QUIZ_DATE` in `src/constants/config.js`.
2. Add the English and Gujarati translations to `src/i18n/locales/en.json` and `gu.json`. Each key is the **exact** Hindi string.
3. Run `npm run check:i18n` to catch anything you missed.

## Scoring

| Answer | Marks |
|---|---|
| Right on the first try | 20 |
| Right on the second try | 10 |
| Later, or time ran out | 0 |
| Chart question | the 0–20 the member enters |

Only the first attempt each day counts. Replays are marked as practice. Ranks sort by points, with ties going to whoever took less time.

## Notes

- Data lives in the browser's localStorage on each phone (`gs2_users`, `gs2_session`, `gs2_lang`). There is no backend yet, so ranks show **sample members** plus the signed-in person.
- "नमूना खाता देखें" opens a sample account with 10 days of history.
- The quiz engine still supports a "match the pairs" question type (`type: 'match'`, `pairs: [[left, right], …]`), though today's set doesn't use it.
