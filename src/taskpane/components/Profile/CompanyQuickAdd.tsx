import * as React from "react";
import { Button, Input } from "@fluentui/react-components";
import { Add20Regular, Search20Regular } from "@fluentui/react-icons";
import {
  CompanySearchResult,
  draftFromEntry,
  draftFromSearchResult,
  searchCompanies,
} from "./companyDiscovery";
import { CompanyDraft } from "./types";
import { useProfileStyles } from "./styles";

interface CompanyQuickAddProps {
  onAdd: (preset: Partial<CompanyDraft>) => void;
}

export default function CompanyQuickAdd({ onAdd }: CompanyQuickAddProps) {
  const styles = useProfileStyles();
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const results = React.useMemo(() => searchCompanies(query), [query]);

  const submit = (preset?: Partial<CompanyDraft>) => {
    if (!preset && !query.trim()) return;
    onAdd(preset || draftFromEntry(query));
    setQuery("");
    setIsFocused(false);
  };

  const selectResult = (result: CompanySearchResult) => submit(draftFromSearchResult(result));

  return (
    <div className={styles.quickAdd}>
      <div className={styles.quickAddControls}>
        <Input
          className={styles.quickAddInput}
          contentBefore={<Search20Regular />}
          placeholder="Search company or paste a URL"
          value={query}
          aria-label="Search for a company or paste its website or pitch deck URL"
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 150)}
          onChange={(_, data) => setQuery(data.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <Button
          appearance="primary"
          icon={<Add20Regular />}
          disabled={!query.trim()}
          aria-label="Continue adding company"
          onClick={() => submit()}
        />
      </div>
      <p className={styles.inputHint}>Enter a name, company website, or link to a pitch deck.</p>
      {isFocused && results.length > 0 && (
        <div className={styles.searchResults} role="listbox" aria-label="Company suggestions">
          {results.map((result) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              className={styles.searchResult}
              key={result.domain}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectResult(result)}
            >
              <span className={styles.searchResultName}>{result.name}</span>
              <span className={styles.searchResultMeta}>{result.domain} · {result.sector}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
