# Tonify — Project Requirements Document (PRD)

## Context

**Tonify** is a fullstack web app that generates Fender Mustang LT25 amp presets from an audio reference (e.g. a song the user wants to tone-match). The user uploads an audio file, the system isolates the guitar track, an ML model predicts the LT25 preset (amp model + effect block settings), and the app displays a settings sheet of numerical knob values the user dials into their physical amp.

**Why this exists:** The author owns a PRS Custom 24 + Fender Mustang LT25 and wants a tool that takes "I want my tone to sound like *this* song" and produces concrete preset values without hours of manual A/B knob-twisting. v1 is built tailored to the author's exact rig (PRS Custom 24 + LT25). The architecture is designed so v2 can scale to additional guitars (Stratocaster, Les Paul, etc.) without rewriting core components.

**Intended outcome:**
- Sign in → upload an audio clip → see LT25 knob values for amp + stomp + mod + delay + reverb → save to a personal preset library.
- v1 ships as a working end-to-end demo on the author's local machine, with the data and ML pipeline structured for future cloud deployment and multi-guitar support.

---

## Goals & Non-Goals

### v1 Goals
- Working signup/login (Supabase auth).
- Audio upload (mp3, wav, flac, mp4) → guitar stem extraction → preset prediction → result display.
- Full LT25 preset schema: amp model + gain/EQ/volume + stomp + mod + delay + reverb.
- Personal preset library (save / name / delete / list).
- Trained model specific to the author's PRS Custom 24.
- Documented setup so a fresh clone runs end-to-end on a new machine.

