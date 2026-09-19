import * as React from "react";
import { Button, Card } from "@fluentui/react-components";
import { Building20Regular, Delete20Regular, Edit20Regular } from "@fluentui/react-icons";
import { TrackedCompany } from "./types";
import { useProfileStyles } from "./styles";

interface CompanyCardProps {
  company: TrackedCompany;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CompanyCard({ company, onEdit, onDelete }: CompanyCardProps) {
  const styles = useProfileStyles();

  return (
    <Card className={styles.card}>
      <div className={styles.companyRow}>
        <div className={styles.companyIcon}><Building20Regular /></div>
        <div className={styles.companyBody}>
          <h3 className={styles.companyName}>{company.name}</h3>
          <p className={styles.companyMeta}>{company.sector} · {company.relationship === "invested" ? "Portfolio" : "Following"}{company.investedAmount ? ` · ${company.investedAmount}` : ""}</p>
          {company.nextReview && <p className={styles.companyMeta}>Review: {company.nextReview}</p>}
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
