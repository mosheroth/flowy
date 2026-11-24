# flowy

Mobile-first audio biofeedback for stuttering reduction. This starter guides a short breathing exercise: inhale quietly, then exhale with an audible soft sound. The mic measures exhalation **sound velocity** (how strong and how steadily the breath noise moves) and scores airflow quality.

## Run locally

```bash
npm install
npm run dev
```

Allow microphone access when prompted. On phones, use HTTPS or localhost.

## How scoring works

During each exhale the app samples microphone RMS as a proxy for airflow, derives **velocity** as the rate of change of that level, and scores:

- audible coverage (sound present while exhaling)
- level in a gentle band (not silent, not blasting)
- low speed (smooth stream rather than bursts)

## Stack

Vite + React + TypeScript. No backend required for the starter session.

## GitHub Pages

Deploy is automated via `.github/workflows/deploy-pages.yml` on every push to `main`.

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Merge this branch into `main` (or run the workflow manually after that)
3. Open `https://mosheroth.github.io/flowy/`

Note: this repo is currently **private**. GitHub Pages on a private repo needs GitHub Pro (or make the repo public).
