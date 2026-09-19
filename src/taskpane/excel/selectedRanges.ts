import { SelectedRangeContext } from "../chat/types";
import { ExcelCellValue } from "./types";

/* global Excel, OfficeExtension */

export const MAX_SELECTED_RANGE_CELLS = 1_000;
export const MAX_SELECTED_RANGES = 10;
export const MAX_SELECTED_CELLS = 5_000;

function selectionAddress(address: string) {
  const separatorIndex = address.lastIndexOf("!");
  return separatorIndex >= 0 ? address.slice(separatorIndex + 1) : address;
}

function selectionError(error: unknown) {
  if (typeof OfficeExtension !== "undefined" && error instanceof OfficeExtension.Error) {
    return new Error(error.message || "Excel could not read the selected range.");
  }
  return error instanceof Error ? error : new Error("Excel could not read the selected range.");
}

export async function captureSelectedRange(): Promise<SelectedRangeContext> {
  if (typeof Excel === "undefined" || typeof Excel.run !== "function") {
    throw new Error("Excel is not available in this add-in context.");
  }

  try {
    return await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet();
      const range = context.workbook.getSelectedRange();
      worksheet.load("name");
      range.load("address,rowCount,columnCount");
      await context.sync();

      const cellCount = range.rowCount * range.columnCount;
      if (cellCount > MAX_SELECTED_RANGE_CELLS) {
        throw new Error(
          `The selected range contains ${cellCount.toLocaleString()} cells. Select at most ${MAX_SELECTED_RANGE_CELLS.toLocaleString()} cells at a time.`
        );
      }

      range.load("values");
      await context.sync();
      const address = selectionAddress(range.address);
      return {
        id: `${worksheet.name}!${address}`,
        worksheet: worksheet.name,
        address,
        rowCount: range.rowCount,
        columnCount: range.columnCount,
        values: range.values as ExcelCellValue[][],
      };
    });
  } catch (error) {
    throw selectionError(error);
  }
}
