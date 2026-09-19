import {
  CompanyEvent,
  SignalImpact,
  TrackedCompany,
  UserProfile,
} from "./components/Profile/types";

/* global Excel, Office */

const OVERVIEW_SHEET = "Overview";
const COMPANIES_SHEET = "Companies";
const EVENTS_SHEET = "Events";

const COMPANY_HEADERS = [
  "Company",
  "Relationship",
  "Sector",
  "Attention score",
  "Latest signal",
  "Last event",
  "Amount invested",
  "Next review",
  "Notes",
  "Added",
  "Website",
  "Pitch deck",
];
const EVENT_HEADERS = [
  "Date",
  "Company",
  "Event",
  "Details",
  "Signal",
  "Impact",
  "Information location",
  "Added",
];
const OVERVIEW_HEADERS = [
  "Priority",
  "Company",
  "Status",
  "Sector",
  "Attention score",
  "Latest signal",
  "Why it needs attention",
];

type Cell = string | number | boolean;
type SheetData = { name: string; values: Cell[][] };

const clean = (value: unknown) => String(value ?? "").trim();
const normalized = (value: unknown) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const idFor = (prefix: string, value: string) => {
  const slug = normalized(value).replace(/ /g, "-").slice(0, 42) || "row";
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return `${prefix}-${slug}-${Math.abs(hash).toString(36)}`;
};

function indexOfHeader(headers: Cell[], aliases: string[]) {
  const options = aliases.map(normalized);
  return headers.findIndex((header) => options.includes(normalized(header)));
}

function valueAt(row: Cell[], index: number) {
  return index < 0 ? "" : clean(row[index]);
}

function parseCompanies(sheet: SheetData | undefined): TrackedCompany[] {
  if (!sheet?.values.length) return [];
  const headers = sheet.values[0];
  const nameIndex = indexOfHeader(headers, ["company", "company name", "name"]);
  if (nameIndex < 0) return [];
  const relationshipIndex = indexOfHeader(headers, ["relationship", "status", "type"]);
  const sectorIndex = indexOfHeader(headers, ["sector", "industry"]);
  const notesIndex = indexOfHeader(headers, ["notes", "comment"]);
  const reviewIndex = indexOfHeader(headers, ["next review", "review date"]);
  const investedIndex = indexOfHeader(headers, ["amount invested", "investment"]);
  const websiteIndex = indexOfHeader(headers, ["website", "url"]);
  const deckIndex = indexOfHeader(headers, ["pitch deck", "deck"]);
  const addedIndex = indexOfHeader(headers, ["added", "created"]);
  const seen = new Set<string>();

  return sheet.values.slice(1).flatMap((row) => {
    const name = valueAt(row, nameIndex);
    const key = normalized(name);
    if (!name || seen.has(key)) return [];
    seen.add(key);
    const relationship = normalized(valueAt(row, relationshipIndex));
    return [
      {
        id: idFor("company", name),
        name,
        relationship:
          relationship.includes("invest") || relationship.includes("portfolio")
            ? "invested"
            : "following",
        sector: valueAt(row, sectorIndex) || "Other",
        notes: valueAt(row, notesIndex),
        nextReview: valueAt(row, reviewIndex),
        investedAmount: valueAt(row, investedIndex),
        website: valueAt(row, websiteIndex),
        pitchDeckUrl: valueAt(row, deckIndex),
        createdAt: valueAt(row, addedIndex) || new Date().toISOString(),
      } as TrackedCompany,
    ];
  });
}

function parseEvents(sheet: SheetData | undefined): CompanyEvent[] {
  if (!sheet?.values.length) return [];
  const headers = sheet.values[0];
  const companyIndex = indexOfHeader(headers, ["company", "company name"]);
  const titleIndex = indexOfHeader(headers, ["event", "title", "headline"]);
  if (companyIndex < 0 || titleIndex < 0) return [];
  const dateIndex = indexOfHeader(headers, ["date", "event date", "occurred"]);
  const detailsIndex = indexOfHeader(headers, ["details", "summary", "description"]);
  const signalIndex = indexOfHeader(headers, ["signal", "category", "event type"]);
  const impactIndex = indexOfHeader(headers, ["impact", "sentiment"]);
  const locationIndex = indexOfHeader(headers, ["information location", "source", "url"]);
  const addedIndex = indexOfHeader(headers, ["added", "created"]);
  return sheet.values.slice(1).flatMap((row) => {
    const companyName = valueAt(row, companyIndex);
    const title = valueAt(row, titleIndex);
    if (!companyName || !title) return [];
    const impact = normalized(valueAt(row, impactIndex));
    return [
      {
        id: idFor("event", `${companyName}-${title}`),
        companyName,
        title,
        occurredAt: valueAt(row, dateIndex) || new Date().toISOString().slice(0, 10),
        details: valueAt(row, detailsIndex),
        signal: valueAt(row, signalIndex) || "Other",
        impact: (["positive", "negative", "neutral"].includes(impact)
          ? impact
          : "neutral") as SignalImpact,
        informationLocation: valueAt(row, locationIndex),
        createdAt: valueAt(row, addedIndex) || new Date().toISOString(),
      },
    ];
  });
}

