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

- **AI tab**: a chat with Claude. The teacher writes one instruction, for example pasting the day's murli and asking for "5 मुरली प्रश्न और 5 चार्ट प्रश्न", or "10 नवंबर के प्रश्न 3 का सही उत्तर बदलो", and Claude does the work:
  - it can look at saved questions on its own;
  - every **add / change / delete** shows up as a card with **Apply / Cancel**, and nothing is saved until the teacher taps Apply;
  - questions are created in Hindi, English and Gujarati, at most 3 per step, so each step stays inside the hosting time limit;
  - the chat is kept on the teacher's phone until they tap "नई चैट".
  - **Murli from madhubanmurli.org:** when asked for questions from a murli, Claude first asks **which date's murli** to use (unless the message already names the date), then fetches it with its `fetch_murli` tool. The server endpoint `/api/murli` (`server/murli.js`) reads `https://madhubanmurli.org/murlis/{hi|en|gu}/html/murli-YYYY-MM-DD.html`, past and upcoming dates, and turns it into labelled text (essence, question/answer, song, murli, blessing, slogan). Hindi is used by default. The chat shows "मुरली पढ़ी: date · language". The murli date can be any day, but questions are still saved only for today or later.
  - **Limits:** the AI manages questions only. It has no access to students, their accounts or their results, and it can only add, change or delete questions dated **today or later**. Past questions and their answers can't be touched. The app refuses such proposals before a card appears, and checks again when Apply is tapped.
  - **Publish:** questions the AI adds or changes are saved as **drafts** (`published: false`) that students don't see. A **"प्रकाशित करें"** bar appears at the top of the tab; after reviewing, the teacher publishes them all at once. Questions added by hand in प्रश्न सूची are published straight away.
- **सेटिंग्स tab** (teacher only): change the Claude API key, for example to switch to a different Anthropic account. The key is checked with Anthropic, then stored on the server only (Netlify Blobs); phones only ever see its last 4 characters. The first save creates a **settings PIN** (4–8 digits), and every later change needs it. After 5 wrong PINs, changes lock for 15 minutes. A key saved here takes priority over the `ANTHROPIC_API_KEY` Netlify setting. If the PIN is forgotten, delete the `gyan-seedhi-secrets` blob store in Netlify (Blobs) and set the key again.
  - **Weekly limit:** Anthropic doesn't let a normal API key read its own balance, so the app records the tokens of every Claude call and estimates the cost at Claude Opus 5.5 prices, per week (Monday–Sunday, India time). Settings shows this week's requests and approximate cost against a weekly limit in USD, which the teacher sets with the PIN. At **80%** the AI tab shows a warning; at **100%** the AI chat and translate stop until next Monday or until the limit is raised. This is the app's own estimate; the real bill is in the Anthropic Console.
- **प्रश्न सूची** (inside the same tab): every question, grouped by date (newest first), showing category (Murli/Chart), options, correct answer, hint and murli point. The teacher can also **add**, **edit** (including the date) and **delete** questions by hand, with a confirmation step before deleting.
- **परिणाम tab**: every student's Murli, Chart and total marks for this week, this month or all time, ranked by total. The top 3 are highlighted, ties share a rank (1, 1, 3), and the list updates live.

Each day's quiz uses the questions dated today. If there are none, it uses the most recent earlier date that has questions.

### Translations with Claude

The question form has **हिन्दी / English / ગુજરાતી** tabs. The teacher types in any one tab and presses **"Claude से अनुवाद करें"**. Claude fills the other two languages, and the teacher can correct them before saving. Each question stores all three versions (`i18n.hi / en / gu`), and students see their chosen language. A language that wasn't filled falls back to the main text.

Both Claude features (`claude-opus-5-5`) run on the server, in the Netlify Functions `netlify/functions/translate.mjs` and `netlify/functions/qa-chat.mjs` (code in `server/`), so the API key never reaches the browser. Long Claude calls stream a keep-alive response, because Netlify gives streamed responses more time than normal ones (documented up to 60 s).

**Setup:**
1. Create an API key at console.anthropic.com → API keys.
2. In the app, open **सेटिंग्स**, paste the key, and create a settings PIN. Or in Netlify, go to **Site configuration → Environment variables**, add `ANTHROPIC_API_KEY`, and redeploy.
3. For local development, copy `.env.example` to `.env.local` and put the key there. That file is git-ignored.
4. Set a monthly **spend limit** in the Anthropic Console. `/api/translate` has no login (like the rest of the app), so the limit protects you from misuse. Each translation is one small request.

If the key is missing, the chat and the translate button say the Claude service isn't set up; the teacher can still add questions by hand in प्रश्न सूची.

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
