# Darstudies — Form 3 & Form 4 Study Companion

Mobile-first PWA for revising KSSM Form 3 and Form 4 with an adaptive daily study plan. A form switcher (Learn page header, Me → settings, or the setup wizard) chooses which form you study.

- **Form 4:** the science stream (Physics, Chemistry, Biology, Add Maths, Maths) plus Sejarah, Pendidikan Islam, Bahasa Melayu and English.
- **Form 3:** Bahasa Melayu, English, Mathematics, Science, Sejarah, Geografi, Pendidikan Islam, RBT, ASK, Pendidikan Seni Visual, Pendidikan Muzik and PJK.

Without accounts configured the app needs no backend or login, and all data stays on the phone (IndexedDB).

Built from `../form4-study-app-plan.md`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (http://localhost:5173) |
| `npm test` | Unit tests (planner, Leitner, mastery, streak, quiz checking, tools) |
| `npm run validate` | Zod content validation + cross-reference + KaTeX checks (runs automatically before `build`) |
| `npm run build` | Validate → type-check → production build in `dist/` |
| `npm run preview` | Serve the production build (test offline/PWA here) |
| `npm run extract-dskp` | DSKP PDFs in `content/form4/dskp/` → `content/form4/raw/extracted/` + review report |
| `npm run icons` | Regenerate PNG app icons |

## Deploy (free, HTTPS needed for PWA)

- **Netlify:** build `npm run build`, publish `dist` (`public/_redirects` handles SPA routes).
- **Vercel:** framework "Vite" (`vercel.json` handles SPA routes).
- Then open the URL on the phone → *Install app* (Android) or Share → *Add to Home Screen* (iPhone).

## What's in v0.1

- **Learn (Form 4):** 79 chapters / 288 subtopics (EN + BM) across 9 subjects. Sejarah (10), Pendidikan Islam (7), Bahasa Melayu (7) and English (6) each have full intros, notes for every subtopic, 20 quiz questions (easy / medium / KBAT) and 15+ flashcards per chapter.
- **Learn (Form 3):** 77 chapters / 217 subtopics (EN + BM) across 12 subjects, each chapter with an intro, infographic, key terms, notes for every subtopic, 20 quiz questions (8 easy / 8 medium / 4 KBAT) and 15 flashcards — 1,540 questions and 1,155 flashcards in total, plus 25 Form 3 formulas.
- **Practice:** quiz engine (mcq, multi, numeric with tolerance, fill with synonyms, match, order), Leitner flashcards, formula drill (Form 4 and Form 3 sets), weak-topic quizzes, Form 3 → Form 4 bridge set.
- **Tools:** linear motion calculator, periodic table, quadratic graph plotter, cell explorer, number base converter (others listed as "coming soon").
- **Planner:** setup wizard, phases A–E, weighted round robin by confidence, budget/subject caps, rest days, exam sprint, "class is on chapter X", tap-to-move, reschedule / reset after missed days, weekly auto-refresh.
- **Me:** XP/levels, streak with free rest day, badges, mastery & accuracy charts, EN/BM, dark mode, break & daily reminders, JSON backup/restore.

## Accounts, trial & subscriptions (optional)

Login (Google, Apple, Facebook, Microsoft, email link), a configurable free trial, locked subjects/features, CHIP payments (card, FPX, DuitNow QR, e-wallets) and an admin screen are built in, backed by Supabase. They switch on only when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are set as GitHub repository variables; without them the app runs as before. With them on, Form 4 lesson content is served from Supabase to permitted users only and is not bundled; Form 3 is free for every signed-in user and stays bundled. Setup: [docs/ACCOUNTS-SETUP.md](docs/ACCOUNTS-SETUP.md). Database: `supabase/migrations/`; server functions: `supabase/functions/`.

## Adding content

Content is split by form: `content/form4/…` and `content/form3/…`, each with the same layout. Form 3 IDs start with `f3` (e.g. subject `f3math`, chapter `f3math-01`).

1. Structure lives in `content/form<N>/raw/<subject>.json` (verify against the latest DSKP).
2. Write `content/form<N>/<subject>/<chapterId>.json` (see `content/form4/phy/phy-02.json`), `content/form<N>/notes/<chapterId>.json` and `content/form<N>/flashcards/<chapterId>.json`. Formulas go in `content/form<N>/formulas.json`.
3. Keep `"reviewed": false` until checked against the textbook — the app shows a *Draft* badge.
4. `npm run validate` — fixes any broken IDs before the build will pass. Targets: ≥ 20 questions (8 easy, 8 medium, 4 KBAT) and ≥ 15 flashcards per chapter.

All explanations, questions and diagrams must be original — only the DSKP *structure* may be copied.
