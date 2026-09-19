import {
  ExcelCellValue,
  ExcelToolRequest,
  ExcelToolResult,
  RangeReadResult,
  RangeWriteResult,
  UsedRangeInspection,
  WorkbookMetadata,
  WorksheetCreateResult,
  WorksheetMetadata,
  WorksheetSummary,
} from "./types";

/* global Blob, Excel, OfficeExtension */

export const MAX_TOOL_CELLS = 10_000;
export const MAX_READ_CHUNK_CELLS = 1_000;
export const MAX_READ_RESULT_BYTES = 250_000;
const MAX_RANGE_ADDRESS_LENGTH = 128;

export class ExcelToolError extends Error {
  readonly code: string;
  readonly tool: ExcelToolRequest["name"];

  constructor(tool: ExcelToolRequest["name"], code: string, message: string) {
    super(message);
    this.name = "ExcelToolError";
    this.code = code;
    this.tool = tool;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(
  tool: ExcelToolRequest["name"],
  value: Record<string, unknown>,
  expectedKeys: string[]
) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    const missing = expected.filter((key) => !actual.includes(key));
    const unexpected = actual.filter((key) => !expected.includes(key));
    const details = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      unexpected.length ? `unexpected: ${unexpected.join(", ")}` : "",
    ].filter(Boolean);
    throw new ExcelToolError(
      tool,
      "invalid_arguments",
      `Invalid arguments for ${tool}${details.length ? ` (${details.join("; ")})` : ""}.`
    );
  }
}

function requireText(
  tool: ExcelToolRequest["name"],
  value: unknown,
  label: string,
  maximumLength = 255
) {
  if (typeof value !== "string" || !value.trim() || value.length > maximumLength) {
    throw new ExcelToolError(tool, "invalid_arguments", `${label} is required.`);
  }
  return value.trim();
}

function requireWorksheetName(tool: ExcelToolRequest["name"], value: unknown) {
  return requireText(tool, value, "Worksheet name", 255);
}

function requireRangeAddress(tool: ExcelToolRequest["name"], value: unknown) {
  const address = requireText(tool, value, "Range address", MAX_RANGE_ADDRESS_LENGTH);
  if (address.includes("!")) {
    throw new ExcelToolError(
      tool,
      "invalid_arguments",
      "Use an address within the specified worksheet, without a worksheet prefix."
    );
  }
  return address;
}

function requireValues(tool: "writeRange", value: unknown): ExcelCellValue[][] {
  if (!Array.isArray(value) || !value.length || value.length > 100) {
    throw new ExcelToolError(
      tool,
      "invalid_arguments",
      "Values must contain between 1 and 100 rows."
    );
  }

  const firstRow = value[0];
  const width = Array.isArray(firstRow) ? firstRow.length : 0;
  const validCell = (cell: unknown): cell is ExcelCellValue =>
    cell === null || ["string", "number", "boolean"].includes(typeof cell);
  if (
    width < 1 ||
    width > 100 ||
    value.some(
      (row) => !Array.isArray(row) || row.length !== width || row.some((cell) => !validCell(cell))
    )
  ) {
    throw new ExcelToolError(
      tool,
      "invalid_arguments",
      "Values must be a rectangular matrix of strings, numbers, booleans, or nulls."
    );
  }
  if (value.length * width > MAX_TOOL_CELLS) {
    throw new ExcelToolError(
      tool,
      "range_too_large",
      `A write is limited to ${MAX_TOOL_CELLS} cells.`
    );
  }
  return value as ExcelCellValue[][];
}

function requireNewWorksheetName(value: unknown) {
  const name = requireText("createWorksheet", value, "Worksheet name", 31);
  const hasInvalidCharacter = [":", "\\", "/", "?", "*", "[", "]"].some((character) =>
    name.includes(character)
  );
  if (hasInvalidCharacter || name.startsWith("'") || name.endsWith("'")) {
    throw new ExcelToolError(
      "createWorksheet",
      "invalid_arguments",
      "The worksheet name contains characters Excel does not allow."
    );
  }
  return name;
}

function assertCellLimit(tool: "readRange", rowCount: number, columnCount: number) {
  if (rowCount * columnCount > MAX_READ_CHUNK_CELLS) {
    throw new ExcelToolError(
      tool,
      "range_too_large",
      `The requested range contains ${
        rowCount * columnCount
      } cells; read at most ${MAX_READ_CHUNK_CELLS} cells at a time.`
    );
  }
}

function assertReadResultSize(chunks: RangeReadResult["chunks"]) {
  const resultBytes = new Blob([JSON.stringify(chunks)]).size;
  if (resultBytes > MAX_READ_RESULT_BYTES) {
    throw new ExcelToolError(
      "readRange",
      "range_payload_too_large",
      `The requested values contain ${Math.ceil(
        resultBytes / 1024
      )} KB of text; request a smaller row or column range.`
    );
  }
}

