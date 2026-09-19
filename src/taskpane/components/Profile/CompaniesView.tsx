import * as React from "react";
import { Card } from "@fluentui/react-components";
import { Building20Regular } from "@fluentui/react-icons";
import CompanyCard from "./CompanyCard";
import CompanyForm from "./CompanyForm";
import CompanyQuickAdd from "./CompanyQuickAdd";
import EventForm from "./EventForm";
import { CompanyEvent, TrackedCompany } from "./types";
import { useCompanyEditor } from "./useCompanyEditor";
import { useProfileStyles } from "./styles";

interface CompaniesViewProps {
  companies: TrackedCompany[];
  onChange: (companies: TrackedCompany[]) => void;
  onEnrichCompany: (id: string) => void;
  events: CompanyEvent[];
  signals: string[];
  onAddEvent: (event: CompanyEvent) => void;
}

export default function CompaniesView({ companies, onChange, onEnrichCompany, events, signals, onAddEvent }: CompaniesViewProps) {
  const styles = useProfileStyles();
  const editor = useCompanyEditor(companies, onChange);

  return (
    <div className={styles.stack}>
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div><h2 className={styles.sectionTitle}>Companies</h2><p className={styles.muted}>Your portfolio and watchlist, synced to the Companies sheet.</p></div>
        </div>
        {!editor.isOpen && <div className={styles.companyActions}><CompanyQuickAdd onAdd={editor.openNew} /><EventForm companies={companies} signals={signals} onAdd={onAddEvent} /></div>}
        {editor.isOpen && <CompanyForm draft={editor.draft} isEditing={Boolean(editor.editingId)} onChange={editor.setDraft} onCancel={editor.close} onSave={editor.save} />}
      </Card>
      {!companies.length && !editor.isOpen && <Card className={styles.empty}><Building20Regular /><p>Add the first company you have invested in or want to follow.</p></Card>}
      {companies.map((company) => <CompanyCard key={company.id} company={company} onEdit={() => editor.openEdit(company)} onDelete={() => editor.remove(company.id)} onEnrich={() => onEnrichCompany(company.id)} />)}
      {!!events.length && <Card className={styles.card}><h2 className={styles.sectionTitle}>Recent events</h2><div className={styles.eventList}>{[...events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 8).map((event) => <div className={styles.eventRow} key={event.id}><span className={`${styles.impactDot} ${event.impact === "negative" ? styles.negative : event.impact === "positive" ? styles.positive : styles.neutral}`} /><div><strong>{event.companyName} · {event.signal}</strong><p>{event.title}</p><small>{event.occurredAt}{event.informationLocation ? ` · ${event.informationLocation}` : ""}</small></div></div>)}</div></Card>}
    </div>
  );
}
