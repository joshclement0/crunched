import * as React from "react";
import { Card } from "@fluentui/react-components";
import { Building20Regular } from "@fluentui/react-icons";
import CompanyCard from "./CompanyCard";
import CompanyForm from "./CompanyForm";
import CompanyQuickAdd from "./CompanyQuickAdd";
import { TrackedCompany } from "./types";
import { useCompanyEditor } from "./useCompanyEditor";
import { useProfileStyles } from "./styles";

interface CompaniesViewProps {
  companies: TrackedCompany[];
  onChange: (companies: TrackedCompany[]) => void;
  onEnrichCompany: (id: string) => void;
}

export default function CompaniesView({ companies, onChange, onEnrichCompany }: CompaniesViewProps) {
  const styles = useProfileStyles();
  const editor = useCompanyEditor(companies, onChange);

  return (
    <div className={styles.stack}>
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div><h2 className={styles.sectionTitle}>Companies</h2><p className={styles.muted}>Your portfolio and watchlist, synced to the Companies sheet.</p></div>
        </div>
        {!editor.isOpen && <CompanyQuickAdd onAdd={editor.openNew} />}
        {editor.isOpen && <CompanyForm draft={editor.draft} isEditing={Boolean(editor.editingId)} onChange={editor.setDraft} onCancel={editor.close} onSave={editor.save} />}
      </Card>
      {!companies.length && !editor.isOpen && <Card className={styles.empty}><Building20Regular /><p>Add the first company you have invested in or want to follow.</p></Card>}
      {companies.map((company) => <CompanyCard key={company.id} company={company} onEdit={() => editor.openEdit(company)} onDelete={() => editor.remove(company.id)} onEnrich={() => onEnrichCompany(company.id)} />)}
    </div>
  );
}
