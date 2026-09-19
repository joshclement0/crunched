import { TrackedCompany } from "./components/Profile/types";

/* global Excel, Office */

const COMPANIES_SHEET_NAME = "Companies";

const HEADERS = [
  "Company",
  "Description",
  "Sector",
  "Relationship",
  "Founded",
  "Founders",
  "Founder count",
  "Team size",
  "Headquarters",
  "Latest round date",
  "Latest round amount",
  "Latest round type",
  "Total funding",
  "Valuation",
  "Business model",
  "Key investors",
  "Amount invested",
  "Next review",
  "Notes",
  "Added",
  "Website",
  "Pitch deck",
  "Research sources",
];

function workbookRows(companies: TrackedCompany[]): string[][] {
  return companies.map((company) => [
    company.name,
    company.description || "",
    company.sector,
    company.relationship === "invested" ? "Portfolio" : "Following",
    company.foundedDate || "",
    company.founders?.join(", ") || "",
    company.founders?.length ? String(company.founders.length) : "",
    company.teamSize !== undefined ? String(company.teamSize) : "",
    company.headquarters || "",
    company.latestFundingRoundDate || "",
    company.latestFundingRoundAmount || "",
    company.latestFundingRoundType || "",
    company.totalFunding || "",
    company.valuation || "",
    company.businessModel || "",
    company.keyInvestors?.join(", ") || "",
    company.investedAmount || "",
    company.nextReview || "",
    company.notes || "",
    company.createdAt ? company.createdAt.slice(0, 10) : "",
    company.website || "",
    company.pitchDeckUrl || "",
    company.enrichmentSources?.join("\n") || "",
  ]);
}

/** Replaces the add-in-owned Companies sheet with the currently saved companies. */
export async function writeCompaniesToWorkbook(companies: TrackedCompany[]): Promise<void> {
  if (Office.context.host !== Office.HostType.Excel) return;

  await Excel.run(async (context) => {
    const worksheets = context.workbook.worksheets;
    let sheet = worksheets.getItemOrNullObject(COMPANIES_SHEET_NAME);
    // The null-object flag must be loaded before deciding whether to create the sheet.
    // eslint-disable-next-line office-addins/no-navigational-load
    sheet.load("isNullObject");
    await context.sync();

    if (sheet.isNullObject) {
      sheet = worksheets.add(COMPANIES_SHEET_NAME);
    } else {
      const usedRange = sheet.getUsedRangeOrNullObject();
      // The null-object flag avoids clearing an invalid range on a new empty sheet.
      // eslint-disable-next-line office-addins/no-navigational-load
      usedRange.load("isNullObject");
      await context.sync();
      if (!usedRange.isNullObject) usedRange.clear(Excel.ClearApplyTo.all);
    }

    const rows = [HEADERS, ...workbookRows(companies)];
    const output = sheet.getRangeByIndexes(0, 0, rows.length, HEADERS.length);
    output.values = rows;
    output.format.autofitColumns();
    output.format.autofitRows();

    const header = sheet.getRangeByIndexes(0, 0, 1, HEADERS.length);
    header.format.font.bold = true;
    header.format.font.color = "#ffffff";
    header.format.fill.color = "#1f5d4d";
    sheet.getRange("B:B").format.columnWidth = 220;
    sheet.getRange("S:S").format.columnWidth = 220;
    sheet.getRange("W:W").format.columnWidth = 220;
    sheet.freezePanes.freezeRows(1);

    await context.sync();
  });
}
