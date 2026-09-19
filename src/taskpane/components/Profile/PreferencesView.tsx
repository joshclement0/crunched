import * as React from "react";
import EditableList from "./EditableList";
import { UserProfile } from "./types";
import { useProfileStyles } from "./styles";

interface PreferencesViewProps {
  profile: UserProfile;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
}

export default function PreferencesView({ profile, onFieldChange }: PreferencesViewProps) {
  const styles = useProfileStyles();
  return (
    <div className={styles.stack}>
      <div className={styles.intro}><h2>Radar preferences</h2><p>These choices shape which companies and startup events rise to the top.</p></div>
      <EditableList label="Sector radar" description="Sectors selected here are combined with sectors from your tracked companies." items={profile.sectors} placeholder="Add a sector" onChange={(items) => onFieldChange("sectors", items)} />
      <EditableList label="Signals" description="Event categories the assistant should classify and watch for." items={profile.signals} placeholder="Add a signal" onChange={(items) => onFieldChange("signals", items)} />
      <EditableList label="Additional companies" description="Companies to keep on the radar before adding them to the tracked list." items={profile.radarCompanies} placeholder="Add a company" onChange={(items) => onFieldChange("radarCompanies", items)} />
    </div>
  );
}
