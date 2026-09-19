# Investment Radar for Excel

Investment Radar is an Excel task-pane add-in for private investors who want to keep their investment thesis, portfolio, watchlist, company research, and market signals close to the workbook where they already work.

The prototype combines a structured investor workspace with a workbook-aware AI chat. It can discover existing company data, create and maintain a small set of managed worksheets, research tracked companies, scan startup news, and let the user ask an agent to inspect or update the active workbook through a deliberately limited set of Excel tools. Users can also attach specific ranges to a conversation, making the workbook context visible before any data is sent to the model.

## What I built

- An investor profile for sectors, stages, geographies, company qualities, radar companies, and signals.
- Portfolio and watchlist management, including investment notes, review dates, pitch-deck links, and manually recorded events.
- Automatic `Overview`, `Companies`, and `Events` worksheets, kept in sync with the task pane.
- A simple attention score that prioritises companies using event impact and overdue review dates.
- Server-side company enrichment using Anthropic web search, with source URLs retained alongside the result.
- A Norwegian/Nordic startup-news sweep using Google News RSS, followed by AI ranking and investor-focused classification.
- A workbook-aware chat agent that can list worksheets, inspect used ranges, read bounded ranges, write ranges, and create worksheets.
- Explicit workbook-range attachments with a preview of the values that will be sent to the model.
- Multiple locally saved conversations, with titles derived from each conversation's first prompt.
- Request size limits, range limits, tool-round limits, and correlated client/server logging around the agent flow.
- Focused Node tests for agent validation and continuation, selected-range context, company enrichment, and the news scrub.

## Latest work in progress

The most recent work has focused on making the chat useful for real workbooks without sending more data than the task needs.

- The user can select a range in Excel, attach it to the next message, inspect its address, dimensions, and cell values, and remove it before sending.
- A single attachment is limited to 1,000 cells. A request can contain up to 10 ranges and 5,000 attached cells in total.
- Attached ranges are validated again on the server and treated as untrusted workbook data rather than instructions.
- Workbook metadata is sent first so the agent can reason about sheet names and used-range dimensions before deciding whether it needs additional reads.
- Independent read operations can be requested together, while dependent reads and writes remain sequential across tool rounds.
- Range reads are bounded by both cell count and serialized payload size, with clearer errors that ask the user or agent to narrow the request.
- The client and local API now share request IDs and log payload size, elapsed time, response status, and requested tool names. This makes failures across the browser, local server, model call, and Excel execution much easier to trace.
- The chat history now supports separate conversations and migrates the earlier single-conversation local-storage format.

The range-attachment flow is working, but automatic context selection is still deliberately limited. The next iteration would use workbook metadata, table headers, formulas, and a lightweight preview to identify the most relevant ranges before sending values to the main model.

## Running the project

### Prerequisites

- Windows or macOS with desktop Excel and a Microsoft 365 account
- Node.js 18 or newer
- An Anthropic API key for chat, live company research, and AI-ranked news results

The workbook workspace and manual company/event features still work if the external research calls fail. An API key is required for the chat agent.

### 1. Install dependencies

```powershell
npm install
```

### 2. Configure the local server

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Set your key in `.env`:

```dotenv
API_KEY=your_anthropic_api_key
```

`AI_MODEL`, `ANTHROPIC_AGENT_MODEL`, and `FOLLOWED_COMPANIES` are optional. The key is read only by the local server middleware and is not bundled into the task pane.

### 3. Start and sideload the add-in

```powershell
npm start
```

The Office add-in tooling creates or trusts a local HTTPS development certificate, starts the webpack development server at `https://localhost:3000`, opens Excel, and sideloads `manifest.xml`. In Excel, open the **Home** tab and select **Show Task Pane** if the pane is not already visible.

To stop the debugging session:

```powershell
npm stop
```

If automatic sideloading is unavailable in the local Office setup, run `npm run dev-server` and sideload `manifest.xml` using the normal Office add-in flow.

## Using the prototype

1. Open the task pane in any workbook. The add-in scans existing sheets for recognisable company and preference columns.
2. On first use, it creates or refreshes `Overview`, `Companies`, and `Events`.
3. Add portfolio or watchlist companies in the **Companies** tab. Missing company details are researched in the background and can be retried from the company card.
4. Add events manually or let the startup-signal scan add relevant news when the pane starts.
5. In **Chat**, select a useful range in Excel and choose **Add selection**. The attached address, dimensions, and captured values are shown before sending.
6. Ask about the attached data or request a targeted workbook change. The agent can use the attached snapshot directly and request other bounded ranges through the defined Excel tools when needed.

Attached values are a snapshot taken when **Add selection** is pressed; select and add the range again if its cells have changed. Attachments are cleared after a successful response, when starting a new conversation, or when switching conversations.

Changes made directly in the managed `Companies` and `Events` sheets are polled back into the task pane. Profile state and separate chat conversations are also stored in local browser storage for the prototype.

## Project structure

