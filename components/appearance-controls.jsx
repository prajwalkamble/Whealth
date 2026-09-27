"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@clerk/nextjs";
import { RotateCcw, Shuffle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { usePreferences } from "./preferences-provider";
import { savePreferences } from "@/actions/preferences";
import {
  CHART_COLORS,
  COLOR_SCHEMAS,
  CONTENT_LAYOUTS,
  DEFAULT_PREFERENCES,
  DISPLAY_FONTS,
  randomPreferences,
  resetPreferences,
  FONTS,
  RADII,
  SCALES,
  SIDEBAR_COLLAPSIBLE,
  SIDEBAR_VARIANTS,
  THEME_COLORS,
} from "@/lib/preferences";
import { cn } from "@/lib/utils";

// Every appearance setting, in one place, so the panel behind the palette icon
// and the Appearance card in Settings offer exactly the same controls rather
// than drifting apart as two copies.

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-medium">{title}</h3>
    {children}
  </section>
);

// The five shades of a chart ramp as circles, lightest on the left to darkest
// on the right, so each option shows what its charts will actually look like.
// The ramp is stored darkest first (series 1 is the strongest), so it is
// reversed for display.
const ShadeStrip = ({ shades }) => (
  <span className="flex shrink-0 items-center -space-x-1">
    {[...shades].reverse().map((colour) => (
      <span
        key={colour}
        className="h-4 w-4 rounded-full border-2 border-background"
        style={{ backgroundColor: colour }}
      />
    ))}
  </span>
);

