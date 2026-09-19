import * as React from "react";
import { WorkbookPreferences, readWorkbookPreferences } from "./workbookPreferences";

/* global console */

export function useWorkbookPreferences(
  onPreferencesLoaded: (preferences: WorkbookPreferences) => void
) {
  React.useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const preferences = await readWorkbookPreferences();
        if (!isCancelled) onPreferencesLoaded(preferences);
      } catch (error) {
        console.warn("Unable to update preferences from the workbook.", error);
      }
    };

    void load();
    return () => {
      isCancelled = true;
    };
  }, [onPreferencesLoaded]);
}