function discoverCompanies(sheets: SheetData[]): TrackedCompany[] {
  const discovered = sheets.flatMap(parseCompanies);
  const unique = new Map(discovered.map((company) => [normalized(company.name), company]));
  return [...unique.values()];
}

export function attentionScore(companyName: string, events: CompanyEvent[], nextReview?: string) {
  const companyEvents = events.filter(
    (event) => normalized(event.companyName) === normalized(companyName)
  );
  const signalScore = companyEvents.reduce(
    (score, event) =>
      score + (event.impact === "negative" ? 30 : event.impact === "positive" ? 8 : 4),
    0
  );
  const overdue = nextReview && nextReview < new Date().toISOString().slice(0, 10) ? 25 : 0;
  return Math.min(100, signalScore + overdue);
}

export function urgentCompanies(profile: UserProfile) {
  const tracked = profile.companies.map((company) => ({
    name: company.name,
    relationship: company.relationship === "invested" ? "Invested" : "Following",
    sector: company.sector,
    score: attentionScore(company.name, profile.events, company.nextReview),
    nextReview: company.nextReview,
  }));
  const radarOnly = profile.radarCompanies
    .filter(
      (name) => !profile.companies.some((company) => normalized(company.name) === normalized(name))
    )
    .map((name) => ({
      name,
      relationship: "Radar",
      sector: "Radar discovery",
      score: 15,
      nextReview: "",
    }));
  return [...tracked, ...radarOnly].sort(
    (left, right) => right.score - left.score || left.name.localeCompare(right.name)
  );
}

function latestEvent(companyName: string, events: CompanyEvent[]) {
  return events
    .filter((event) => normalized(event.companyName) === normalized(companyName))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];
}

async function replaceSheet(
  context: Excel.RequestContext,
  name: string,
  headers: string[],
  rows: Cell[][]
) {
  const worksheets = context.workbook.worksheets;
  let sheet = worksheets.getItemOrNullObject(name);
  // eslint-disable-next-line office-addins/no-navigational-load
  sheet.load("isNullObject");
  await context.sync();
  if (sheet.isNullObject) sheet = worksheets.add(name);
  const usedRange = sheet.getUsedRangeOrNullObject();
  // eslint-disable-next-line office-addins/no-navigational-load
  usedRange.load("isNullObject");
  await context.sync();
  if (!usedRange.isNullObject) usedRange.clear(Excel.ClearApplyTo.all);
  const values = [headers, ...rows];
  const range = sheet.getRangeByIndexes(0, 0, values.length, headers.length);
  range.values = values;
  range.format.autofitColumns();
  range.format.autofitRows();
  const header = sheet.getRangeByIndexes(0, 0, 1, headers.length);
  header.format.font.bold = true;
  header.format.font.color = "#ffffff";
  header.format.fill.color = "#17493c";
  sheet.freezePanes.freezeRows(1);
}

