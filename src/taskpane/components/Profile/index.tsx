import * as React from "react";
import CompaniesView from "./CompaniesView";
import OverviewView from "./OverviewView";
import PreferencesView from "./PreferencesView";
import ProfileLayout, { ProfileView } from "./ProfileLayout";
import { UserProfile } from "./types";

interface ProfileProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export default function Profile({ profile, onChange }: ProfileProps) {
  const [activeView, setActiveView] = React.useState<ProfileView>("overview");
  const updateField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => onChange({ ...profile, [field]: value });

  return (
    <ProfileLayout activeView={activeView} onViewChange={setActiveView}>
      {activeView === "overview" && <OverviewView profile={profile} onFieldChange={updateField} onEditPreferences={() => setActiveView("preferences")} />}
      {activeView === "preferences" && <PreferencesView profile={profile} onFieldChange={updateField} />}
      {activeView === "companies" && <CompaniesView companies={profile.companies} onChange={(companies) => updateField("companies", companies)} />}
    </ProfileLayout>
  );
}
