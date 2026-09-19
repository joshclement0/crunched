import * as React from "react";
import ChoiceGroup from "./ChoiceGroup";
import { GEOGRAPHY_OPTIONS, QUALITY_OPTIONS, SECTOR_OPTIONS, STAGE_OPTIONS, UserProfile } from "./types";
import { useProfileStyles } from "./styles";

interface PreferencesViewProps {
  profile: UserProfile;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
}

export default function PreferencesView({ profile, onFieldChange }: PreferencesViewProps) {
  const styles = useProfileStyles();

  return (
    <div className={styles.stack}>
      <ChoiceGroup label="Sectors" description="Choose the sectors you invest in or want to work with." options={SECTOR_OPTIONS} selected={profile.sectors} onChange={(value) => onFieldChange("sectors", value)} />
      <ChoiceGroup label="Company stage" description="What maturity levels normally fit your investment style?" options={STAGE_OPTIONS} selected={profile.stages} onChange={(value) => onFieldChange("stages", value)} />
      <ChoiceGroup label="Geography" description="Where should companies have their main footprint?" options={GEOGRAPHY_OPTIONS} selected={profile.geographies} onChange={(value) => onFieldChange("geographies", value)} />
      <ChoiceGroup label="Company qualities" description="Signals you consistently value when evaluating a company." options={QUALITY_OPTIONS} selected={profile.companyQualities} onChange={(value) => onFieldChange("companyQualities", value)} />
    </div>
  );
}
