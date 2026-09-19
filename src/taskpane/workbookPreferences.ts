import {
  GEOGRAPHY_OPTIONS,
  QUALITY_OPTIONS,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  UserProfile,
} from "./components/Profile/types";

/* global Excel, Office */

export type WorkbookPreferences = Pick<
  UserProfile,
  "sectors" | "stages" | "geographies" | "companyQualities"
>;

type PreferenceField = keyof WorkbookPreferences;

const EMPTY_WORKBOOK_PREFERENCES: WorkbookPreferences = {
  sectors: [],
  stages: [],
  geographies: [],
  companyQualities: [],
};

const HEADER_FIELDS: Record<string, PreferenceField> = {
  sector: "sectors",
  sectors: "sectors",
  industry: "sectors",
  stage: "stages",
  stages: "stages",
  geography: "geographies",
  geographies: "geographies",
  region: "geographies",
  regions: "geographies",
  "company quality": "companyQualities",
  "company qualities": "companyQualities",
  quality: "companyQualities",
  qualities: "companyQualities",
};

const VALUE_ALIASES: Partial<Record<PreferenceField, Record<string, string>>> = {
  sectors: {
    "electricity gas steam and air conditioning supply": "Climate & energy",
    "water supply": "Climate & energy",
    "financial and insurance activities": "Fintech",
    "human health and social work activities": "Health & biotech",
    "information and communication": "Enterprise software",
    "administrative and support service activities": "Enterprise software",
    "wholesale and retail trade": "Consumer",
    "mining quarrying and manufacturing": "Industrial & manufacturing",
    construction: "Industrial & manufacturing",
    "transportation and storage": "Mobility",
    "agriculture forestry and fishing": "Food & agriculture",
    "professional scientific and technical activities": "Deep tech",
    "arts entertainment and recreation": "Media & creative",
  },
  stages: {
    "series b": "Growth",
    "series c": "Growth",
    "series d": "Growth",
    "late stage": "Growth",
  },
};

const OPTIONS: Record<PreferenceField, string[]> = {
  sectors: SECTOR_OPTIONS,
  stages: STAGE_OPTIONS,
  geographies: GEOGRAPHY_OPTIONS,
  companyQualities: QUALITY_OPTIONS,
};

function normalized(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function recognizedValue(field: PreferenceField, value: unknown): string | undefined {
  const normalizedValue = normalized(value);
  if (!normalizedValue) return undefined;

  const option = OPTIONS[field].find((candidate) => normalized(candidate) === normalizedValue);
  return option ?? VALUE_ALIASES[field]?.[normalizedValue];
}

function addUnique(target: string[], value: string | undefined) {
  if (value && !target.includes(value)) target.push(value);
}

/** Extracts supported preferences from table-shaped workbook data. */
export function extractWorkbookPreferences(
  tables: Array<{ headers: string[]; values: unknown[][] }>
): WorkbookPreferences {
  const preferences: WorkbookPreferences = {
    sectors: [],
    stages: [],
    geographies: [],
    companyQualities: [],
  };

  for (const table of tables) {
    table.headers.forEach((header, columnIndex) => {
      const field = HEADER_FIELDS[normalized(header)];
      if (!field) return;

      for (const row of table.values) {
        addUnique(preferences[field], recognizedValue(field, row[columnIndex]));
      }
    });
  }

  return preferences;
}

/** Reads preference-bearing columns from every non-empty Excel table. */
export async function readWorkbookPreferences(): Promise<WorkbookPreferences> {
  if (Office.context.host !== Office.HostType.Excel) return EMPTY_WORKBOOK_PREFERENCES;

  return Excel.run(async (context) => {
    const tables = context.workbook.tables;
    tables.load("items/name");
    await context.sync();

    for (const table of tables.items) {
      table.columns.load("items/name");
      table.rows.load("count");
    }
    await context.sync();

    const loadedTables: Array<{
      headers: string[];
      range: Excel.Range;
    }> = [];

    for (const table of tables.items) {
      if (table.rows.count === 0) continue;
      const headers = table.columns.items.map((column) => column.name);
      if (!headers.some((header) => HEADER_FIELDS[normalized(header)])) continue;

      const range = table.getDataBodyRange();
      range.load("values");
      loadedTables.push({ headers, range });
    }
    await context.sync();

    return extractWorkbookPreferences(
      loadedTables.map(({ headers, range }) => ({ headers, values: range.values }))
    );
  });
}

/** Adds workbook-derived preferences without discarding the user's saved choices. */
export function mergeWorkbookPreferences(
  profile: UserProfile,
  workbookPreferences: WorkbookPreferences
): UserProfile {
  const merge = (saved: string[], workbook: string[]) =>
    Array.from(new Set([...saved, ...workbook]));

  return {
    ...profile,
    sectors: merge(profile.sectors, workbookPreferences.sectors),
    stages: merge(profile.stages, workbookPreferences.stages),
    geographies: merge(profile.geographies, workbookPreferences.geographies),
    companyQualities: merge(profile.companyQualities, workbookPreferences.companyQualities),
  };
}