```text
src/taskpane/
  components/          Focused React views for profile, companies, and chat
  chat/                Conversations, selected-range state, API client, and agent loop
  excel/               Validated Excel tools and selected-range capture
  workbookModel.ts     Workbook discovery, scoring, parsing, and sheet sync
  useWorkbookWorkspace.ts
                       React lifecycle around workbook synchronisation
server/
  excelAgent.mjs       Anthropic tool-use boundary and input validation
  companyEnrichment.mjs
                       Evidence-backed company research
  dailyStartupScrub.mjs
                       RSS discovery, ranking, fallbacks, and demo data
webpack.config.js      Frontend build plus local development API routes
manifest.xml           Excel add-in manifest
```

I kept the page-level components thin and moved workbook operations, agent orchestration, persistence, range selection, and server integrations into focused modules. The AI cannot execute arbitrary Office code: the server exposes a small tool schema, validates model-generated arguments, and returns tool requests to the client. The client validates them again, and the Excel layer enforces bounded ranges, payload sizes, value shapes, and worksheet names before doing any work.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the development server and sideload the add-in |
| `npm stop` | Stop the Office debugging session |
| `npm run build` | Create a production webpack build |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint` | Run the Office add-in lint rules |
| `npm run validate` | Validate `manifest.xml` |
| `npm run test:agent` | Test agent validation and tool continuation |
| `npm run test:company-enrichment` | Test company-research parsing and fallbacks |
| `npm run test:news-scrub` | Test news discovery, ranking, and fallback behavior |
| `npm run news:scrub` | Run the news pipeline directly and print JSON |

## My process and general thoughts

My first instinct was to find a workbook I could work from, so I created a collection of Norwegian startup data. That quickly pulled me toward the problem I wanted the product to solve: helping a private investor understand which companies need attention and why.

That product-first instinct was useful, but it also led me too far into designing the data model before I had proved the core interaction. I built the investment profile, company tracking, workbook synchronisation, enrichment, and news automation, then realised the chat experience had become secondary. I went back to the requirements and reframed the existing functionality as tools the chat agent could use rather than as a separate product competing with it.

The result is a hybrid. The structured interface is useful for information that should be consistent and easy to scan; chat is useful when the user does not know exactly where something lives or wants to make a change in plain language. I would not replace the visible Excel workflow with chat alone. I would use the agent as another way into the same underlying model, with explicit tools and observable workbook changes.

The next problem was context. Sending an entire workbook would be expensive, slow, and difficult for a user to reason about. Relying entirely on an agent to discover the right cells also creates unnecessary tool calls. I introduced explicit range attachments as a practical middle ground: the user can show the agent the data they mean, see exactly what is attached, and still let the agent inspect other bounded ranges when the question requires it. I also added limits and request tracing because the failure modes in an Office add-in cross several boundaries and are otherwise difficult to diagnose.

With limited time, I prioritised a complete vertical slice and safe boundaries over a broad set of loosely connected AI features. In particular:

- API keys and model calls stay server-side.
- Workbook access is explicit, validated, range-bounded, and visible to the user when data is attached.
- News and company research preserve source links and degrade without blocking the core workbook flow.
- Components, hooks, domain logic, and integrations are separated so each part can be tested or replaced independently.
- The prototype keeps both the task pane and workbook usable when an external service is unavailable.

## Tradeoffs and next steps

This is a prototype, not a production deployment. The three API routes currently live in webpack's development middleware, local storage is used for task-pane state and chat conversations, and the news scan runs when the pane opens rather than from a durable scheduler. The managed sheets are also refreshed as whole views, which is simple and predictable for a small workbook but would need a more targeted update strategy at scale.

Given more time, I would:

1. Build automatic context routing on top of the current manual attachments. I would send sheet names, used-range metadata, table headers, and a small structural preview to a lightweight model or deterministic selector, then fetch only the ranges most likely to answer the question.
2. Move the agent, enrichment, and news routes into an authenticated backend and store secrets in a managed secret store.
3. Make the workbook the durable source of truth or add a small database with clear conflict handling, instead of combining workbook state with local storage.
4. Schedule news ingestion independently of Excel, deduplicate and persist source articles, and show when each signal was last refreshed.
5. Add confirmation and an audit trail for higher-impact agent writes, plus richer formatting and formula tools.
6. Add React and Office.js integration tests around range capture, workbook discovery, two-way sync, and the complete chat-to-tool loop.
7. Add conversation rename/delete controls and a retention strategy so local chat history does not grow indefinitely.
8. Finish the product details in the manifest, including the name, icons, support URL, and production host.

The main lesson from the exercise was to validate the required interaction earlier. The underlying investor workflow gave the chat something meaningful to work with, but I would start the next iteration from one or two representative user conversations and let those drive the data model and tool surface.

## Daily news scrub

The news pipeline can also be run independently for a scheduled backend job:

```powershell
$env:API_KEY = "your-anthropic-key"
$env:FOLLOWED_COMPANIES = '[{"name":"FjordGrid","sector":"Climate & energy","relationship":"invested"}]'
npm run news:scrub
```

It returns a JSON result with the general sweep, company-targeted sweep, ranked articles, warnings, and clearly marked deterministic demo articles. A production scheduler should call `runDailyStartupScrub` once a day, persist `runDate` as an idempotency key, and expose the stored result through an authenticated endpoint rather than relying on the add-in being open.
