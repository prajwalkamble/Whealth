"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { usePreferences } from "./preferences-provider";
import { normalise } from "@/lib/preferences";

// Applies the appearance settings saved on the account, once per page load.
//
// The browser's own copy is what avoids a flash, since it is read before the
// first paint. This only matters on a browser that has not seen this account:
// it picks up the settings chosen elsewhere. Afterwards the two agree, because
// the customiser writes to both.
const PreferencesSync = ({ saved }) => {
  const { setTheme } = useTheme();
  const { setPreferences } = usePreferences();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !saved) return;
    applied.current = true;

    const preferences = normalise(saved);
    setPreferences(preferences);
    setTheme(preferences.colorSchema);
  }, [saved, setPreferences, setTheme]);

  return null;
};

export default PreferencesSync;
