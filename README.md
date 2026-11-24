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

Site: `https://mosheroth.github.io/flowy/`

**Important:** Pages must NOT deploy the raw `main` branch root (that serves the Vite source `index.html` and shows a blank page).

In the repo **Settings → Pages → Build and deployment**:

- Preferred: **Source = GitHub Actions** (uses `.github/workflows/deploy-pages.yml`), or
- Alternative: **Source = Deploy from a branch** → branch **`gh-pages`** / folder `/ (root)`

Every push to `main` rebuilds via Actions; the `gh-pages` branch is also updated with the static build.
