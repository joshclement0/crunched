export type CompanyRelationship = "invested" | "following";

export interface TrackedCompany {
  id: string;
  name: string;
  sector: string;
  relationship: CompanyRelationship;
  website?: string;
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
