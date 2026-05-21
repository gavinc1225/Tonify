# Reference Docs

A living index of Tonify's features and how they're implemented in this
project specifically. For the full requirements doc see `docs/prd.md`.

## Features (planned)

| Feature | Status | Notes |
|---|---|---|
| Email + Google auth | Planned | Supabase Auth |
| Audio upload (mp3 / wav / flac / mp4) | Planned | Supabase Storage; `ffmpeg` decode on backend |
| Clip trimmer (5-15 s window) | Planned | Frontend range slider over waveform |
| Guitar selector | Planned | DB-backed `guitars` table; PRS Custom 24 only in v1 |
| Demucs source separation | Planned | `htdemucs`, runs in FastAPI before inference |
| Preset prediction (CNN) | Planned | Per-guitar `.pt` models in `backend/models/` |
| Settings sheet display | Planned | `frontend/components/PresetSheet.tsx` |
| Saved preset library | Planned | Postgres `presets` table; RLS-scoped per user |

## Implementation notes (project-specific)

### Training pipeline
On-the-fly synthetic dataset using PRS DI corpus + NAM-captured LT25 amp
models + `pedalboard` effects. No precomputed dataset on disk; PyTorch
DataLoader workers render `(audio, preset)` pairs in-memory per batch.
Training runs on Google Colab free tier (local machine is Intel UHD only).
See `docs/prd.md` §ML Approach.

### Preset schema
Full LT25 chain: amp + stomp + mod + delay + reverb. Will live in
`backend/app/ml/preset_schema.py`. Each enum (amp model, effect type) is a
classification head; each continuous knob is a regression head with sigmoid
scaled to its range. See `docs/prd.md` §LT25 Preset Schema for shape.

### Inference latency
End-to-end ~10-20 s on CPU; Demucs dominates. Acceptable for v1 since the
user uploads a single clip and waits on the result page.

### Multi-guitar scalability
v1 ships PRS Custom 24 only, but the `guitars` table, per-guitar model
filename pointer, and guitar-parameterised training script are designed
so v2 can add Stratocaster / Les Paul models without architectural changes.
Future DI sources: IDMT-SMT-Guitar, GuitarSet.

### Heavy artifact handling
PRS DI recordings (`data/guitars/*/dis/`), trained model weights
(`backend/models/*.pt`), and NAM amp captures (`ml/amps/*.nam`) are all
gitignored. Weights are downloaded via a script (TBD in Phase 4) rather
than committed via Git LFS.
