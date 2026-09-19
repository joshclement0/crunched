import * as React from "react";
import { Button, Field, Input, Textarea } from "@fluentui/react-components";
import { CompanyDraft, CompanyRelationship, SECTOR_OPTIONS } from "./types";
import { useProfileStyles } from "./styles";

interface CompanyFormProps {
  draft: CompanyDraft;
  isEditing: boolean;
  onChange: (draft: CompanyDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function CompanyForm({ draft, isEditing, onChange, onCancel, onSave }: CompanyFormProps) {
  const styles = useProfileStyles();
  const update = <K extends keyof CompanyDraft>(field: K, value: CompanyDraft[K]) => onChange({ ...draft, [field]: value });

  return (
    <div className={styles.formGrid}>
      <Field label="Company name" required><Input autoFocus value={draft.name} onChange={(_, data) => update("name", data.value)} /></Field>
      <Field label="Relationship">
        <select className={styles.select} value={draft.relationship} onChange={(event) => update("relationship", event.target.value as CompanyRelationship)}>
          <option value="following">Following</option><option value="invested">Invested</option>
        </select>
      </Field>
      <Field label="Sector">
        <select className={styles.select} value={draft.sector} onChange={(event) => update("sector", event.target.value)}>
          <option value="">Select a sector</option>{SECTOR_OPTIONS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
        </select>
      </Field>
      {draft.relationship === "invested" && <Field label="Amount invested" hint="Optional; use any currency."><Input value={draft.investedAmount} placeholder="e.g. NOK 50,000" onChange={(_, data) => update("investedAmount", data.value)} /></Field>}
      <Field label="Website"><Input type="url" value={draft.website} placeholder="https://" onChange={(_, data) => update("website", data.value)} /></Field>
      <Field label="Pitch deck"><Input type="url" value={draft.pitchDeckUrl} placeholder="https://" onChange={(_, data) => update("pitchDeckUrl", data.value)} /></Field>
      <Field label="Next review date"><Input type="date" value={draft.nextReview} onChange={(_, data) => update("nextReview", data.value)} /></Field>
      <Field label="Notes"><Textarea resize="vertical" value={draft.notes} placeholder="Why this company matters, what to follow up on..." onChange={(_, data) => update("notes", data.value)} /></Field>
      <div className={styles.formActions}>
        <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
        <Button appearance="primary" disabled={!draft.name.trim()} onClick={onSave}>{isEditing ? "Save changes" : "Add company"}</Button>
      </div>
    </div>
  );
}
