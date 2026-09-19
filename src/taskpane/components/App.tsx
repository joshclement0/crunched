import * as React from "react";
import Profile from "./Profile";
import { makeStyles, tokens } from "@fluentui/react-components";
import { EMPTY_PROFILE, UserProfile } from "./Profile/types";
import { useWorkbookPreferences } from "../useWorkbookPreferences";
import { mergeWorkbookPreferences, WorkbookPreferences } from "../workbookPreferences";
import { useWorkbookCompanies } from "../useWorkbookCompanies";
import { useCompanyEnrichment } from "../companyEnrichment";
import { TrackedCompany } from "./Profile/types";

interface AppProps {
  title: string;
}

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    backgroundColor: "#f4f7f5",
    color: tokens.colorNeutralForeground1,
  },
  topBar: {
    padding: "22px 20px 18px",
    color: "white",
    backgroundImage: "linear-gradient(135deg, #12382f 0%, #1f5d4d 100%)",
  },
  eyebrow: {
    margin: 0,
    color: "#a9d5c7",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
  },
  title: {
    margin: "5px 0 4px",
    fontSize: "24px",
    lineHeight: 1.2,
    fontWeight: 650,
  },
  subtitle: {
    margin: 0,
    color: "#d9ebe5",
    fontSize: "13px",
    lineHeight: 1.45,
  },
});

const STORAGE_KEY = "investor-profile.v1";

function loadProfile(): UserProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("user");
    if (!stored) return EMPTY_PROFILE;
    const parsed = JSON.parse(stored) as Partial<UserProfile>;
    return {
      ...EMPTY_PROFILE,
      ...parsed,
      sectors: Array.isArray(parsed.sectors) ? parsed.sectors : [],
      stages: Array.isArray(parsed.stages) ? parsed.stages : [],
      geographies: Array.isArray(parsed.geographies) ? parsed.geographies : [],
      companyQualities: Array.isArray(parsed.companyQualities) ? parsed.companyQualities : [],
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

const App: React.FC<AppProps> = ({ title }) => {
  const styles = useStyles();
  const [profile, setProfile] = React.useState<UserProfile>(loadProfile);

  const saveProfile = React.useCallback((updatedProfile: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
    return updatedProfile;
  }, []);

  const updateProfile = React.useCallback((updatedProfile: UserProfile) => {
    setProfile(saveProfile(updatedProfile));
  }, [saveProfile]);

  const updatePreferencesFromWorkbook = React.useCallback(
    (workbookPreferences: WorkbookPreferences) => {
      setProfile((currentProfile) =>
        saveProfile(mergeWorkbookPreferences(currentProfile, workbookPreferences))
      );
    },
    [saveProfile]
  );

  useWorkbookPreferences(updatePreferencesFromWorkbook);
  useWorkbookCompanies(profile.companies);

  const updateCompany = React.useCallback(
    (id: string, updater: (company: TrackedCompany) => TrackedCompany) => {
      setProfile((currentProfile) =>
        saveProfile({
          ...currentProfile,
          companies: currentProfile.companies.map((company) =>
            company.id === id ? updater(company) : company
          ),
        })
      );
    },
    [saveProfile]
  );
  const companyEnrichment = useCompanyEnrichment(profile.companies, updateCompany);

  return (
    <main className={styles.root}>
      <header className={styles.topBar}>
        <p className={styles.eyebrow}>{title}</p>
        <h1 className={styles.title}>Investment radar</h1>
        <p className={styles.subtitle}>Keep your thesis, portfolio, and companies to watch in one place.</p>
      </header>
      <Profile profile={profile} onChange={updateProfile} onEnrichCompany={companyEnrichment.retry} />
    </main>
  );
};

export default App;
