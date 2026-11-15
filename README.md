# ज्ञान सीढ़ी · Gyan Seedhi

Daily Murli quiz app for Brahmakumaris Vastrapur: React 18 + Vite, in Hindi, Gujarati and English.

Members sign in with their mobile number and answer 10 questions a day: 5 murli questions and 5 self-check "chart" questions, one minute each. Every day of practice adds a leaf to their tree. After practising they can spin the vardan wheel, and they can see their day-by-day results, badges, streaks and a monthly calendar. They can also download the day's question paper as a PDF.

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

## Teacher role and daily questions

The mobile number in `TEACHER_MOBILES` (`src/constants/config.js`, currently `9427940846`) gets the **Teacher** role:

- **प्रश्न/उत्तर tab**: every question, grouped by date (newest first), showing category (Murli/Chart), options, correct answer, hint and murli point. The teacher can **add**, **edit** (including the date) and **delete** questions, with a confirmation step before deleting.
- **परिणाम tab**: every student's Murli, Chart and total marks for this week, this month or all time, ranked by total. The top 3 are highlighted, ties share a rank (1, 1, 3), and the list updates live.

Each day's quiz uses the questions dated today. If there are none, it uses the most recent earlier date that has questions. Questions the teacher types show exactly as written in every language. Only the original built-in set has English and Gujarati translations.

## Firebase (database)

Questions and student results are stored in **Cloud Firestore** (Firebase project `gyan-seedhi`, location Mumbai, free Spark plan).

| Collection | Document | Written by |
|---|---|---|
| `questions` | one per question: `date`, `category` (`murli`/`chart`), `q`, `opts`, `ans`, `hint`, `exp`, `tag`, `title`, `order` | Teacher (Q/A tab) |
| `results` | id `{mobile}_{date}`: `name`, `mPts`, `cPts`, `points`, `acc`, `timeSec`, … | Each student's app, once per day |

- The web config in `src/services/firebase.js` is public by design. Access is controlled by **`firestore.rules`**. If you change that file, paste it into Firebase console → Firestore → Rules and press **Publish**.
- The rules check the format of every write, and make results write-once (a day's score can't be changed or deleted from the app).
- **Limitation:** login has no OTP, so the database can't verify who the teacher is. The teacher tabs are hidden from students, but someone with technical skill could still edit questions. To lock this down, add Firebase Authentication (phone OTP or email) and require it in the `questions` rules.
- `npm run seed:questions` copies the original 10 questions into an empty database. It does nothing if questions already exist.
- If Firestore can't be reached, the app falls back to the built-in questions so the quiz still works.

## Scoring

| Answer | Marks |
|---|---|
| Right on the first try | 20 |
| Right on the second try | 10 |
| Later, or time ran out | 0 |
| Chart question | the 0–20 the member enters |

Only the first attempt each day counts. Replays are marked as practice.

## Notes

- Each member's own history also stays in the browser's localStorage (`gs2_users`, `gs2_session`, `gs2_lang`). The Results tab shows a student their own day-by-day results, and every saved day is also uploaded to Firestore for the teacher.
- "नमूना खाता देखें" (the sample account) and the teacher's own practice are never uploaded.
- "नमूना खाता देखें" opens a sample account with 10 days of history.
- The quiz engine still supports a "match the pairs" question type (`type: 'match'`, `pairs: [[left, right], …]`), though today's set doesn't use it.
