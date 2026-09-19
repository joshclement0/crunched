import * as React from "react";
import { Button, Card, Spinner } from "@fluentui/react-components";
import { Building20Regular, Delete20Regular, Edit20Regular, Search20Regular } from "@fluentui/react-icons";
import { TrackedCompany } from "./types";
import { useProfileStyles } from "./styles";

interface CompanyCardProps {
  company: TrackedCompany;
  onEdit: () => void;
  onDelete: () => void;
  onEnrich: () => void;
}

export default function CompanyCard({ company, onEdit, onDelete, onEnrich }: CompanyCardProps) {
  const styles = useProfileStyles();

  return (
    <Card className={styles.card}>
      <div className={styles.companyRow}>
        <div className={styles.companyIcon}><Building20Regular /></div>
        <div className={styles.companyBody}>
          <h3 className={styles.companyName}>{company.name}</h3>
          <p className={styles.companyMeta}>{company.sector} · {company.relationship === "invested" ? "Portfolio" : "Following"}{company.investedAmount ? ` · ${company.investedAmount}` : ""}</p>
          {company.description && <p className={styles.notes}>{company.description}</p>}
          {(company.foundedDate || company.headquarters || company.teamSize !== undefined) && (
            <p className={styles.companyMeta}>
              {[
                company.foundedDate ? `Founded ${company.foundedDate}` : "",
                company.headquarters || "",
                company.teamSize !== undefined ? `${company.teamSize} team members` : "",
              ].filter(Boolean).join(" · ")}
            </p>
          )}
          {company.founders?.length ? <p className={styles.companyMeta}>Founders: {company.founders.join(", ")}</p> : null}
          {(company.latestFundingRoundDate || company.latestFundingRoundAmount) && (
            <p className={styles.companyMeta}>
              Latest round: {[company.latestFundingRoundType, company.latestFundingRoundAmount, company.latestFundingRoundDate].filter(Boolean).join(" · ")}
            </p>
          )}
          {(company.totalFunding || company.valuation || company.businessModel) && (
            <p className={styles.companyMeta}>
              {[
                company.totalFunding ? `Total funding ${company.totalFunding}` : "",
                company.valuation ? `Valuation ${company.valuation}` : "",
                company.businessModel || "",
              ].filter(Boolean).join(" · ")}
            </p>
          )}
          {company.keyInvestors?.length ? <p className={styles.companyMeta}>Key investors: {company.keyInvestors.join(", ")}</p> : null}
          {company.nextReview && <p className={styles.companyMeta}>Review: {company.nextReview}</p>}
          {(company.website || company.pitchDeckUrl || company.enrichmentSources?.length) && (
            <div className={styles.companyLinks}>
              {company.website && <a href={company.website} target="_blank" rel="noreferrer">Website</a>}
              {company.pitchDeckUrl && <a href={company.pitchDeckUrl} target="_blank" rel="noreferrer">Pitch deck</a>}
              {company.enrichmentSources?.[0] && <a href={company.enrichmentSources[0]} target="_blank" rel="noreferrer">Research sources ({company.enrichmentSources.length})</a>}
            </div>
          )}
          {company.enrichmentStatus === "pending" && <Spinner className={styles.enrichmentStatus} size="tiny" label="Researching company…" />}
          {company.enrichmentStatus === "failed" && (
            <div className={styles.enrichmentFailure}>
              <span>Research failed{company.enrichmentError ? `: ${company.enrichmentError}` : "."}</span>
              <Button size="small" appearance="subtle" icon={<Search20Regular />} onClick={onEnrich}>Try again</Button>
            </div>
          )}
          {company.notes && <p className={styles.notes}>{company.notes}</p>}
        </div>
        <div className={styles.inlineActions}>
          <Button appearance="subtle" size="small" icon={<Edit20Regular />} aria-label={`Edit ${company.name}`} onClick={onEdit} />
          <Button appearance="subtle" size="small" icon={<Delete20Regular />} aria-label={`Delete ${company.name}`} onClick={onDelete} />
        </div>
      </div>
    </Card>
  );
}
