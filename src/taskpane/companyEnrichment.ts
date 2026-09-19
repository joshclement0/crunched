import * as React from "react";
import { CompanyEnrichment, TrackedCompany } from "./components/Profile/types";

/* global fetch */

type CompanyUpdater = (company: TrackedCompany) => TrackedCompany;

async function requestCompanyEnrichment(company: TrackedCompany): Promise<CompanyEnrichment> {
  const response = await fetch("/api/enrich-company", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: company.name, website: company.website }),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || `Research failed with HTTP ${response.status}`);
  return payload as CompanyEnrichment;
}

function withMissingFields(company: TrackedCompany, result: CompanyEnrichment): TrackedCompany {
  const missing = (value: string | undefined) => !value || value === "Other";
  return {
    ...company,
    website: company.website || result.website || "",
    description: company.description || result.description || "",
    sector: missing(company.sector) ? result.sector || company.sector : company.sector,
    headquarters: company.headquarters || result.headquarters || "",
    foundedDate: company.foundedDate || result.foundedDate || "",
    founders: company.founders?.length ? company.founders : result.founders,
    teamSize: company.teamSize ?? result.teamSize ?? undefined,
    latestFundingRoundDate: company.latestFundingRoundDate || result.latestFundingRoundDate || "",
    latestFundingRoundAmount:
      company.latestFundingRoundAmount || result.latestFundingRoundAmount || "",
    latestFundingRoundType: company.latestFundingRoundType || result.latestFundingRoundType || "",
    totalFunding: company.totalFunding || result.totalFunding || "",
    valuation: company.valuation || result.valuation || "",
    businessModel: company.businessModel || result.businessModel || "",
    keyInvestors: company.keyInvestors?.length ? company.keyInvestors : result.keyInvestors,
    enrichmentSources: result.sources,
    enrichmentStatus: "complete",
    enrichmentError: "",
    enrichedAt: new Date().toISOString(),
  };
}

export function useCompanyEnrichment(
  companies: TrackedCompany[],
  onUpdate: (id: string, updater: CompanyUpdater) => void
) {
  const inFlight = React.useRef(new Set<string>());

  const enrich = React.useCallback(
    async (company: TrackedCompany) => {
      if (inFlight.current.has(company.id)) return;
      inFlight.current.add(company.id);
      onUpdate(company.id, (current) => ({
        ...current,
        enrichmentStatus: "pending",
        enrichmentError: "",
      }));

      try {
        const result = await requestCompanyEnrichment(company);
        onUpdate(company.id, (current) => withMissingFields(current, result));
      } catch (error) {
        onUpdate(company.id, (current) => ({
          ...current,
          enrichmentStatus: "failed",
          enrichmentError: error instanceof Error ? error.message : "Company research failed",
        }));
      } finally {
        inFlight.current.delete(company.id);
      }
    },
    [onUpdate]
  );

  React.useEffect(() => {
    const company = companies.find((candidate) => !candidate.enrichmentStatus);
    if (company) void enrich(company);
  }, [companies, enrich]);

  const retry = React.useCallback(
    (id: string) => {
      const company = companies.find((candidate) => candidate.id === id);
      if (company) void enrich(company);
    },
    [companies, enrich]
  );

  return { retry };
}
