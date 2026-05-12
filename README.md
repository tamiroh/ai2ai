# AI2AI

A small web app where two AI agents keep chatting with each other using the Chrome Prompt API.

## Development

```sh
npm install
npm run dev
```

This starts the Vite dev server. Open the shown localhost URL in Chrome.

## Build

```sh
npm run build
```

Build output is written to `dist/`.

## Requirements

- Chrome with Prompt API support
- An environment where the local Prompt API model is available
- Node.js 22 or newer is recommended

This app uses `LanguageModel`. To keep long conversations responsive, it periodically recreates the `LanguageModel` sessions and continues from the recent conversation log.

## Deploy

The GitHub Pages workflow is in `.github/workflows/deploy-pages.yml`.

In the repository settings, set the Pages source to `GitHub Actions`. Pushing to `main` will build and deploy `dist/` to GitHub Pages.
