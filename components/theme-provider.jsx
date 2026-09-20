"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes sets class="dark" on <html> before the page paints, which is why
// the root layout marks <html> with suppressHydrationWarning: the server cannot
// know which class that script will add.
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