function normaliseOfficeError(tool: ExcelToolRequest["name"], error: unknown): ExcelToolError {
  if (error instanceof ExcelToolError) return error;
  if (error instanceof OfficeExtension.Error) {
    return new ExcelToolError(
      tool,
      error.code || "office_error",
      error.message || "Excel rejected the request."
    );
  }
  return new ExcelToolError(
    tool,
    "office_error",
    error instanceof Error ? error.message : "Excel could not complete the request."
  );
}

function ensureExcelAvailable(tool: ExcelToolRequest["name"]) {
  if (typeof Excel === "undefined" || typeof Excel.run !== "function") {
    throw new ExcelToolError(
      tool,
      "excel_unavailable",
      "Excel is not available in this add-in context."
    );
  }
}

export async function listWorksheets(): Promise<WorksheetSummary[]> {
  const tool = "listWorksheets";
  ensureExcelAvailable(tool);
  try {
    return await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load("items/name,items/position,items/visibility");
      await context.sync();
      return worksheets.items.map((worksheet) => ({
        name: worksheet.name,
        position: worksheet.position,
        visibility: String(worksheet.visibility),
      }));
    });
  } catch (error) {
    throw normaliseOfficeError(tool, error);
  }
}

export async function inspectUsedRange(worksheetName: string): Promise<UsedRangeInspection> {
  const tool = "inspectUsedRange";
  ensureExcelAvailable(tool);
  try {
    return await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getItem(worksheetName);
      const range = worksheet.getUsedRangeOrNullObject(true);
      range.load("address,rowIndex,columnIndex,rowCount,columnCount");
      await context.sync();
      if (range.isNullObject) {
        return {
          worksheet: worksheetName,
          address: null,
          rowIndex: null,
          columnIndex: null,
          rowCount: 0,
          columnCount: 0,
          isEmpty: true,
        };
      }
      return {
        worksheet: worksheetName,
        address: range.address,
        rowIndex: range.rowIndex,
        columnIndex: range.columnIndex,
        rowCount: range.rowCount,
        columnCount: range.columnCount,
        isEmpty: false,
      };
    });
  } catch (error) {
    throw normaliseOfficeError(tool, error);
  }
}

export async function inspectWorkbookMetadata(): Promise<WorkbookMetadata> {
  const tool = "listWorksheets";
  ensureExcelAvailable(tool);
  try {
    return await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load("items/name,items/position,items/visibility");
      await context.sync();

      const usedRanges = worksheets.items.map((worksheet) => {
        const range = worksheet.getUsedRangeOrNullObject(true);
        range.load("address,rowIndex,columnIndex,rowCount,columnCount");
        return { worksheet, range };
      });
      await context.sync();

      const metadata: WorksheetMetadata[] = usedRanges.map(({ worksheet, range }) => ({
        name: worksheet.name,
        position: worksheet.position,
        visibility: String(worksheet.visibility),
        usedRange: range.isNullObject
          ? {
              worksheet: worksheet.name,
              address: null,
              rowIndex: null,
              columnIndex: null,
              rowCount: 0,
              columnCount: 0,
              isEmpty: true,
            }
          : {
              worksheet: worksheet.name,
              address: range.address,
              rowIndex: range.rowIndex,
              columnIndex: range.columnIndex,
              rowCount: range.rowCount,
              columnCount: range.columnCount,
              isEmpty: false,
            },
      }));

      return { capturedAt: new Date().toISOString(), worksheets: metadata };
    });
  } catch (error) {
    throw normaliseOfficeError(tool, error);
  }
}

interface ReadChunkPosition {
  rowOffset: number;
  columnOffset: number;
  rowCount: number;
  columnCount: number;
}

function planReadChunks(rowCount: number, columnCount: number): ReadChunkPosition[] {
  const chunkColumnCount = Math.min(columnCount, MAX_READ_CHUNK_CELLS);
  const chunkRowCount = Math.max(1, Math.floor(MAX_READ_CHUNK_CELLS / chunkColumnCount));
  const chunks: ReadChunkPosition[] = [];
  for (let rowOffset = 0; rowOffset < rowCount; rowOffset += chunkRowCount) {
    for (let columnOffset = 0; columnOffset < columnCount; columnOffset += chunkColumnCount) {
      chunks.push({
        rowOffset,
        columnOffset,
        rowCount: Math.min(chunkRowCount, rowCount - rowOffset),
        columnCount: Math.min(chunkColumnCount, columnCount - columnOffset),
      });
    }
  }
  return chunks;
}

