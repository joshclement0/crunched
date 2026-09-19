import * as React from "react";
import { CompanyEvent, TrackedCompany } from "./components/Profile/types";

/* global fetch */

interface NewsArticle {
  id: string;
  matchedCompanies: string[];
  title: string;
  summary: string;
  category: string;
  impact: "positive" | "negative" | "neutral" | "mixed";
  publishedAt: string;
  url: string;
}

export function useStartupSignals(
  ready: boolean,
  companies: TrackedCompany[],
  radarCompanies: string[],
  onEvents: (events: CompanyEvent[]) => void
) {
  const started = React.useRef(false);
  const [isScanning, setIsScanning] = React.useState(false);

  React.useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    setIsScanning(true);
    const targets = [
      ...companies,
      ...radarCompanies.map((name) => ({ name, sector: "", relationship: "following" as const })),
    ];
    void fetch("/api/startup-signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companies: targets }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Signal scan returned ${response.status}`);
        return response.json() as Promise<{ articles?: NewsArticle[] }>;
      })
      .then((result) => {
        const events = (result.articles || []).flatMap((article) =>
          article.matchedCompanies.map((companyName) => ({
            id: `news-${article.id}-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            companyName,
            title: article.title,
            details: article.summary,
            signal: article.category,
            impact: article.impact === "mixed" ? ("neutral" as const) : article.impact,
            occurredAt: article.publishedAt.slice(0, 10),
            informationLocation: article.url,
            createdAt: new Date().toISOString(),
          }))
        );
        onEvents(events);
      })
      .catch(() => {
        // News scanning is additive; workbook setup and manual events remain available offline.
      })
      .finally(() => setIsScanning(false));
  }, [companies, onEvents, radarCompanies, ready]);

  return isScanning;
}
