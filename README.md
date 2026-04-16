# Stride — LeetCode Tagged Questions

Stride is a minimal, fast, beautiful web app for browsing LeetCode company-tagged questions from this dataset.

Live site: [lcpremium.vercel.app](https://lcpremium.vercel.app)

It lets you:
- filter by company, difficulty, topic, status, and timeframe
- sort by frequency, acceptance, title, or question ID
- track your own progress (solved / attempted)
- export and import your profile as JSON

The app is built with Next.js and uses the CSV files in `Questions Data/` as the source of truth.

## What Is In This Repo

- `Questions Data/`  
  Company-wise CSVs grouped by recency windows (`thirty-days`, `three-months`, `six-months`, `more-than-six-months`, `all`)
- `scripts/build-data.mjs`  
  Data build script that merges CSVs and generates web-ready JSON
- `web/`  
  Next.js app (the Stride UI)
- `web/public/data/questions.json`  
  Generated dataset used by the frontend

## Features

- **Time-window aware filtering**
  - selecting `Last 30 days` only shows questions present in `thirty-days.csv`
  - same behavior for `3 months`, `6 months`, `6m+`, and `all`
- **Company + time-window intersection**
  - selected companies narrow which CSV rows are eligible
- **Profile persistence**
  - stored in browser localStorage
  - import/export JSON for backup and migration
- **Minimal UI**
  - clean serif/sans typography
  - no gradients, no visual noise

## Quick Start

### Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm

### Install

From repo root:

```bash
npm install --prefix web
```

### Run locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Build Data

Generate/refresh the frontend dataset from CSV files:

```bash
npm run build:data
```

This script:
1. scans all company folders in `Questions Data/`
2. merges question rows across periods
3. fetches topic tags from LeetCode GraphQL
4. writes `web/public/data/questions.json`

## Production Build

```bash
npm run build
```

Or full pipeline:

```bash
npm run build:all
```

## Deploy To Vercel

### Recommended

- Set **Root Directory** to `web`
- Framework: Next.js (auto-detected)
- Install Command: `npm install`
- Build Command: `npm run build`

### Alternative (repo-root build)

This repo includes `vercel.json` so root deploys work by installing/building `web/`.

## NPM Scripts (repo root)

- `npm run dev` — run Next.js dev server from `web/`
- `npm run build:data` — regenerate `web/public/data/questions.json`
- `npm run build` — Next.js production build
- `npm run build:all` — data build + production build

## Data Notes

- CSV columns expected:
  `ID, URL, Title, Difficulty, Acceptance %, Frequency %`
- Topics are enriched from LeetCode GraphQL at build time.
- Time-window behavior in UI is based on period-specific CSV presence/frequency.

## Contributing

1. Create a branch
2. Make changes
3. Run:
   - `npm run build:data` (if dataset changed)
   - `npm run build`
4. Open a PR

## Acknowledgement

The raw company-wise dataset format and scraping lineage come from the broader LeetCode company-question community project referenced in `Questions Data/README.md`.
