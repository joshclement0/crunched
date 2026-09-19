import * as React from "react";
import { useProfileStyles } from "./styles";

export type ProfileView = "overview" | "preferences" | "companies";

interface ProfileLayoutProps {
  activeView: ProfileView;
  onViewChange: (view: ProfileView) => void;
  children: React.ReactNode;
}

const VIEW_LABELS: Record<ProfileView, string> = {
  overview: "Overview",
  preferences: "Preferences",
  companies: "Companies",
};

export default function ProfileLayout({ activeView, onViewChange, children }: ProfileLayoutProps) {
  const styles = useProfileStyles();
  const views = Object.keys(VIEW_LABELS) as ProfileView[];

  return (
    <section className={styles.content}>
      <nav className={styles.tabs} aria-label="Investment profile sections">
        {views.map((view) => (
          <button type="button" key={view} className={`${styles.tab} ${activeView === view ? styles.activeTab : ""}`} onClick={() => onViewChange(view)}>
            {VIEW_LABELS[view]}
          </button>
        ))}
      </nav>
      {children}
    </section>
  );
}