export async function readRange(worksheetName: string, address: string): Promise<RangeReadResult> {
  const tool = "readRange";
  ensureExcelAvailable(tool);
  try {
    return await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getItem(worksheetName);
      const range = worksheet.getRange(address);
      range.load("address,rowIndex,columnIndex,rowCount,columnCount");
      await context.sync();
      assertCellLimit(tool, range.rowCount, range.columnCount);

      const chunks = [];
      for (const position of planReadChunks(range.rowCount, range.columnCount)) {
        const chunk = worksheet.getRangeByIndexes(
          range.rowIndex + position.rowOffset,
          range.columnIndex + position.columnOffset,
          position.rowCount,
          position.columnCount
        );
        chunk.load("address,rowCount,columnCount,values");
        // Keep each Office response bounded rather than batching every chunk into one payload.
        // eslint-disable-next-line office-addins/no-context-sync-in-loop
        await context.sync();
        chunks.push({
          address: chunk.address,
          rowOffset: position.rowOffset,
          columnOffset: position.columnOffset,
          rowCount: chunk.rowCount,
          columnCount: chunk.columnCount,
          values: chunk.values as ExcelCellValue[][],
        });
        assertReadResultSize(chunks);
      }
      return {
        worksheet: worksheetName,
        address: range.address,
        rowCount: range.rowCount,
        columnCount: range.columnCount,
        chunks,
      };
    });
  } catch (error) {
    throw normaliseOfficeError(tool, error);
  }
}

export async function writeRange(
  worksheetName: string,
  address: string,
  values: ExcelCellValue[][]
): Promise<RangeWriteResult> {
  const tool = "writeRange";
  ensureExcelAvailable(tool);
  try {
    return await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getItem(worksheetName);
      const range = worksheet.getRange(address);
      range.load("address,rowCount,columnCount");
      await context.sync();

      const expectedRows = values.length;
      const expectedColumns = values[0].length;
      if (range.rowCount !== expectedRows || range.columnCount !== expectedColumns) {
        throw new ExcelToolError(
          tool,
          "range_size_mismatch",
          `The destination is ${range.rowCount}×${range.columnCount}, but the values are ${expectedRows}×${expectedColumns}.`
        );
      }

      range.values = values;
      await context.sync();
      return {
        worksheet: worksheetName,
        address: range.address,
        rowCount: range.rowCount,
        columnCount: range.columnCount,
      };
    });
  } catch (error) {
    throw normaliseOfficeError(tool, error);
  }
}

export async function createWorksheet(name: string): Promise<WorksheetCreateResult> {
  const tool = "createWorksheet";
  ensureExcelAvailable(tool);
  try {
    return await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      const existing = worksheets.getItemOrNullObject(name);
      existing.load("name");
      await context.sync();
      if (!existing.isNullObject) {
        throw new ExcelToolError(
          tool,
          "worksheet_exists",
          `A worksheet named ${JSON.stringify(name)} already exists.`
        );
      }

      const worksheet = worksheets.add(name);
      worksheet.load("name,position");
      await context.sync();
      return { name: worksheet.name, position: worksheet.position };
    });
  } catch (error) {
    throw normaliseOfficeError(tool, error);
  }
}

export async function executeExcelTool(request: ExcelToolRequest): Promise<ExcelToolResult> {
  if (!isObject(request.arguments)) {
    throw new ExcelToolError(
      request.name,
      "invalid_arguments",
      `Invalid arguments for ${request.name}.`
    );
  }

  switch (request.name) {
    case "listWorksheets": {
      assertExactKeys(request.name, request.arguments, []);
      return { tool: request.name, worksheets: await listWorksheets() };
    }
    case "inspectUsedRange": {
      assertExactKeys(request.name, request.arguments, ["worksheet"]);
      const worksheet = requireWorksheetName(request.name, request.arguments.worksheet);
      return { tool: request.name, usedRange: await inspectUsedRange(worksheet) };
    }
    case "readRange": {
      assertExactKeys(request.name, request.arguments, ["worksheet", "address"]);
      const worksheet = requireWorksheetName(request.name, request.arguments.worksheet);
      const address = requireRangeAddress(request.name, request.arguments.address);
      return { tool: request.name, range: await readRange(worksheet, address) };
    }
    case "writeRange": {
      assertExactKeys(request.name, request.arguments, ["worksheet", "address", "values"]);
      const worksheet = requireWorksheetName(request.name, request.arguments.worksheet);
      const address = requireRangeAddress(request.name, request.arguments.address);
      const values = requireValues(request.name, request.arguments.values);
      return { tool: request.name, range: await writeRange(worksheet, address, values) };
    }
    case "createWorksheet": {
      assertExactKeys(request.name, request.arguments, ["name"]);
      const name = requireNewWorksheetName(request.arguments.name);
      return { tool: request.name, worksheet: await createWorksheet(name) };
    }
    default: {
      const unsupported = request as ExcelToolRequest;
      throw new ExcelToolError(
        unsupported.name,
        "unsupported_tool",
        `Unsupported Excel tool: ${String(unsupported.name)}.`
      );
    }
  }
}
