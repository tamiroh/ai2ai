# AI2AI

A small web app where two AI agents keep chatting with each other using the Chrome Prompt API.

## Requirements

- Chrome with Prompt API support
- An environment where the local Prompt API model is available
- Node.js 22 or newer is recommended

This app uses `LanguageModel`. To keep long conversations responsive, it periodically recreates the `LanguageModel` sessions and continues from the recent conversation log.
