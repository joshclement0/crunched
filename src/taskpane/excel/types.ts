export type ExcelToolName =
  "listWorksheets" | "inspectUsedRange" | "readRange" | "writeRange" | "createWorksheet";

export type ExcelCellValue = string | number | boolean | null;

export interface ExcelToolRequest {
  id: string;
  name: ExcelToolName;
  arguments: Record<string, unknown>;
}

export interface WorksheetSummary {
  name: string;
  position: number;
  visibility: string;
}

export interface UsedRangeInspection {
  worksheet: string;
  address: string | null;
  rowIndex: number | null;
  columnIndex: number | null;
  rowCount: number;
  columnCount: number;
  isEmpty: boolean;
}

export interface RangeReadChunk {
  address: string;
  rowOffset: number;
  columnOffset: number;
  rowCount: number;
  columnCount: number;
  values: ExcelCellValue[][];
}

export interface RangeReadResult {
  worksheet: string;
  address: string;
  rowCount: number;
  columnCount: number;
  chunks: RangeReadChunk[];
}

export interface RangeWriteResult {
  worksheet: string;
  address: string;
  rowCount: number;
  columnCount: number;
}

export interface WorksheetCreateResult {
  name: string;
  position: number;
}

export interface WorksheetMetadata extends WorksheetSummary {
  usedRange: UsedRangeInspection;
}

export interface WorkbookMetadata {
  capturedAt: string;
  worksheets: WorksheetMetadata[];
}

export type ExcelToolResult =
  | { tool: "listWorksheets"; worksheets: WorksheetSummary[] }
  | { tool: "inspectUsedRange"; usedRange: UsedRangeInspection }
  | { tool: "readRange"; range: RangeReadResult }
  | { tool: "writeRange"; range: RangeWriteResult }
  | { tool: "createWorksheet"; worksheet: WorksheetCreateResult };
