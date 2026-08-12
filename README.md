# Signal Agent — Agent #1

The first agent in the Gallegos agent operating system. It finds rising cultural,
category, and audience **signals** for a selected client, **scores** each on six
dimensions against that client's **Brand Brain**, and produces a **Weekly Signal
Report** for a human strategist to act on.

Built on the same proven stack as the earlier trend tool: a Node/Express server
holding the API keys, a static front end, live social data from EnsembleData
(TikTok + Instagram) and Scrape Creators (X), and OpenAI for scoring.

## The core idea: the Brand Brain
Every client is one JSON file in `brand-brains/`. The agent reads the selected
client's brain and grounds every signal in it — audience, category, competitors,
message pillars, banned language, and governance/do-not rules. This is what makes
the agent client-specific and reusable rather than hardwired to one brand.

- `brand-brains/gotmilk.json` — the got milk? Brand Brain (first client).
- `brand-brains/_template.json` — blank template. Copy it, rename to
  `yourclient.json`, fill it in, and the client appears in the dropdown automatically.
  Files starting with `_` are ignored.

## What it produces (matches the MVP acceptance criteria)
A Weekly Signal Report with: 5-8 ranked signals (what changed, why it matters,
recommended action, six 1-5 scores, overall fit, confidence, human-review flag,
platforms, evidence); an opportunity summary; content implications; risk flags;
source transparency; a version stamp (client, brain version, sprint, date); and a
branded export. The agent never gives final approval — it scores and flags; the
strategist decides.

## Deploy (same model as before)
1. Put this folder in a GitHub repo (keep public/, brand-brains/, src/ and all top files).
2. Host (Render → New → Web Service): Build `npm install`, Start `npm start`.
3. Env vars: OPENAI_API_KEY, ENSEMBLEDATA_TOKEN, SCRAPECREATORS_API_KEY. (Optional OPENAI_MODEL if you need a specific model name.)
4. Open the URL, pick a client, run a scan. Check /api/health (all three true).

## Adding a client
Copy `_template.json` to `<clientid>.json`, fill it in, commit, redeploy. It appears
in the dropdown automatically. The more complete the brain, the sharper the scoring.

## Where this sits
This is Signal Agent (#1). Its scored-signal output is designed to feed the next
agents (Insight, Brief, Content). The brand-brains/ format is the shared input layer
every future agent should read from — build them against the same files.

## Editing the UI later
The front end compiles from src/app.entry.jsx into public/app.js via esbuild. Edit
the source and rebuild — don't hand-edit the minified app.js.
