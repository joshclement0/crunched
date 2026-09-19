export type CompanyRelationship = "invested" | "following";
export type CompanyEnrichmentStatus = "pending" | "complete" | "failed";

export interface CompanyEnrichment {
  website: string | null;
  description: string | null;
  sector: string | null;
  headquarters: string | null;
  foundedDate: string | null;
  founders: string[];
  teamSize: number | null;
  latestFundingRoundDate: string | null;
  latestFundingRoundAmount: string | null;
  latestFundingRoundType: string | null;
  totalFunding: string | null;
  valuation: string | null;
  businessModel: string | null;
  keyInvestors: string[];
  sources: string[];
}

export interface TrackedCompany {
  id: string;
  name: string;
  sector: string;
  relationship: CompanyRelationship;
  website?: string;
  pitchDeckUrl?: string;
  description?: string;
  headquarters?: string;
  foundedDate?: string;
  founders?: string[];
  teamSize?: number;
  latestFundingRoundDate?: string;
  latestFundingRoundAmount?: string;
  latestFundingRoundType?: string;
  totalFunding?: string;
  valuation?: string;
  businessModel?: string;
  keyInvestors?: string[];
  enrichmentSources?: string[];
  enrichmentStatus?: CompanyEnrichmentStatus;
  enrichmentError?: string;
  enrichedAt?: string;
  notes?: string;
  investedAmount?: string;
  nextReview?: string;
  createdAt: string;
}

export type CompanyDraft = Omit<TrackedCompany, "id" | "createdAt">;

export const EMPTY_COMPANY_DRAFT: CompanyDraft = {
  name: "",
  sector: "",
  relationship: "following",
  website: "",
  pitchDeckUrl: "",
  notes: "",
  investedAmount: "",
  nextReview: "",
};

export interface UserProfile {
  name: string;
  investmentThesis: string;
  sectors: string[];
  stages: string[];
  geographies: string[];
  companyQualities: string[];
  companies: TrackedCompany[];
}

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  investmentThesis: "",
  sectors: [],
  stages: [],
  geographies: [],
  companyQualities: [],
  companies: [],
};

export const SECTOR_OPTIONS = [
  "Climate & energy",
  "Fintech",
  "Health & biotech",
  "Enterprise software",
  "Consumer",
  "Industrial & manufacturing",
  "Mobility",
  "Food & agriculture",
  "Deep tech",
  "Media & creative",
];

export const STAGE_OPTIONS = ["Pre-seed", "Seed", "Series A", "Growth", "Public"];
export const GEOGRAPHY_OPTIONS = ["Nordics", "Europe", "North America", "Global"];
export const QUALITY_OPTIONS = [
  "Recurring revenue",
  "Capital efficient",
  "Founder-led",
  "Strong moat",
  "Positive impact",
  "Profitable",
];
