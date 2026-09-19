import * as React from "react";
import { Button, Card, Input } from "@fluentui/react-components";
import { Add20Regular, Delete16Regular } from "@fluentui/react-icons";
import { useProfileStyles } from "./styles";

interface EditableListProps {
  label: string;
  description: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}

export default function EditableList({ label, description, items, placeholder, onChange }: EditableListProps) {
  const styles = useProfileStyles();
  const [value, setValue] = React.useState("");
  const add = () => {
    const item = value.trim();
    if (!item || items.some((candidate) => candidate.toLowerCase() === item.toLowerCase())) return;
    onChange([...items, item]);
    setValue("");
  };

  return (
    <Card className={styles.card}>
      <h2 className={styles.sectionTitle}>{label}</h2>
      <p className={styles.muted}>{description}</p>
      <div className={styles.addRow}>
        <Input value={value} placeholder={placeholder} onChange={(_, data) => setValue(data.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} />
        <Button appearance="primary" icon={<Add20Regular />} onClick={add} disabled={!value.trim()}>Add</Button>
      </div>
      <div className={styles.editableChips}>
        {items.map((item) => (
          <span className={styles.editableChip} key={item}>
            {item}
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter((candidate) => candidate !== item))}><Delete16Regular /></button>
          </span>
        ))}
        {!items.length && <span className={styles.muted}>Nothing on this radar yet.</span>}
      </div>
    </Card>
  );
}
