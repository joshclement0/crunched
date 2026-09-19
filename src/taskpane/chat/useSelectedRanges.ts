import * as React from "react";
import {
  captureSelectedRange,
  MAX_SELECTED_CELLS,
  MAX_SELECTED_RANGES,
} from "../excel/selectedRanges";
import { SelectedRangeContext } from "./types";

export function useSelectedRanges() {
  const [selectedRanges, setSelectedRanges] = React.useState<SelectedRangeContext[]>([]);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [selectionError, setSelectionError] = React.useState<string | null>(null);

  const addCurrentSelection = React.useCallback(async () => {
    setIsCapturing(true);
    setSelectionError(null);
    try {
      const selectedRange = await captureSelectedRange();
      const withoutDuplicate = selectedRanges.filter((item) => item.id !== selectedRange.id);
      if (withoutDuplicate.length >= MAX_SELECTED_RANGES) {
        throw new Error(`You can attach up to ${MAX_SELECTED_RANGES} ranges.`);
      }
      const nextRanges = [...withoutDuplicate, selectedRange];
      const cellCount = nextRanges.reduce(
        (total, item) => total + item.rowCount * item.columnCount,
        0
      );
      if (cellCount > MAX_SELECTED_CELLS) {
        throw new Error(
          `Selected ranges can contain up to ${MAX_SELECTED_CELLS.toLocaleString()} cells in total.`
        );
      }
      setSelectedRanges(nextRanges);
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "Could not add the selection.");
    } finally {
      setIsCapturing(false);
    }
  }, [selectedRanges]);

  const removeSelectedRange = React.useCallback((id: string) => {
    setSelectedRanges((current) => current.filter((item) => item.id !== id));
    setSelectionError(null);
  }, []);

  const clearSelectedRanges = React.useCallback(() => {
    setSelectedRanges([]);
    setSelectionError(null);
  }, []);

  return {
    selectedRanges,
    isCapturing,
    selectionError,
    addCurrentSelection,
    removeSelectedRange,
    clearSelectedRanges,
  };
}
