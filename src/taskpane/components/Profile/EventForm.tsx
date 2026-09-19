import * as React from "react";
import { Button, Field, Input, Textarea } from "@fluentui/react-components";
import { CompanyEvent, SignalImpact, TrackedCompany } from "./types";
import { useProfileStyles } from "./styles";

interface EventFormProps {
  companies: TrackedCompany[];
  signals: string[];
  onAdd: (event: CompanyEvent) => void;
}

export default function EventForm({ companies, signals, onAdd }: EventFormProps) {
  const styles = useProfileStyles();
  const [open, setOpen] = React.useState(false);
  const [companyName, setCompanyName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [signal, setSignal] = React.useState(signals[0] || "Other");
  const [impact, setImpact] = React.useState<SignalImpact>("neutral");
  const [occurredAt, setOccurredAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [informationLocation, setInformationLocation] = React.useState("");

  const save = () => {
    if (!companyName || !title.trim()) return;
    onAdd({ id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, companyName,
      title: title.trim(), details: details.trim(), signal, impact, occurredAt,
      informationLocation: informationLocation.trim(), createdAt: new Date().toISOString() });
    setTitle(""); setDetails(""); setInformationLocation(""); setImpact("neutral"); setOpen(false);
  };

  if (!open) return <Button appearance="secondary" disabled={!companies.length} onClick={() => { setCompanyName(companies[0]?.name || ""); setOpen(true); }}>Add event</Button>;
  return (
    <div className={styles.eventForm}>
      <Field label="Company" required><select className={styles.select} value={companyName} onChange={(event) => setCompanyName(event.target.value)}>{companies.map((company) => <option key={company.id}>{company.name}</option>)}</select></Field>
      <Field label="What happened?" required><Input value={title} placeholder="e.g. Announced a Series A" onChange={(_, data) => setTitle(data.value)} /></Field>
      <div className={styles.twoColumns}>
        <Field label="Signal"><select className={styles.select} value={signal} onChange={(event) => setSignal(event.target.value)}>{signals.map((item) => <option key={item}>{item}</option>)}<option>Other</option></select></Field>
        <Field label="Impact"><select className={styles.select} value={impact} onChange={(event) => setImpact(event.target.value as SignalImpact)}><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select></Field>
      </div>
      <Field label="Event date"><Input type="date" value={occurredAt} onChange={(_, data) => setOccurredAt(data.value)} /></Field>
      <Field label="Information location" hint="URL, email, meeting, or word of mouth"><Input value={informationLocation} placeholder="https://… or ‘Email from founder’" onChange={(_, data) => setInformationLocation(data.value)} /></Field>
      <Field label="Details"><Textarea resize="vertical" value={details} onChange={(_, data) => setDetails(data.value)} /></Field>
      <div className={styles.formActions}><Button onClick={() => setOpen(false)}>Cancel</Button><Button appearance="primary" disabled={!companyName || !title.trim()} onClick={save}>Save event</Button></div>
    </div>
  );
}
