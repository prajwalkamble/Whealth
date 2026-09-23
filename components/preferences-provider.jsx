"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  applyPreferences,
  isValid,
  normalise,
} from "@/lib/preferences";

const PreferencesContext = createContext({
  preferences: DEFAULT_PREFERENCES,
  setPreference: () => {},
  setPreferences: () => {},
  mounted: false,
});

const read = () => {
  try {
    return normalise(JSON.parse(window.localStorage.getItem(STORAGE_KEY)));
  } catch {
    // Missing, corrupt, or blocked storage: the defaults are fine.
    return DEFAULT_PREFERENCES;
  }
};

const write = (preferences) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Not being able to remember them is not worth failing over.
  }
};

// Holds every appearance setting except the light/dark choice, which
// next-themes owns. The data-* attributes are already on <html> from the
// script in the root layout; this keeps React in step and persists changes.
export function PreferencesProvider({ children }) {
  const [preferences, setState] = useState(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);

  // The current set, readable synchronously. A state updater runs on the next
  // render, so building the new set inside one returned undefined to the
  // caller -- which is how every change failed to reach the account, and why
  // the next page load put the old settings back.
  const current = useRef(DEFAULT_PREFERENCES);

  const commit = useCallback((next) => {
    current.current = next;
    setState(next);
    applyPreferences(next);
    write(next);
    return next;
  }, []);

  useEffect(() => {
    const stored = read();
    current.current = stored;
    setState(stored);
    applyPreferences(stored);
    setMounted(true);
  }, []);

  const setPreferences = useCallback(
    (next) => commit(normalise(next)),
    [commit]
  );

  const setPreference = useCallback(
    (key, value) => {
      if (!isValid(key, value)) return null;
      return commit({ ...current.current, [key]: value });
    },
    [commit]
  );

  return (
    <PreferencesContext.Provider
      value={{ preferences, setPreference, setPreferences, mounted }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
