import * as React from "react";
import { Badge, Button, Card, Field, Input, Textarea } from "@fluentui/react-components";
import { Target20Regular } from "@fluentui/react-icons";
import { UserProfile } from "./types";
import { useProfileStyles } from "./styles";

interface OverviewViewProps {
  profile: UserProfile;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  onEditPreferences: () => void;
}

export default function OverviewView({ profile, onFieldChange, onEditPreferences }: OverviewViewProps) {
  const styles = useProfileStyles();
  const investedCount = profile.companies.filter((company) => company.relationship === "invested").length;
  const followingCount = profile.companies.filter((company) => company.relationship === "following").length;

  return (
    <div className={styles.stack}>
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div><h2 className={styles.sectionTitle}>{profile.name ? `${profile.name}'s profile` : "Your investor profile"}</h2><p className={styles.muted}>The signal behind future company alerts.</p></div>
          <Target20Regular />
        </div>
        <div className={styles.formGrid}>
          <Field label="Name"><Input value={profile.name} placeholder="Your name" onChange={(_, data) => onFieldChange("name", data.value)} /></Field>
          <Field label="Investment thesis" hint="A short description of what makes a company interesting to you.">
            <Textarea resize="vertical" value={profile.investmentThesis} placeholder="I invest in capital-efficient Nordic companies that..." onChange={(_, data) => onFieldChange("investmentThesis", data.value)} />
          </Field>
        </div>
      </Card>
      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statNumber}>{investedCount}</span><span className={styles.statLabel}>Invested</span></div>
        <div className={styles.stat}><span className={styles.statNumber}>{followingCount}</span><span className={styles.statLabel}>Following</span></div>
        <div className={styles.stat}><span className={styles.statNumber}>{profile.sectors.length}</span><span className={styles.statLabel}>Sectors</span></div>
      </div>
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div><h2 className={styles.sectionTitle}>Sector radar</h2><p className={styles.muted}>Areas you want to follow or work in.</p></div>
          <Button appearance="subtle" size="small" onClick={onEditPreferences}>Edit</Button>
        </div>
        <div className={styles.chips}>
          {profile.sectors.length ? profile.sectors.map((sector) => <Badge key={sector} appearance="tint" color="success">{sector}</Badge>) : <span className={styles.muted}>No sectors selected yet.</span>}
        </div>
      </Card>
      <div className={styles.callout}><p className={styles.calloutText}><strong>Notification foundation ready.</strong> Your preferences and company lists can now be used to rank news, funding rounds, leadership changes, and follow-up reminders.</p></div>
    </div>
  );
}
