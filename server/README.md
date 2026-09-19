# Daily startup news scrub

`runDailyStartupScrub` is server-side code for the investor demo. It performs:

1. a broad English and Norwegian sweep of Norwegian/Nordic startup news;
2. a targeted sweep for each company from the user's portfolio/watchlist;
3. AI ranking and investor-focused annotation through Anthropic using `API_KEY`;
4. a clearly marked mocked dataset that is always returned for the demo.

The public news discovery source is Google News RSS. The AI sees only article metadata and is instructed not to invent facts. If a feed or the AI call fails, the result contains warnings and falls back to heuristic scoring or mock-only mode.

## Run it

Use Node 18 or newer. Set environment variables in the server or scheduler process, not in the Excel task pane:

```powershell
$env:API_KEY = "your-anthropic-key"
$env:FOLLOWED_COMPANIES = '[{"name":"FjordGrid","sector":"Climate & energy","relationship":"invested"}]'
npm run news:scrub
```

The command prints a JSON result containing `generalSweep`, `targetedSweep`, and `mockedArticles`. The tracked-company objects match the add-in's existing `TrackedCompany` shape, so the backend can receive `profile.companies` directly.

## Schedule it once a day

Call `npm run news:scrub` from the deployment platform's daily scheduler (for example, at 06:00 Europe/Oslo). Scheduling belongs on the backend: a browser-based Excel add-in may be closed and must not contain `API_KEY`.

For a long-running backend, import and call the function directly:

```js
import { runDailyStartupScrub } from "./server/dailyStartupScrub.mjs";

const update = await runDailyStartupScrub({
  followedCompanies: profile.companies,
});
```

Persist `update.runDate` as the daily idempotency key if the scheduler might retry. Store or return the result from an authenticated backend endpoint for the Excel add-in.

## Automatic company research

When the development server is running, `POST /api/enrich-company` accepts a company name and
optional website. The server uses Anthropic's live web-search tool to find evidence-backed company
facts and returns `null` for fields it cannot verify. The API key remains server-side.

The task pane automatically calls this endpoint for companies that have not been researched. It
fills only missing values, retains the URLs used as research sources, and writes the expanded data
to the `Companies` worksheet. Failed searches show a **Try again** action on the company card.

Run the focused tests with:

```powershell
npm run test:company-enrichment
```

Production deployments must expose the same endpoint from their authenticated backend; the
webpack development middleware is intended for local Office add-in development only.
