"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { savePreferences } from "@/actions/preferences";
import { usePreferences } from "@/components/preferences-provider";
import { THEME_COLORS } from "@/lib/preferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// The two settings people change most often. Fonts, scale, radius, layout and
// the sidebar live in the customiser behind the palette icon in the top bar.
const AppearanceCard = () => {
  const { theme, setTheme } = useTheme();
  const { preferences, setPreference, mounted: prefsMounted } = usePreferences();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const persist = (next) =>
    savePreferences(next).catch((error) =>
      console.error("Could not save appearance settings:", error)
    );

  const chooseMode = (value) => {
    setTheme(value);
    const next = setPreference("colorSchema", value);
    if (next) persist(next);
  };

  const chooseColor = (value) => {
    const next = setPreference("themeColor", value);
    if (next) persist(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Saved to your account, so it follows you to another browser or device.
          Use the palette icon in the top bar for fonts, scale, radius and
          layout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
          {MODES.map(({ value, label, icon: Icon }) => {
            const selected = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseMode(value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                  selected && "border-primary ring-1 ring-primary"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
                <Check className={cn("ml-auto h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Theme colour</p>
          <div role="radiogroup" aria-label="Theme colour" className="flex flex-wrap gap-2">
            {THEME_COLORS.map(({ id, label, swatch }) => {
              const selected = prefsMounted && preferences.themeColor === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={label}
                  title={label}
                  onClick={() => chooseColor(id)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-foreground" : "border-transparent"
                  )}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: swatch }}
                  >
                    {selected && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceCard;
