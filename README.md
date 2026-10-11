# Darstudies — Form 4 Study Companion

Mobile-first PWA for previewing and revising the Form 4 KSSM science stream (Physics, Chemistry, Biology, Add Maths, Maths) with an adaptive daily study plan. No backend, no login — all data stays on the phone (IndexedDB).

Built from `../form4-study-app-plan.md`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (http://localhost:5173) |
| `npm test` | Unit tests (planner, Leitner, mastery, streak, quiz checking, tools) |
| `npm run validate` | Zod content validation + cross-reference + KaTeX checks (runs automatically before `build`) |
| `npm run build` | Validate → type-check → production build in `dist/` |
| `npm run preview` | Serve the production build (test offline/PWA here) |
| `npm run extract-dskp` | DSKP PDFs in `content/dskp/` → `content/raw/extracted/` + review report |
| `npm run icons` | Regenerate PNG app icons |

## Deploy (free, HTTPS needed for PWA)

- **Netlify:** build `npm run build`, publish `dist` (`public/_redirects` handles SPA routes).
- **Vercel:** framework "Vite" (`vercel.json` handles SPA routes).
- Then open the URL on the phone → *Install app* (Android) or Share → *Add to Home Screen* (iPhone).

## What's in v0.1

- **Learn:** all 49 chapters / 194 subtopics (EN + BM). Fully written 8-section intros for Physics 2, Chemistry 4, Biology 2, Add Maths 2, Maths 2; other chapters show a structure preview.
- **Practice:** quiz engine (mcq, multi, numeric with tolerance, fill with synonyms, match, order), Leitner flashcards, formula drill (44 formulas), weak-topic quizzes, Form 3 bridge set.
- **Tools:** linear motion calculator, periodic table, quadratic graph plotter, cell explorer, number base converter (others listed as "coming soon").
- **Planner:** setup wizard, phases A–E, weighted round robin by confidence, budget/subject caps, rest days, exam sprint, "class is on chapter X", tap-to-move, reschedule / reset after missed days, weekly auto-refresh.
- **Me:** XP/levels, streak with free rest day, badges, mastery & accuracy charts, EN/BM, dark mode, break & daily reminders, JSON backup/restore.

## Adding content

1. Structure lives in `content/raw/<subject>.json` (verify against the latest DSKP).
2. Write `content/<subject>/<chapterId>.json` (see `content/phy/phy-02.json`) and `content/flashcards/<chapterId>.json`.
3. Keep `"reviewed": false` until checked against the textbook — the app shows a *Draft* badge.
4. `npm run validate` — fixes any broken IDs before the build will pass. Targets: ≥ 20 questions (8 easy, 8 medium, 4 KBAT) and ≥ 15 flashcards per chapter.

All explanations, questions and diagrams must be original — only the DSKP *structure* may be copied.
