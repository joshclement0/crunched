const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001";

function parseJsonObject(text) {
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Research response did not contain JSON");
  return JSON.parse(unfenced.slice(start, end + 1));
}

function nullableText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function validUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normaliseResult(result, searchedSources) {
  const resultSources = Array.isArray(result.sources) ? result.sources.map(validUrl).filter(Boolean) : [];
  return {
    website: validUrl(result.website),
    description: nullableText(result.description),
    sector: nullableText(result.sector),
    headquarters: nullableText(result.headquarters),
    foundedDate: nullableText(result.foundedDate),
    founders: Array.isArray(result.founders)
      ? result.founders.map(nullableText).filter(Boolean).slice(0, 12)
      : [],
    teamSize: nullableCount(result.teamSize),
    latestFundingRoundDate: nullableText(result.latestFundingRoundDate),
    latestFundingRoundAmount: nullableText(result.latestFundingRoundAmount),
    latestFundingRoundType: nullableText(result.latestFundingRoundType),
    totalFunding: nullableText(result.totalFunding),
    valuation: nullableText(result.valuation),
    businessModel: nullableText(result.businessModel),
    keyInvestors: Array.isArray(result.keyInvestors)
      ? result.keyInvestors.map(nullableText).filter(Boolean).slice(0, 15)
      : [],
    sources: [...new Set([...resultSources, ...searchedSources])].slice(0, 12),
  };
}

function responseText(content) {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

function searchedUrls(content) {
  return content.flatMap((block) => {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) return [];
    return block.content.map((result) => validUrl(result.url)).filter(Boolean);
  });
}

/** Researches one company and returns only evidence-backed, normalized fields. */
export async function enrichCompany(options = {}) {
  const name = typeof options.name === "string" ? options.name.trim() : "";
  if (!name) throw new Error("Company name is required");

  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not configured on the server");

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);
  const messages = [{
    role: "user",
    content: `Research the company named ${JSON.stringify(name)}${options.website ? ` with the supplied website ${JSON.stringify(options.website)}` : ""}. Identify the exact company before reporting facts. Search the live web and prefer the company website, regulatory filings, investor announcements, and reputable business databases or news sources. Use the most recent credible source for team size and funding. If a fact cannot be verified, return null; never estimate or invent it. Dates should use YYYY-MM-DD when a full date is known, otherwise YYYY or YYYY-MM. Funding and valuation amounts must include currency and retain qualifiers such as approximately or undisclosed. Return JSON only with exactly these keys: {"website":null,"description":null,"sector":null,"headquarters":null,"foundedDate":null,"founders":[],"teamSize":null,"latestFundingRoundDate":null,"latestFundingRoundAmount":null,"latestFundingRoundType":null,"totalFunding":null,"valuation":null,"businessModel":null,"keyInvestors":[],"sources":[]}. Sources must contain the URLs supporting the returned facts.`,
  }];

  try {
    let payload;
    const searchedSources = [];
    for (let turn = 0; turn < 3; turn += 1) {
      const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
        method: "POST",
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          model: options.aiModel || process.env.AI_MODEL || DEFAULT_AI_MODEL,
          max_tokens: 3000,
          temperature: 0,
          system: "You are a meticulous venture research analyst. Use web search for current facts. Resolve identity ambiguity and never fill a field without evidence.",
          tools: [{
            type: "web_search_20250305",
            name: "web_search",
            max_uses: options.maximumSearches ?? 6,
            user_location: { type: "approximate", country: "NO", timezone: "Europe/Oslo" },
          }],
          messages,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Anthropic API returned HTTP ${response.status}`);
      payload = await response.json();
      const content = Array.isArray(payload.content) ? payload.content : [];
      searchedSources.push(...searchedUrls(content));
      if (payload.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content });
      messages.push({ role: "user", content: "Continue the research and return the requested JSON." });
    }

    const result = parseJsonObject(responseText(Array.isArray(payload?.content) ? payload.content : []));
    return normaliseResult(result, searchedSources);
  } finally {
    clearTimeout(timer);
  }
}
