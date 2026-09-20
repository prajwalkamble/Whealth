"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

// Applies the theme saved on the user's account once per page load.
//
// next-themes reads localStorage before the first paint, so the browser's own
// copy is what avoids a flash. This only matters on a browser that has never
// seen this account: it picks up the choice made elsewhere. Afterwards the two
// agree, because the toggle writes to both.
const ThemeSync = ({ preferred }) => {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !preferred) return;
    applied.current = true;
    setTheme(preferred);
  }, [preferred, setTheme]);

  return null;
};

export default ThemeSync;