### v1 Non-Goals (deferred to v2+)
- Multi-guitar support (DB schema accommodates it; only PRS is trained).
- USB push directly to amp (user dials in manually).
- Cloud deployment (everything runs locally).
- Public/shared preset library.
- Mobile app.
- Real-time / live-input matching.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Vite + React 19 (TypeScript) + Tailwind v4 + React Router** | Local-first SPA. Vite gives a fast dev server, React Router handles `/login` `/upload` `/result/:jobId` `/library`. Components kept close to plain HTML/CSS. |
| Backend API | **Python 3.11 + FastAPI** | Native fit for ML inference and audio DSP libs |
| ML / DSP | **PyTorch, librosa, pedalboard, NAM (Neural Amp Modeler), Demucs** | Standard audio-ML stack |
| Auth + DB | **Supabase (Postgres + Auth)** | One service for auth, DB, file storage; free tier sufficient |
| File storage | **Supabase Storage** (v1) → optionally Backblaze B2 for large dataset backup | Free tier covers user uploads |
| Hosting | **Local-first** (FE on `localhost:3000`, BE on `localhost:8000`) | v1 is single-user; defer hosting decisions |
| Training compute | **Google Colab free tier (T4 GPU)** | Local machine has only Intel UHD; Colab is free and fast enough for a small CNN |
| Dev tooling | `npm` (FE), `uv` or `pip` + `venv` (BE), `ruff`, ESLint, `pytest` | Standard |

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                   BROWSER                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite dev server on localhost:5173)                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────────┐    │  │
│  │  │   /login    │  │   /upload    │  │ /result  │  │ /library       │    │  │
│  │  │  (Supabase  │  │ (file picker │  │ (settings│  │ (saved presets)│    │  │
│  │  │   auth UI)  │  │  + submit)   │  │   sheet) │  │                │    │  │
│  │  └─────────────┘  └──────────────┘  └──────────┘  └────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
              │ Supabase JS SDK (auth, DB, storage)        │ fetch /predict
              ▼                                            ▼
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│   Supabase (cloud, free)    │         │   FastAPI Backend (localhost:8000)   │
│   ┌───────────────────────┐ │         │  ┌────────────────────────────────┐  │
│   │ Auth (email + OAuth)  │ │         │  │ POST /predict                  │  │
│   ├───────────────────────┤ │         │  │  1. Decode audio (ffmpeg)      │  │
│   │ Postgres              │ │         │  │  2. Trim to 5-15s window       │  │
│   │   - users             │ │         │  │  3. Demucs → guitar stem       │  │
│   │   - guitars           │ │         │  │  4. Mel-spectrogram            │  │
│   │   - presets           │ │         │  │  5. CNN inference              │  │
│   │   - upload_jobs       │ │         │  │  6. Return preset JSON         │  │
│   ├───────────────────────┤ │         │  └────────────────────────────────┘  │
│   │ Storage (audio files) │ │         │  ┌────────────────────────────────┐  │
│   └───────────────────────┘ │         │  │ Models loaded on startup:      │  │
└─────────────────────────────┘         │  │  - Demucs (htdemucs)           │  │
                                        │  │  - prs_custom_24_v1.pt (CNN)   │  │
                                        │  └────────────────────────────────┘  │
                                        └──────────────────────────────────────┘
                                                       ▲
                                                       │ verifies Supabase JWT
                                                       │
                                        ┌──────────────────────────────────────┐
                                        │   Offline (one-time / periodic)      │
                                        │   ┌────────────────────────────────┐ │
                                        │   │ scripts/capture_nam_amps.md    │ │
                                        │   │   (manual: NAM training of 12  │ │
                                        │   │    LT25 amp models)            │ │
                                        │   ├────────────────────────────────┤ │
                                        │   │ data/guitars/prs_custom_24/    │ │
                                        │   │   dis/*.wav  (PRS DI corpus)   │ │
                                        │   ├────────────────────────────────┤ │
                                        │   │ scripts/train.py               │ │
                                        │   │   (Colab; on-the-fly synth     │ │
                                        │   │    via NAM + pedalboard)       │ │
                                        │   └────────────────────────────────┘ │
                                        └──────────────────────────────────────┘
```

---

## Repository Layout

```
Tonify/
├── frontend/                         # Vite + React SPA
│   ├── src/
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Router + nav
│   │   ├── index.css                 # `@import "tailwindcss";`
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Upload.tsx
│   │   │   ├── Result.tsx            # uses useParams() for :jobId
│   │   │   └── Library.tsx
│   │   ├── components/
│   │   │   ├── PresetSheet.tsx       # LT25 knob-value layout
│   │   │   ├── FileDropzone.tsx
│   │   │   └── ClipTrimmer.tsx
│   │   └── lib/supabase.ts
│   ├── public/                       # static assets served as-is
│   ├── index.html                    # SPA shell
│   ├── vite.config.ts                # React + Tailwind plugins
│   └── package.json
│
├── backend/                          # FastAPI app
│   ├── app/
│   │   ├── main.py                   # FastAPI entrypoint
│   │   ├── routes/
│   │   │   ├── predict.py
│   │   │   └── presets.py
│   │   ├── audio/
│   │   │   ├── decode.py             # ffmpeg wrapper
│   │   │   └── demucs_runner.py
│   │   ├── ml/
│   │   │   ├── model.py              # CNN architecture
│   │   │   ├── inference.py
│   │   │   └── preset_schema.py      # LT25 preset enum + ranges
│   │   ├── auth.py                   # Supabase JWT verification
│   │   └── db.py                     # Supabase client
│   ├── models/
│   │   └── prs_custom_24_v1.pt       # trained weights (gitignored)
│   ├── tests/
│   └── pyproject.toml
│
├── ml/                               # Training pipeline (run on Colab)
│   ├── amps/                         # NAM-captured LT25 amp models (.nam)
│   ├── effects/                      # pedalboard configs for stomp/mod/delay/reverb
│   ├── dataset.py                    # on-the-fly synthetic dataset
│   ├── train.py                      # entry point for training
│   ├── eval.py
│   └── notebooks/
│       └── colab_train.ipynb
│
├── data/
│   └── guitars/
│       └── prs_custom_24/
│           ├── dis/                  # PRS DI recordings (large; gitignored)
│           └── metadata.json
│
├── scripts/
│   ├── capture_nam_amps.md           # manual procedure doc
│   ├── record_di_corpus.md           # manual procedure doc
│   └── seed_db.sql                   # initial guitars row
│
├── supabase/
│   └── migrations/                   # SQL migrations
│
├── docs/
│   ├── prd.md                        # this document
│   ├── architecture.md
│   ├── setup.md
│   └── preset_schema.md
│
├── .env.example
├── README.md
└── prd.txt                           # legacy placeholder
```

---

## Data Model (Supabase / Postgres)

```sql
-- users: provided by Supabase auth.users (no custom table needed for v1)

create table guitars (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,            -- 'prs_custom_24'
  display_name text not null,           -- 'PRS Custom 24'
  pickup_type text,                     -- 'humbucker'
  model_filename text not null,         -- 'prs_custom_24_v1.pt'
  is_active boolean default true,
  created_at timestamptz default now()
);

create table upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guitar_id uuid references guitars(id),
  source_filename text,
  storage_path text,                    -- Supabase Storage key
  clip_start_sec numeric,
  clip_end_sec numeric,
  status text default 'pending',        -- pending|processing|done|failed
  predicted_preset jsonb,               -- result from model
  confidence numeric,
  error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guitar_id uuid references guitars(id),
  name text not null,
  preset_json jsonb not null,
  source_job_id uuid references upload_jobs(id),
  created_at timestamptz default now()
);

-- Row-level security: users only see their own upload_jobs and presets.
```

---

## LT25 Preset Schema

A predicted preset is a JSON object with this exact shape (defined in `backend/app/ml/preset_schema.py`):

```jsonc
{
  "amp": {
    "model": "57_twin",            // enum of ~12 LT25 amp models
    "gain": 6.5,                   // 0.0 - 10.0
    "volume": 5.0,
    "treble": 7.0,
    "middle": 5.0,
    "bass": 6.0
  },
  "stomp": {
    "type": "overdrive" | "compressor" | "distortion" | "fuzz" | "off",
    "level": 5.0,
    "param1": 5.0,                 // tone/gain depending on type
    "param2": 5.0
  },
  "mod": {
    "type": "chorus" | "flanger" | "phaser" | "tremolo" | "vibratone" | "off",
    "level": 5.0,
    "rate": 5.0,
    "depth": 5.0
  },
  "delay": {
    "type": "mono" | "tape" | "stereo" | "multi" | "ping_pong" | "off",
    "level": 5.0,
    "time": 5.0,
    "feedback": 5.0
  },
  "reverb": {
    "type": "spring" | "hall" | "plate" | "room" | "off",
    "level": 5.0,
    "decay": 5.0
  }
}
```

Exact amp-model list and parameter ranges to be finalized against the LT25 manual during implementation.

---

## ML Approach

### Inputs / Outputs
- **Input:** mel-spectrogram of a 5-15s guitar-stem clip (128 mels × 256 frames, log-magnitude).
- **Output:** structured preset (see schema). Each enum field is a classification head; each continuous knob is a regression head with sigmoid scaled to its range.

### Model
- Small CNN (~3-5 conv blocks → global pool → multi-head FC) targeting <50 MB and <1 s CPU inference. Architecture defined in `backend/app/ml/model.py` and mirrored under `ml/`.

### Training data — on-the-fly synthesis (no 100 GB dataset stored)
Source material (~10 GB total on disk):
- **PRS Custom 24 DI corpus** under `data/guitars/prs_custom_24/dis/` — ~60-90 minutes of varied DI playing the author records once (chords, scales, palm-mute, both pickups, varied dynamics).
- **NAM-captured LT25 amp models** under `ml/amps/*.nam` — one capture per LT25 amp model, produced one-time via Neural Amp Modeler.
- **Mix-augmentation stems** (drums/bass/vocals) from MUSDB18 to simulate full-song uploads.

PyTorch `Dataset` (`ml/dataset.py`) generates each training example in-memory per batch:
1. Pick a random DI clip.
2. Sample a random preset from the schema.
3. Render: DI → NAM (amp) → pedalboard (EQ, stomp, mod, delay, reverb).
4. Mix with random drums/bass/vocals at random SNR.
5. Compute mel-spectrogram.
6. Return `(mel, preset_tensor)`.

Multiprocessing data-loader workers keep the trainer fed. No precomputed dataset on disk.

### Inference pipeline (FastAPI `/predict`)
1. Accept upload → save to Supabase Storage.
2. Decode with ffmpeg (handles mp4, mp3, wav, flac).
3. Trim to user-selected 5-15 s window.
4. Run **Demucs (htdemucs)** → extract `other.wav` / guitar-relevant stem.
5. Compute mel-spectrogram.
6. Forward through `prs_custom_24_v1.pt`.
7. Decode output heads → preset JSON.
8. Persist to `upload_jobs.predicted_preset`, return to frontend.

Expected end-to-end latency on CPU: ~10-20 s (Demucs dominates).

### Future multi-guitar architecture
- `guitars` table already supports multiple rows.
- One model file per guitar (`{guitar_slug}_v{n}.pt`).
- `/predict` selects the model based on `user.selected_guitar_id`.
- v2 adds: Strat / Les Paul DI sources via IDMT-SMT-Guitar / GuitarSet; same training script parameterised by `guitar_slug`.

---

## Frontend UX

### Pages
- `/login` — Supabase Auth UI (email + Google).
- `/upload` — file picker (drag-drop), audio preview + waveform, range slider to select 5-15 s clip, guitar selector (only PRS C24 in v1), submit button.
- `/result/[jobId]` — polls job until `done`; renders `PresetSheet` with the predicted knob values (visual layout grouped by amp / stomp / mod / delay / reverb blocks, each showing knob name + numeric value 0-10). "Save to library" button.
- `/library` — list of saved presets with name, date, source clip, and a "view" link back to the `PresetSheet` rendering.

### Settings sheet (key v1 UI artifact)
`components/PresetSheet.tsx` renders five blocks (amp, stomp, mod, delay, reverb). Each block shows the selected enum (e.g. amp model name) and the continuous knob values as both a numeric label and a knob graphic at the appropriate angle. Plain-HTML feel; no design system.

---

## Engineering Requirements

### Functional
1. User can sign up / log in via Supabase email or Google OAuth.
2. User can upload mp3 / wav / flac / mp4 up to 50 MB.
3. User can select a 5-15 s sub-clip via UI before submitting.
4. System runs Demucs + CNN inference and returns a structured preset within ~30 s.
5. User can save predicted preset to their library with a name.
6. User can view, rename, and delete saved presets.
7. Row-level security: a user sees only their own jobs and presets.

### Non-functional
1. **Reproducible setup**: `README.md` + `docs/setup.md` get a fresh clone running in <30 min on a new machine.
2. **Pinned dependencies**: `pyproject.toml` (BE) and `package.json` lockfile (FE).
3. **Local-only**: no paid services required to run v1.
4. **Type safety**: TypeScript strict mode on FE; type hints + `ruff` on BE.
5. **Tests**: `pytest` for backend audio/ml utilities (decoder, preset schema validation, inference smoke test with a fixed mel input).
6. **Architecture diagram** maintained in `docs/architecture.md` (this PRD's diagram is the source of truth).
7. **Learning-focused**: prefer first-principles implementations (e.g., write the mel-spectrogram + training loop directly rather than reaching for high-level wrappers like fast.ai) when the cost is small.

---

## Critical Files (to be created during implementation)

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app, CORS, routes registration |
| `backend/app/routes/predict.py` | `POST /predict` upload → preset endpoint |
| `backend/app/routes/presets.py` | CRUD for saved presets |
| `backend/app/audio/demucs_runner.py` | Wraps Demucs CLI/python API |
| `backend/app/ml/preset_schema.py` | LT25 enum lists + ranges, pydantic models |
| `backend/app/ml/model.py` | CNN architecture (shared with `ml/train.py`) |
| `backend/app/ml/inference.py` | Loads `.pt`, returns preset JSON |
| `ml/dataset.py` | On-the-fly synthetic dataset |
| `ml/train.py` | Training loop (Colab entry point) |
| `frontend/src/pages/Upload.tsx` | Upload UI + clip trimmer |
| `frontend/src/components/PresetSheet.tsx` | Settings-sheet display |
| `frontend/src/lib/supabase.ts` | Supabase client |
| `supabase/migrations/0001_init.sql` | Tables + RLS policies |
| `docs/architecture.md` | Architecture diagram + flow narratives |
| `docs/setup.md` | One-time setup walkthrough |
| `scripts/capture_nam_amps.md` | NAM capture procedure |
| `scripts/record_di_corpus.md` | DI recording procedure |

---

## Implementation Phases

1. **Phase 0 — Scaffolding** (1-2 days)
   Repo layout, Vite + React + FastAPI hello world, Supabase project + tables + RLS, `.env.example`, `docs/setup.md` first pass.

2. **Phase 1 — Auth + Upload + Storage** (3-4 days)
   Supabase auth wired up; `/upload` page; file goes to Supabase Storage; `upload_jobs` row created.

3. **Phase 2 — Audio decode + Demucs in backend** (2-3 days)
   FastAPI receives the storage key, downloads, decodes, trims, runs Demucs, returns the stem path. No ML yet — return a stub preset.

4. **Phase 3 — NAM captures + DI recording (offline, in parallel with Phase 2)** (1-2 evenings)
   Author records PRS DI corpus and captures LT25 amp models with NAM. Files land in `data/` and `ml/amps/`.

5. **Phase 4 — Synthetic dataset + training** (5-7 days)
   `ml/dataset.py` + `ml/train.py`; train on Colab; produce `prs_custom_24_v1.pt`; commit weights via Git LFS or download script.

6. **Phase 5 — Inference wiring + result UI** (3-4 days)
   `/predict` returns real preset; `/result/[jobId]` renders `PresetSheet`.

7. **Phase 6 — Library + persistence** (2 days)
   Save / list / delete presets.

8. **Phase 7 — Polish + docs + verification** (2-3 days)
   README, setup walkthrough verified on clean machine, basic test suite, architecture doc finalised.

**Total v1 estimate: ~4-6 weeks of focused work.**

---

## Verification

End-to-end checks before declaring v1 done:

1. **Setup**: from a clean clone, following `docs/setup.md`, a developer can:
   - install backend deps, run `uvicorn app.main:app` on `:8000`,
   - install frontend deps, run `npm run dev` on `:5173`,
   - apply `supabase/migrations/*.sql` against a Supabase project,
   - download `prs_custom_24_v1.pt` into `backend/models/`,
   - log in and load the upload page.

2. **Functional smoke test**: upload a known reference clip (e.g. a clean blues lick); the result page renders a `PresetSheet` with sensible values (amp model ∈ schema, all knobs in [0,10]); preset saves to library and reappears after page reload.

3. **Backend tests** (`pytest`):
   - `preset_schema.py`: every predicted JSON validates against the pydantic model.
   - `inference.py`: feeding a fixed mel tensor returns a fixed-shape preset.
   - `demucs_runner.py`: smoke test on a 10 s test wav.

4. **Manual tone check**: author dials the predicted preset into the physical LT25, plays along to the reference clip, and confirms it's "in the right neighbourhood" (subjective; collect ~10 reference clips and rate 1-5 to track progress over time).

5. **Multi-guitar readiness check** (architectural, not behavioural): adding a row to `guitars` and dropping a new `.pt` into `backend/models/` is sufficient to expose a new guitar in `/upload`'s selector. Verified by adding a stub `stratocaster_v0.pt` (clone of PRS weights) and confirming it appears and serves predictions.
