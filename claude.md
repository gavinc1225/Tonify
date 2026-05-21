# Tonify — Claude Code Context

## Project summary
Tonify is a fullstack web app that takes an uploaded audio reference and
generates a Fender Mustang LT25 preset (amp model + stomp + mod + delay +
reverb knob values) that matches the tone. v1 is tailored to the author's
PRS Custom 24 + LT25 rig; the architecture is built to scale to additional
guitars in v2.

For full requirements see `docs/prd.md`.

## Tech stack
- Frontend: Vite + React 19 (TypeScript) + Tailwind CSS v4 + React Router — kept close to plain HTML/CSS
- Backend: Python 3.11 + FastAPI
- ML / DSP: PyTorch, librosa, pedalboard, Neural Amp Modeler (NAM), Demucs
- Auth + DB: Supabase (Postgres + Auth + Storage)
- Hosting (v1): local-first — FE on `localhost:5173`, BE on `localhost:8000`
- Training compute: Google Colab free tier (local machine is Intel UHD)

## Repo layout (target — populated incrementally)
```
Tonify/
├── frontend/          Vite + React SPA
│   └── src/pages/     Login.tsx, Upload.tsx, Result.tsx, Library.tsx
├── backend/           FastAPI app + models/
├── ml/                Training pipeline (Colab)
├── data/              PRS DI corpus (gitignored)
├── scripts/           Manual procedure docs (NAM capture, DI recording)
├── supabase/          SQL migrations
└── docs/              prd.md (source of truth), architecture.md, setup.md
```

## Common commands
- Frontend dev: `cd frontend && npm run dev` (serves on :5173)
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`
- Backend dev: `cd backend && uvicorn app.main:app --reload` (later)
- Backend tests: `cd backend && pytest` (later)

## Conventions
- TypeScript strict mode on the frontend; Python type hints + `ruff` on the backend.
- Prefer first-principles implementations over high-level wrappers when the
  cost is small (per PRD non-functional req #7) — this project is partly a
  learning exercise in ML / audio DSP.
- Keep components close to plain HTML/CSS. No design system in v1.
- Pin dependencies (`pyproject.toml`, `package-lock.json`).
- Update `changelog.md` and `project_status.md` whenever a meaningful change lands.

## Where to look
- `docs/prd.md` — full requirements doc (architecture, data model, ML approach, phases)
- `reference_docs.md` — feature inventory + project-specific implementation notes
- `project_status.md` — current phase, what's done, what's next
- `changelog.md` — chronological list of changes
