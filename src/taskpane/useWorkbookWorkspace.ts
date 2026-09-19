import * as React from "react";
import { UserProfile } from "./components/Profile/types";
import { initialiseWorkspace, readManagedWorkspace, writeWorkspace } from "./workbookModel";

/* global console, window */

export function useWorkbookWorkspace(
  profile: UserProfile,
  onInitialised: (profile: UserProfile) => void
) {
  const [isInitialising, setIsInitialising] = React.useState(true);
  const [error, setError] = React.useState("");
  const initialised = React.useRef(false);
  const profileRef = React.useRef(profile);
  React.useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  React.useEffect(() => {
    let cancelled = false;
    void initialiseWorkspace(profile)
      .then((loaded) => {
        if (cancelled) return;
        initialised.current = true;
        onInitialised(loaded);
        setIsInitialising(false);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Workbook setup failed");
        setIsInitialising(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!initialised.current) return undefined;
    const timer = window.setTimeout(() => {
      void writeWorkspace(profile).catch((reason: unknown) => {
        console.warn("Unable to update the investor workspace sheets.", reason);
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [profile]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (!initialised.current) return;
      void readManagedWorkspace(profileRef.current)
        .then((workbookProfile) => {
          const currentSignature = JSON.stringify({
            companies: profileRef.current.companies,
            events: profileRef.current.events,
          });
          const workbookSignature = JSON.stringify({
            companies: workbookProfile.companies,
            events: workbookProfile.events,
          });
          if (currentSignature !== workbookSignature) onInitialised(workbookProfile);
        })
        .catch((reason: unknown) => console.warn("Unable to read workbook edits.", reason));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [onInitialised]);

  return { isInitialising, error };
}
