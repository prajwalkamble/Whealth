"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { savePreferences } from "@/actions/preferences";
import { usePreferences } from "./preferences-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// persist: whether to save the choice against the account as well as applying
// it locally. It arrives as a prop rather than from useAuth(), because this
// toggle sits in the public header and useAuth() requires a ClerkProvider --
// which is exactly what the public pages no longer mount. The theme still
// changes for a logged-out visitor; there is simply no account to write to.
const ThemeToggle = ({ persist = false }) => {
  const { theme, setTheme } = useTheme();
  const { setPreference } = usePreferences();
  // theme is only known in the browser, so the checkmark waits for mount
  // rather than rendering something the server did not.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const choose = (value) => {
    setTheme(value);
    const next = setPreference("colorSchema", value);

    // Saved against the account so the choice follows the user to another
    // browser or device. It is a preference, not something to interrupt them
    // over: the theme has already changed locally either way.
    if (persist && next) {
      savePreferences(next).catch((error) =>
        console.error("Could not save the theme preference:", error)
      );
    }
  };

  // Until mounted, render a plain button rather than the dropdown. Radix
  // builds its ids with useId, and when the server's tree and the first
  // client tree differ at all those ids diverge, which React reports as a
  // hydration failure and then trips over while patching the DOM. A
  // placeholder of the same size keeps the header from shifting.
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled aria-hidden>
        <Sun className="h-5 w-5" />
        <span className="sr-only">Change theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            className="cursor-pointer"
            onClick={() => choose(value)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                mounted && theme === value ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
