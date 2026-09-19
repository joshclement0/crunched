import assert from "node:assert/strict";
import test from "node:test";
import { createMockArticles, parseGoogleNewsRss, runDailyStartupScrub } from "./dailyStartupScrub.mjs";

const NOW = new Date("2026-09-19T08:00:00.000Z");

function rss(items) {
  return `<?xml version="1.0"?><rss><channel>${items.map((item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.url}</link>
      <pubDate>${item.date || "Sat, 19 Sep 2026 06:00:00 GMT"}</pubDate>
      <description><![CDATA[<p>${item.description || item.title}</p>]]></description>
      <source>${item.source || "Test News"}</source>
    </item>`).join("")}</channel></rss>`;
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

test("parseGoogleNewsRss extracts normalized article records", () => {
  const articles = parseGoogleNewsRss(rss([{
    title: "FjordGrid raises NOK 20m &amp; signs utility pilot",
    url: "https://news.example/fjordgrid",
    description: "Funding and commercial update",
  }]), { sweep: "targeted", companyName: "FjordGrid" }, NOW);

  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "FjordGrid raises NOK 20m & signs utility pilot");
  assert.deepEqual(articles[0].matchedCompanies, ["FjordGrid"]);
  assert.equal(articles[0].mocked, false);
});

test("daily scrub combines general, targeted, AI-ranked, and mocked results", async () => {
  let aiCalled = false;
  const fetchImpl = async (url) => {
    const requestedUrl = String(url);
    if (requestedUrl.includes("api.anthropic.com")) {
      aiCalled = true;
      return response(JSON.stringify({
        content: [{
          type: "text",
          text: JSON.stringify({
            articles: [
              { id: "unknown-id", summary: "Ignored", category: "Market", impact: "neutral", relevanceScore: 1, riskSignals: [], whyItMatters: "Ignored" },
            ],
          }),
        }],
      }));
    }
    const targeted = decodeURIComponent(requestedUrl).includes("FjordGrid");
    return response(rss([{
      title: targeted ? "FjordGrid bridge round announced" : "Norwegian startup funding increases",
      url: targeted ? "https://news.example/fjordgrid-round" : "https://news.example/norway-funding",
    }]));
  };

  const result = await runDailyStartupScrub({
    followedCompanies: [{ name: "FjordGrid", sector: "Climate & energy", relationship: "invested" }],
    apiKey: "test-key",
    fetchImpl,
    now: NOW,
  });

  assert.equal(aiCalled, true);
  assert.equal(result.ai.status, "used");
  assert.equal(result.generalSweep.length, 1);
  assert.equal(result.targetedSweep.length, 1);
  assert.equal(result.mockedArticles.length, 4);
  assert.ok(result.mockedArticles.every((article) => article.mocked));
});

test("daily scrub degrades to mocked data when feeds are unavailable", async () => {
  const result = await runDailyStartupScrub({
    followedCompanies: ["FjordGrid"],
    apiKey: "",
    fetchImpl: async () => response("Unavailable", 503),
    now: NOW,
  });

  assert.equal(result.sourceMode, "mock_only");
  assert.equal(result.articles.length, 0);
  assert.equal(result.mockedArticles.length, 4);
  assert.ok(result.warnings.length >= 2);
});

test("mock data is deterministic for a given date", () => {
  assert.deepEqual(createMockArticles(NOW), createMockArticles(NOW));
});
