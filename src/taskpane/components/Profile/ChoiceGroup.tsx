import * as React from "react";
import { Card } from "@fluentui/react-components";
import { useProfileStyles } from "./styles";

interface ChoiceGroupProps {
  label: string;
  description: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}

export default function ChoiceGroup({ label, description, options, selected, onChange }: ChoiceGroupProps) {
  const styles = useProfileStyles();
  const toggle = (option: string) => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);

  return (
    <Card className={styles.card}>
      <h2 className={styles.sectionTitle}>{label}</h2>
      <p className={styles.muted}>{description}</p>
      <div className={styles.chips}>
        {options.map((option) => (
          <button type="button" key={option} className={`${styles.chip} ${selected.includes(option) ? styles.selectedChip : ""}`} aria-pressed={selected.includes(option)} onClick={() => toggle(option)}>
            {option}
          </button>
        ))}
      </div>
    </Card>
  );
}
