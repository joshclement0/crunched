import * as React from "react";
import { TrackedCompany } from "./components/Profile/types";
import { writeCompaniesToWorkbook } from "./workbookCompanies";

/* global console, window */

export function useWorkbookCompanies(companies: TrackedCompany[]) {
  React.useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      void writeCompaniesToWorkbook(companies).catch((error) => {
        console.warn("Unable to update the Companies worksheet.", error);
      });
    }, 150);

    return () => window.clearTimeout(syncTimer);
  }, [companies]);
}
