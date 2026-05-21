# Changelog

All notable changes to Tonify will be documented in this file. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Semantic versioning.

## [Unreleased]

### Added
- Baseline repository documentation: `claude.md`, `changelog.md`, `project_status.md`, `reference_docs.md`.
- `.gitignore` tailored for Python + Node + audio/ML artifacts.
- PRD (`docs/prd.md`) — full requirements, architecture, data model, ML approach, implementation phases.

### Changed
- Renamed project from `ToneMatch` to `Tonify` (GitHub repo renamed; README, remote URL, and status doc updated).
- Switched frontend stack from Next.js to Vite + React 19 + Tailwind v4 + React Router. Rationale: local-first SPA with a separate FastAPI backend doesn't need SSR or file-based routing; Vite is simpler and faster to learn. PRD, `claude.md`, and `project_status.md` updated to match.

### Added (Phase 0 — frontend scaffold)
- `frontend/` scaffolded via `create-vite` (React + TypeScript template).
- Tailwind CSS v4 wired through `@tailwindcss/vite` plugin.
- React Router with placeholder pages: `/login`, `/upload`, `/result/:jobId`, `/library`.
- `npm run dev` serves on :5173; `npm run build` produces a clean bundle (~75 KB gzipped JS).
