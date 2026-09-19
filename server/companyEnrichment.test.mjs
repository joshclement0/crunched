import assert from "node:assert/strict";
import test from "node:test";
import { enrichCompany } from "./companyEnrichment.mjs";

test("requires a company name", async () => {
  await assert.rejects(() => enrichCompany({ apiKey: "test", name: "" }), /Company name/);
});

test("leaves an unverified team size empty", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ teamSize: null }) }],
    }),
  });
  const result = await enrichCompany({ apiKey: "test", fetchImpl, name: "Unknown" });
  assert.equal(result.teamSize, null);
});

test("normalizes researched company data and retains search sources", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      stop_reason: "end_turn",
      content: [
        {
          type: "web_search_tool_result",
          content: [{ type: "web_search_result", url: "https://example.com/funding" }],
        },
        {
          type: "text",
          text: JSON.stringify({
            website: "https://example.com",
            description: "Enterprise software company.",
            sector: "Enterprise software",
            headquarters: "Oslo, Norway",
            foundedDate: "2020",
            founders: ["Ada Founder"],
            teamSize: "42",
            latestFundingRoundDate: "2026-01-10",
            latestFundingRoundAmount: "NOK 100 million",
            latestFundingRoundType: "Series A",
            totalFunding: null,
            valuation: null,
            businessModel: "B2B SaaS",
            keyInvestors: ["Example Ventures"],
            sources: ["invalid", "https://example.com/about"],
          }),
        },
      ],
    }),
  });

  const result = await enrichCompany({ apiKey: "test", fetchImpl, name: "Example" });
  assert.equal(result.teamSize, 42);
  assert.equal(result.latestFundingRoundAmount, "NOK 100 million");
  assert.deepEqual(result.sources, [
    "https://example.com/about",
    "https://example.com/funding",
  ]);
});
