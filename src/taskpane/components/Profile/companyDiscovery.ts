import { CompanyDraft, SECTOR_OPTIONS } from "./types";

/* global URL */

export interface CompanySearchResult {
  name: string;
  domain: string;
  sector: (typeof SECTOR_OPTIONS)[number];
}

const COMPANY_DIRECTORY: CompanySearchResult[] = [
  { name: "Aiven", domain: "aiven.io", sector: "Enterprise software" },
  { name: "Kahoot!", domain: "kahoot.com", sector: "Consumer" },
  { name: "Klarna", domain: "klarna.com", sector: "Fintech" },
  { name: "Northvolt", domain: "northvolt.com", sector: "Climate & energy" },
  { name: "Oda", domain: "oda.com", sector: "Consumer" },
  { name: "Pleo", domain: "pleo.io", sector: "Fintech" },
  { name: "ReMarkable", domain: "remarkable.com", sector: "Consumer" },
  { name: "Supercell", domain: "supercell.com", sector: "Media & creative" },
  { name: "Tibber", domain: "tibber.com", sector: "Climate & energy" },
  { name: "Wolt", domain: "wolt.com", sector: "Consumer" },
];

export function searchCompanies(query: string): CompanySearchResult[] {
  const term = query.trim().toLocaleLowerCase();
  if (term.length < 2) return [];
  return COMPANY_DIRECTORY.filter(
    ({ name, domain }) =>
      name.toLocaleLowerCase().includes(term) || domain.toLocaleLowerCase().includes(term)
  ).slice(0, 5);
}

function normalizedUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.includes(".") && !trimmed.includes("/"))) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function nameFromUrl(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "");
  const domainName = host.split(".")[0].replace(/[-_]+/g, " ");
  return domainName.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function isLikelyPitchDeck(url: URL): boolean {
  const value = `${url.hostname}${url.pathname}`.toLocaleLowerCase();
  return (
    /\.(pdf|ppt|pptx)$/.test(url.pathname.toLocaleLowerCase()) ||
    ["docsend.com", "pitch.com", "slides.com", "docs.google.com"].some((host) =>
      url.hostname.toLocaleLowerCase().endsWith(host)
    ) ||
    /(^|[-_/])(deck|pitch)([-_/]|$)/.test(value)
  );
}

export function draftFromEntry(entry: string): Partial<CompanyDraft> {
  const url = normalizedUrl(entry);
  if (!url) return { name: entry.trim() };

  const href = url.toString();
  return isLikelyPitchDeck(url)
    ? { name: nameFromUrl(url), pitchDeckUrl: href }
    : { name: nameFromUrl(url), website: href };
}

export function draftFromSearchResult(result: CompanySearchResult): Partial<CompanyDraft> {
  return {
    name: result.name,
    sector: result.sector,
    website: `https://${result.domain}`,
  };
}
