import { createHash } from "node:crypto";

const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const GENERAL_QUERIES = [
  '(Norway OR Norwegian OR Nordic) startup (funding OR investment OR acquisition OR layoffs OR bankruptcy OR partnership) when:1d',
  '(norsk OR nordisk) (oppstart OR gründer OR vekstselskap) (emisjon OR investering OR oppkjøp OR konkurs OR partnerskap) when:1d',
];

const XML_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => XML_ENTITIES[name.toLowerCase()] || match);
}

function stripHtml(value = "") {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function stableId(...parts) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function safeDate(value, fallback) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function normaliseCompanies(companies, maximum) {
  const seen = new Set();
  return (Array.isArray(companies) ? companies : [])
    .map((company) => (typeof company === "string" ? { name: company } : company))
    .filter((company) => company && typeof company.name === "string" && company.name.trim())
    .map((company) => ({
      name: company.name.trim(),
      sector: typeof company.sector === "string" ? company.sector.trim() : "",
      website: typeof company.website === "string" ? company.website.trim() : "",
      relationship: company.relationship === "invested" ? "invested" : "following",
      notes: typeof company.notes === "string" ? company.notes.trim() : "",
    }))
    .filter((company) => {
      const key = company.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maximum);
}

function googleNewsRssUrl(query) {
  const params = new URLSearchParams({ q: query, hl: "en", gl: "NO", ceid: "NO:en" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export function parseGoogleNewsRss(xml, context = {}, now = new Date()) {
  const itemMatches = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  return itemMatches.map((item) => {
    const title = stripHtml(tagValue(item, "title"));
    const url = stripHtml(tagValue(item, "link"));
    const source = stripHtml(tagValue(item, "source")) || "Unknown source";
    const description = stripHtml(tagValue(item, "description"));
    const publishedAt = safeDate(tagValue(item, "pubDate"), now);
    return {
      id: stableId(title, url),
      sweep: context.sweep || "general",
      matchedCompanies: context.companyName ? [context.companyName] : [],
      title,
      url,
      source,
      publishedAt,
      snippet: description.slice(0, 600),
      mocked: false,
    };
  }).filter((article) => article.title && article.url);
}

function deduplicateArticles(articles) {
  const unique = new Map();
  articles.forEach((article) => {
    const key = article.title.toLowerCase().replace(/[^a-z0-9æøå]+/gi, " ").trim();
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, article);
      return;
    }
    const matchedCompanies = [...new Set([...existing.matchedCompanies, ...article.matchedCompanies])];
    unique.set(key, {
      ...existing,
      sweep: matchedCompanies.length ? "targeted" : existing.sweep,
      matchedCompanies,
    });
  });
  return [...unique.values()];
}

async function fetchText(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/rss+xml, application/xml, text/xml",
        "user-agent": "InvestorRadarDailyScrub/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function classifyArticle(article) {
  const text = `${article.title} ${article.snippet}`.toLowerCase();
  const rules = [
    ["Distress", /bankrupt|bankruptcy|insolven|konkurs|shutdown|shuts down|closure/],
    ["Workforce", /layoff|job cut|downsizing|permitter|nedbemann/],
    ["Funding", /funding|raises?|round|investment|emisjon|kapital/],
    ["M&A", /acqui|merger|oppkjøp|fusjon/],
    ["Leadership", /ceo|founder|leder|executive|resigns?|steps down/],
    ["Product", /launch|product|platform|lanser/],
    ["Partnership", /partner|contract|avtale|samarbeid/],
    ["Regulatory", /regulat|approval|fine|lawsuit|tilsyn|godkjenn/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || "Market";
}

function heuristicEnrichment(article, followedCompanies) {
  const category = classifyArticle(article);
  const negative = ["Distress", "Workforce", "Regulatory", "Leadership"].includes(category);
  const positive = ["Funding", "M&A", "Product", "Partnership"].includes(category);
  const targeted = article.sweep === "targeted";
  const company = followedCompanies.find((candidate) => article.matchedCompanies.includes(candidate.name));
  const relationshipBoost = company?.relationship === "invested" ? 12 : 5;
  return {
    ...article,
    summary: article.snippet || article.title,
    category,
    impact: negative ? "negative" : positive ? "positive" : "neutral",
    relevanceScore: Math.min(100, 40 + (targeted ? 30 : 0) + relationshipBoost),
    riskSignals: negative ? [category] : [],
    whyItMatters: targeted
      ? `This directly mentions ${article.matchedCompanies.join(", ")}, a tracked company.`
      : "This may affect the Norwegian startup market or comparable-company conditions.",
  };
}

function parseJsonObject(text) {
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain a JSON object");
  return JSON.parse(unfenced.slice(start, end + 1));
}

async function enrichWithAnthropic({ articles, followedCompanies, apiKey, aiModel, fetchImpl, timeoutMs }) {
  const inputArticles = articles.slice(0, 35).map((article) => ({
    id: article.id,
    sweep: article.sweep,
    matchedCompanies: article.matchedCompanies,
    title: article.title,
    source: article.source,
    publishedAt: article.publishedAt,
    snippet: article.snippet,
  }));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 4000,
        temperature: 0,
        system: "You are an evidence-focused Nordic venture-capital analyst. Never invent facts beyond the supplied article metadata.",
        messages: [{
          role: "user",
          content: `Rank and annotate these startup news candidates for an investor. Return JSON only, in this exact shape: {"articles":[{"id":"existing id","summary":"one sentence","category":"Funding|M&A|Distress|Workforce|Leadership|Product|Partnership|Regulatory|Market","impact":"positive|negative|neutral|mixed","relevanceScore":0,"riskSignals":["short signal"],"whyItMatters":"one sentence"}]}. Include every supplied id exactly once. Give tracked portfolio companies higher relevance, but do not treat an unverified headline as confirmed fact.\n\nTracked companies:\n${JSON.stringify(followedCompanies)}\n\nCandidates:\n${JSON.stringify(inputArticles)}`,
        }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`Anthropic API returned HTTP ${response.status}`);
  const payload = await response.json();
  const text = Array.isArray(payload.content)
    ? payload.content.filter((block) => block.type === "text").map((block) => block.text).join("\n")
    : "";
  const parsed = parseJsonObject(text);
  const annotations = new Map(
    (Array.isArray(parsed.articles) ? parsed.articles : []).map((annotation) => [annotation.id, annotation])
  );
  return articles.map((article) => {
    const fallback = heuristicEnrichment(article, followedCompanies);
    const annotation = annotations.get(article.id);
    if (!annotation) return fallback;
    const score = Number(annotation.relevanceScore);
    return {
      ...fallback,
      summary: typeof annotation.summary === "string" ? annotation.summary : fallback.summary,
      category: typeof annotation.category === "string" ? annotation.category : fallback.category,
      impact: ["positive", "negative", "neutral", "mixed"].includes(annotation.impact) ? annotation.impact : fallback.impact,
      relevanceScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback.relevanceScore,
      riskSignals: Array.isArray(annotation.riskSignals)
        ? annotation.riskSignals.filter((signal) => typeof signal === "string").slice(0, 5)
        : fallback.riskSignals,
      whyItMatters: typeof annotation.whyItMatters === "string" ? annotation.whyItMatters : fallback.whyItMatters,
    };
  });
}

export function createMockArticles(now = new Date()) {
  const hour = 60 * 60 * 1000;
  const definitions = [
    {
      company: "FjordGrid",
      hoursAgo: 2,
      title: "MOCK: FjordGrid opens bridge round after delayed utility rollout",
      category: "Funding",
      impact: "mixed",
      score: 94,
      risks: ["Funding gap", "Commercial delay"],
      summary: "Synthetic example: FjordGrid is seeking NOK 18 million after a pilot rollout moved into the next quarter.",
    },
    {
      company: "ClinicaFlow",
      hoursAgo: 5,
      title: "MOCK: ClinicaFlow receives approval for expanded nursing-home pilot",
      category: "Regulatory",
      impact: "positive",
      score: 89,
      risks: [],
      summary: "Synthetic example: ClinicaFlow can expand its care-workflow pilot from two to eight Norwegian nursing homes.",
    },
    {
      company: "AtlasPay",
      hoursAgo: 9,
      title: "MOCK: AtlasPay reports attempted credential attack with no customer loss",
      category: "Regulatory",
      impact: "negative",
      score: 87,
      risks: ["Security incident", "Regulatory follow-up"],
      summary: "Synthetic example: AtlasPay contained an attempted credential attack and started a third-party review.",
    },
    {
      company: "Nordic startup market",
      hoursAgo: 12,
      title: "MOCK: Norwegian seed funding activity rises while round sizes remain flat",
      category: "Market",
      impact: "neutral",
      score: 72,
      risks: ["Longer fundraising cycles"],
      summary: "Synthetic example: More seed rounds were announced, but median cheque sizes and time-to-close were unchanged.",
    },
  ];
  return definitions.map((definition, index) => ({
    id: `mock-${index + 1}`,
    sweep: definition.company === "Nordic startup market" ? "general" : "targeted",
    matchedCompanies: definition.company === "Nordic startup market" ? [] : [definition.company],
    title: definition.title,
    url: `https://example.com/mock-startup-news-${index + 1}`,
    source: "Synthetic demo data",
    publishedAt: new Date(now.getTime() - definition.hoursAgo * hour).toISOString(),
    snippet: definition.summary,
    summary: definition.summary,
    category: definition.category,
    impact: definition.impact,
    relevanceScore: definition.score,
    riskSignals: definition.risks,
    whyItMatters: "Mocked investor signal for demonstrating the add-in workflow.",
    mocked: true,
  }));
}

/**
 * Runs one startup-news sweep. Call this function once per day from a trusted
 * backend scheduler. API_KEY is read only at runtime and must never be bundled
 * into the Excel task pane.
 */
export async function runDailyStartupScrub(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  const maximumCompanies = options.maximumCompanies ?? 12;
  const followedCompanies = normaliseCompanies(options.followedCompanies, maximumCompanies);
  const timeoutMs = options.timeoutMs ?? 12_000;
  const apiKey = options.apiKey ?? process.env.API_KEY;
  const aiModel = options.aiModel || process.env.AI_MODEL || DEFAULT_AI_MODEL;
  const warnings = [];

  const searches = [
    ...GENERAL_QUERIES.map((query) => ({ query, sweep: "general" })),
    ...followedCompanies.map((company) => ({
      query: `"${company.name}" (${company.sector || "startup"}) when:2d`,
      sweep: "targeted",
      companyName: company.name,
    })),
  ];

  const batches = await Promise.all(searches.map(async (search) => {
    try {
      const xml = await fetchText(googleNewsRssUrl(search.query), fetchImpl, timeoutMs);
      return parseGoogleNewsRss(xml, search, now).slice(0, options.maximumArticlesPerSearch ?? 8);
    } catch (error) {
      warnings.push(`${search.sweep} search failed${search.companyName ? ` for ${search.companyName}` : ""}: ${error.message}`);
      return [];
    }
  }));

  const discovered = deduplicateArticles(batches.flat());
  let enriched = discovered.map((article) => heuristicEnrichment(article, followedCompanies));
  let aiStatus = "not_configured";

  if (apiKey && discovered.length) {
    try {
      enriched = await enrichWithAnthropic({ articles: discovered, followedCompanies, apiKey, aiModel, fetchImpl, timeoutMs });
      aiStatus = "used";
    } catch (error) {
      aiStatus = "fallback";
      warnings.push(`AI enrichment failed; heuristic scoring was used: ${error.message}`);
    }
  } else if (!apiKey) {
    warnings.push("API_KEY is not set; heuristic scoring was used.");
  }

  enriched.sort((left, right) => right.relevanceScore - left.relevanceScore || right.publishedAt.localeCompare(left.publishedAt));
  const mockedArticles = options.includeMockedData === false ? [] : createMockArticles(now);
  const liveLimit = options.maximumReturnedArticles ?? 20;
  const liveArticles = enriched.slice(0, liveLimit);

  return {
    runId: stableId(now.toISOString().slice(0, 10), followedCompanies.map((company) => company.name).join(",")),
    runDate: now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    cadence: "daily",
    region: "Norway and the Nordics",
    sourceMode: liveArticles.length ? (aiStatus === "used" ? "live_with_ai" : "live_with_heuristics") : "mock_only",
    ai: { status: aiStatus, model: aiStatus === "used" ? aiModel : null },
    followedCompanies,
    summary: {
      searchedFeeds: searches.length,
      liveArticles: liveArticles.length,
      generalArticles: liveArticles.filter((article) => article.sweep === "general").length,
      targetedArticles: liveArticles.filter((article) => article.sweep === "targeted").length,
      mockedArticles: mockedArticles.length,
      highPriorityArticles: liveArticles.filter((article) => article.relevanceScore >= 80).length,
    },
    articles: liveArticles,
    generalSweep: liveArticles.filter((article) => article.sweep === "general"),
    targetedSweep: liveArticles.filter((article) => article.sweep === "targeted"),
    mockedArticles,
    warnings,
  };
}