const Dropdown = ({
  label,
  value,
  options,
  onChange,
  withSwatch = false,
  withShades = false,
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label}>
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent className="max-h-72">
      {options.map((option) => (
        <SelectItem key={option.id} value={option.id} className="cursor-pointer">
          <span className="flex items-center gap-2">
            {withShades && option.shades && <ShadeStrip shades={option.shades} />}
            {withSwatch && !withShades && (
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border"
                style={{ backgroundColor: option.swatch }}
              />
            )}
            {option.label}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const Choice = ({ selected, onClick, className, children, label }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-label={label}
    onClick={onClick}
    className={cn(
      "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent",
      selected && "border-primary ring-1 ring-primary",
      className
    )}
  >
    {children}
  </button>
);

// Every choice applies immediately and, when signed in, is saved to the
// account so it follows the user to another browser. A failed save leaves the
// local change in place rather than interrupting.
export function useAppearance() {
  const { theme, setTheme } = useTheme();
  const { preferences, setPreference, setPreferences, mounted: prefsMounted } =
    usePreferences();
  const { isSignedIn } = useAuth();

  // The theme is only known in the browser, so selected states wait for mount
  // rather than rendering something the server did not.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const persist = (next) => {
    if (!isSignedIn) return;
    savePreferences(next).catch((error) =>
      console.error("Could not save appearance settings:", error)
    );
  };

  const choose = (key, value) => {
    const next = setPreference(key, value);
    if (next) persist(next);
  };

  const chooseSchema = (value) => {
    setTheme(value);
    const next = setPreference("colorSchema", value);
    if (next) persist(next);
  };

  // Shuffles the visual settings. Scale, colour schema, layout and the
  // sidebar keep their values, since a surprise change to those is
  // disorienting rather than fun.
  const randomise = () => persist(setPreferences(randomPreferences(preferences)));

  // Resets the look but keeps light/dark as it is: someone reading in dark
  // mode should not be thrown into light (or back to following the system)
  // just for clearing a colour or a font.
  const reset = () => persist(setPreferences(resetPreferences(preferences, theme)));

  const ready = mounted && prefsMounted;
  const is = (key, value) => ready && preferences[key] === value;

  // Colour schema is left out on purpose, since reset does not touch it --
  // otherwise the button would never enable back in dark mode.
  const isDefault =
    ready &&
    Object.entries(DEFAULT_PREFERENCES).every(
      ([key, value]) => key === "colorSchema" || preferences[key] === value
    );

  return {
    ready,
    theme,
    preferences,
    choose,
    chooseSchema,
    randomise,
    reset,
    is,
    isDefault,
  };
}

// The caller owns the layout entirely. There used to be a built-in
// `space-y-6` here, merged with whatever the caller passed -- and because
// space-y sets margin-top on every child but the first, a two-column grid got
// its second section pushed 24px below its first: Chart Colors sat lower than
// Theme Color. Spacing between grid cells is the grid's gap, not a margin.
export function AppearanceSections({ appearance, className }) {
  const { preferences, choose, chooseSchema, is, theme, ready } = appearance;

  return (
    <div className={className}>
      <Section title="Theme Color">
        <Dropdown
          label="Theme Color"
          value={preferences.themeColor}
          options={THEME_COLORS}
          onChange={(value) => choose("themeColor", value)}
          withSwatch
        />
      </Section>

      <Section title="Chart Colors">
        <Dropdown
          label="Chart Colors"
          value={preferences.chartColors}
          options={CHART_COLORS}
          onChange={(value) => choose("chartColors", value)}
          withShades
        />
      </Section>

      <Section title="Font">
        <Dropdown
          label="Font"
          value={preferences.font}
          options={FONTS}
          onChange={(value) => choose("font", value)}
        />
      </Section>

      <Section title="Display Font">
        <Dropdown
          label="Display Font"
          value={preferences.displayFont}
          options={DISPLAY_FONTS}
          onChange={(value) => choose("displayFont", value)}
        />
      </Section>

      <Section title="Scale">
        <div role="radiogroup" aria-label="Scale" className="grid grid-cols-5 gap-2">
          {SCALES.map(({ id, label }) => (
            <Choice
              key={id}
              label={label}
              selected={is("scale", id)}
              onClick={() => choose("scale", id)}
              className="px-1 text-xs"
            >
              {label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div role="radiogroup" aria-label="Radius" className="grid grid-cols-5 gap-2">
          {RADII.map(({ id, label }) => (
            <Choice
              key={id}
              label={label}
              selected={is("radius", id)}
              onClick={() => choose("radius", id)}
              className="flex-col gap-1 px-1 py-2"
            >
              <span
                className="h-5 w-5 border-2 border-foreground/70"
                style={{ borderRadius: `${id}rem` }}
              />
              <span className="text-[10px] leading-none">{label}</span>
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Color Schema">
        <div role="radiogroup" aria-label="Color Schema" className="grid grid-cols-3 gap-2">
          {COLOR_SCHEMAS.map(({ id, label }) => (
            <Choice
              key={id}
              label={label}
              selected={ready && theme === id}
              onClick={() => chooseSchema(id)}
            >
              {label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Content Layout">
        <div role="radiogroup" aria-label="Content Layout" className="grid grid-cols-2 gap-2">
          {CONTENT_LAYOUTS.map(({ id, label }) => (
            <Choice
              key={id}
              label={label}
              selected={is("contentLayout", id)}
              onClick={() => choose("contentLayout", id)}
            >
              {label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Sidebar Collapse">
        <div role="radiogroup" aria-label="Sidebar Collapse" className="grid grid-cols-3 gap-2">
          {SIDEBAR_COLLAPSIBLE.map(({ id, label }) => (
            <Choice
              key={id}
              label={label}
              selected={is("sidebarCollapsible", id)}
              onClick={() => choose("sidebarCollapsible", id)}
              className="px-1 text-xs"
            >
              {label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Sidebar Variant">
        <div role="radiogroup" aria-label="Sidebar Variant" className="grid grid-cols-3 gap-2">
          {SIDEBAR_VARIANTS.map(({ id, label }) => (
            <Choice
              key={id}
              label={label}
              selected={is("sidebarVariant", id)}
              onClick={() => choose("sidebarVariant", id)}
              className="px-1 text-xs"
            >
              {label}
            </Choice>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function AppearanceActions({ appearance, className }) {
  const { randomise, reset, isDefault } = appearance;

  return (
    <div className={cn("flex gap-2", className)}>
      <Button variant="outline" className="flex-1" onClick={randomise}>
        <Shuffle className="mr-2 h-4 w-4" />
        Random
      </Button>
      <Button variant="outline" className="flex-1" onClick={reset} disabled={isDefault}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset to default
      </Button>
    </div>
  );
}
