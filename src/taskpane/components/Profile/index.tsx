import * as React from "react";
import ChatView from "../Chat/ChatView";
import CompaniesView from "./CompaniesView";
import OverviewView from "./OverviewView";
import PreferencesView from "./PreferencesView";
import ProfileLayout, { ProfileView } from "./ProfileLayout";
import { UserProfile } from "./types";

interface ProfileProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  onEnrichCompany: (id: string) => void;
}

export default function Profile({ profile, onChange, onEnrichCompany }: ProfileProps) {
  const [activeView, setActiveView] = React.useState<ProfileView>("overview");
  const updateField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => onChange({ ...profile, [field]: value });

  return (
    <ProfileLayout activeView={activeView} onViewChange={setActiveView}>
      {activeView === "overview" && <OverviewView profile={profile} onOpenCompanies={() => setActiveView("companies")} onEditPreferences={() => setActiveView("preferences")} />}
      {activeView === "preferences" && <PreferencesView profile={profile} onFieldChange={updateField} />}
      {activeView === "companies" && <CompaniesView companies={profile.companies} events={profile.events} signals={profile.signals} onChange={(companies) => updateField("companies", companies)} onAddEvent={(event) => updateField("events", [event, ...profile.events])} onEnrichCompany={onEnrichCompany} />}
      {activeView === "chat" && <ChatView />}
    </ProfileLayout>
  );
}
