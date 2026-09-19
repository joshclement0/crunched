import * as React from "react";
import { Badge, Button, Card } from "@fluentui/react-components";
import { Alert20Regular, ArrowRight20Regular } from "@fluentui/react-icons";
import { urgentCompanies } from "../../workbookModel";
import { UserProfile } from "./types";
import { useProfileStyles } from "./styles";

interface OverviewViewProps {
  profile: UserProfile;
  onOpenCompanies: () => void;
  onEditPreferences: () => void;
}

export default function OverviewView({ profile, onOpenCompanies, onEditPreferences }: OverviewViewProps) {
  const styles = useProfileStyles();
  const investedCount = profile.companies.filter((company) => company.relationship === "invested").length;
  const followingCount = profile.companies.filter((company) => company.relationship === "following").length;
  const urgent = urgentCompanies(profile).slice(0, 3);

  return (
    <div className={styles.stack}>
      <div className={styles.stats}>
        <button type="button" className={styles.statButton} onClick={onOpenCompanies}><span className={styles.statNumber}>{investedCount}</span><span className={styles.statLabel}>Invested</span></button>
        <button type="button" className={styles.statButton} onClick={onOpenCompanies}><span className={styles.statNumber}>{followingCount}</span><span className={styles.statLabel}>Following</span></button>
        <button type="button" className={styles.statButton} onClick={onEditPreferences}><span className={styles.statNumber}>{profile.radarCompanies.length}</span><span className={styles.statLabel}>Radar</span></button>
      </div>
      <Card className={styles.card}>
        <div className={styles.cardHeader}><div><h2 className={styles.sectionTitle}>Needs attention</h2><p className={styles.muted}>Your three most urgent companies, ranked from events and review dates.</p></div><Alert20Regular /></div>
        <div className={styles.attentionList}>
          {urgent.map((company, index) => <div className={styles.attentionRow} key={company.name}><span className={styles.rank}>{index + 1}</span><div className={styles.companyBody}><h3 className={styles.companyName}>{company.name}</h3><p className={styles.companyMeta}>{company.relationship} · {company.sector}</p></div><Badge appearance="tint" color={company.score >= 30 ? "danger" : company.score ? "warning" : "informative"}>{company.score}</Badge></div>)}
          {!urgent.length && <p className={styles.emptyText}>Add a company or radar target to start the overview.</p>}
        </div>
        <Button appearance="subtle" icon={<ArrowRight20Regular />} iconPosition="after" onClick={onOpenCompanies}>Open companies</Button>
      </Card>
      <Card className={styles.card}>
        <div className={styles.cardHeader}><div><h2 className={styles.sectionTitle}>Latest signals</h2><p className={styles.muted}>Recent events across the companies you track.</p></div></div>
        <div className={styles.eventList}>
          {[...profile.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 4).map((event) => <div className={styles.eventRow} key={event.id}><span className={`${styles.impactDot} ${event.impact === "negative" ? styles.negative : event.impact === "positive" ? styles.positive : styles.neutral}`} /><div><strong>{event.companyName}</strong><p>{event.title}</p><small>{event.occurredAt} · {event.signal}</small></div></div>)}
          {!profile.events.length && <p className={styles.emptyText}>No events yet. Add one from the Companies tab.</p>}
        </div>
      </Card>
    </div>
  );
}