export async function writeWorkspace(profile: UserProfile): Promise<void> {
  if (Office.context.host !== Office.HostType.Excel) return;
  await Excel.run(async (context) => {
    const companyRows: Cell[][] = profile.companies.map((company) => {
      const event = latestEvent(company.name, profile.events);
      return [
        company.name,
        company.relationship === "invested" ? "Invested" : "Following",
        company.sector,
        attentionScore(company.name, profile.events, company.nextReview),
        event ? `${event.impact}: ${event.signal}` : "",
        event?.occurredAt || "",
        company.investedAmount || "",
        company.nextReview || "",
        company.notes || "",
        company.createdAt.slice(0, 10),
        company.website || "",
        company.pitchDeckUrl || "",
      ];
    });
    const eventRows: Cell[][] = profile.events.map((event) => [
      event.occurredAt,
      event.companyName,
      event.title,
      event.details,
      event.signal,
      event.impact,
      event.informationLocation,
      event.createdAt.slice(0, 10),
    ]);
    const overviewRows: Cell[][] = urgentCompanies(profile).map((company, index) => {
      const event = latestEvent(company.name, profile.events);
      const reason =
        event?.impact === "negative"
          ? event.title
          : company.nextReview && company.nextReview < new Date().toISOString().slice(0, 10)
            ? `Review overdue since ${company.nextReview}`
            : company.relationship === "Radar"
              ? "Radar company not yet in the tracked list"
              : event?.title || "No recent event";
      return [
        index + 1,
        company.name,
        company.relationship,
        company.sector,
        company.score,
        event ? `${event.impact}: ${event.signal}` : "",
        reason,
      ];
    });
    await replaceSheet(context, OVERVIEW_SHEET, OVERVIEW_HEADERS, overviewRows);
    await replaceSheet(context, COMPANIES_SHEET, COMPANY_HEADERS, companyRows);
    await replaceSheet(context, EVENTS_SHEET, EVENT_HEADERS, eventRows);
    await context.sync();
  });
}

export async function initialiseWorkspace(fallback: UserProfile): Promise<UserProfile> {
  if (Office.context.host !== Office.HostType.Excel) return fallback;
  const loaded = await Excel.run(async (context) => {
    const worksheets = context.workbook.worksheets;
    worksheets.load("items/name");
    await context.sync();
    const ranges = worksheets.items.map((sheet) => {
      const range = sheet.getUsedRangeOrNullObject(true);
      // eslint-disable-next-line office-addins/no-navigational-load
      range.load("isNullObject,values");
      return { sheet, range };
    });
    await context.sync();
    return ranges
      .filter(({ range }) => !range.isNullObject)
      .map(({ sheet, range }) => ({ name: sheet.name, values: range.values as Cell[][] }));
  });
  const companiesSheet = loaded.find((sheet) => sheet.name === COMPANIES_SHEET);
  const eventsSheet = loaded.find((sheet) => sheet.name === EVENTS_SHEET);
  const companies = parseCompanies(companiesSheet);
  const discovered = discoverCompanies(
    loaded.filter((sheet) => ![OVERVIEW_SHEET, COMPANIES_SHEET, EVENTS_SHEET].includes(sheet.name))
  );
  const events = parseEvents(eventsSheet);
  const mergedCompanies = new Map(
    fallback.companies.map((company) => [normalized(company.name), company])
  );
  [...companies, ...discovered].forEach((company) =>
    mergedCompanies.set(normalized(company.name), company)
  );
  const result = {
    ...fallback,
    companies: [...mergedCompanies.values()],
    events: events.length ? events : fallback.events,
  };
  await writeWorkspace(result);
  return result;
}

export async function readManagedWorkspace(current: UserProfile): Promise<UserProfile> {
  if (Office.context.host !== Office.HostType.Excel) return current;
  const sheets = await Excel.run(async (context) => {
    const worksheets = context.workbook.worksheets;
    const targets = [COMPANIES_SHEET, EVENTS_SHEET].map((name) => {
      const sheet = worksheets.getItemOrNullObject(name);
      // eslint-disable-next-line office-addins/no-navigational-load
      sheet.load("name,isNullObject");
      return sheet;
    });
    await context.sync();
    const ranges = targets
      .filter((sheet) => !sheet.isNullObject)
      .map((sheet) => {
        const range = sheet.getUsedRangeOrNullObject(true);
        // eslint-disable-next-line office-addins/no-navigational-load
        range.load("isNullObject,values");
        return { sheet, range };
      });
    await context.sync();
    return ranges
      .filter(({ range }) => !range.isNullObject)
      .map(({ sheet, range }) => ({ name: sheet.name, values: range.values as Cell[][] }));
  });
  const readCompanies = parseCompanies(sheets.find((sheet) => sheet.name === COMPANIES_SHEET));
  const existingCompanies = new Map(
    current.companies.map((company) => [normalized(company.name), company])
  );
  const companies = readCompanies.map((company) => ({
    ...existingCompanies.get(normalized(company.name)),
    ...company,
  }));
  const events = parseEvents(sheets.find((sheet) => sheet.name === EVENTS_SHEET));
  return { ...current, companies, events };
}
