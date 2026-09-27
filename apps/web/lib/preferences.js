// Every appearance setting the customiser offers, in one place: the options,
// the defaults, and how each one reaches the page.
//
// All but the two sidebar settings are applied as data-* attributes on <html>
// and read by CSS variables in globals.css, so a change repaints without
// re-rendering. The sidebar ones are props on the sidebar component, so they
// are read from the provider instead.

export const THEME_COLORS = [
  { id: "default", label: "Default", swatch: "hsl(0 0% 9%)" },
  { id: "red", label: "Red", swatch: "hsl(0 84% 48%)" },
  { id: "orange", label: "Orange", swatch: "hsl(25 95% 48%)" },
  { id: "amber", label: "Amber", swatch: "hsl(38 92% 45%)" },
  { id: "yellow", label: "Yellow", swatch: "hsl(48 96% 45%)" },
  { id: "lime", label: "Lime", swatch: "hsl(84 81% 45%)" },
  { id: "green", label: "Green", swatch: "hsl(142 71% 48%)" },
  { id: "emerald", label: "Emerald", swatch: "hsl(160 84% 48%)" },
  { id: "teal", label: "Teal", swatch: "hsl(173 80% 48%)" },
  { id: "cyan", label: "Cyan", swatch: "hsl(189 94% 48%)" },
  { id: "sky", label: "Sky", swatch: "hsl(199 89% 48%)" },
  { id: "blue", label: "Blue", swatch: "hsl(217 91% 48%)" },
  { id: "indigo", label: "Indigo", swatch: "hsl(239 84% 48%)" },
  { id: "violet", label: "Violet", swatch: "hsl(258 90% 48%)" },
  { id: "purple", label: "Purple", swatch: "hsl(271 91% 48%)" },
  { id: "fuchsia", label: "Fuchsia", swatch: "hsl(292 84% 48%)" },
  { id: "pink", label: "Pink", swatch: "hsl(330 81% 48%)" },
  { id: "rose", label: "Rose", swatch: "hsl(350 89% 48%)" },
];

// Hue and saturation per chart colour. globals.css holds the same values; the
// shades below are what the picker draws, so both must stay in step.
const CHART_HUES = {
  red: [0, 84], orange: [25, 95], amber: [38, 92], yellow: [48, 96],
  lime: [84, 81], green: [142, 71], emerald: [160, 84], teal: [173, 80],
  cyan: [189, 94], sky: [199, 89], blue: [217, 91], indigo: [239, 84],
  violet: [258, 90], purple: [271, 91], fuchsia: [292, 84], pink: [330, 81],
  rose: [350, 89],
};

// [saturation scale, lightness] for the five series -- the light-mode ramp
// globals.css uses (dark mode mirrors the lightness, keeping the hue).
const CHART_RAMP = [
  [1.0, 32],
  [0.95, 44],
  [0.9, 55],
  [0.85, 68],
  [0.8, 81],
];

const shadesFor = (hue, saturation) =>
  CHART_RAMP.map(
    ([scale, lightness]) =>
      `hsl(${hue} ${Math.round(saturation * scale)}% ${lightness}%)`
  );

// The default ramp is neutral grey, matching :root in globals.css.
const DEFAULT_CHART_SHADES = [
  "hsl(0 0% 15%)",
  "hsl(0 0% 32%)",
  "hsl(0 0% 48%)",
  "hsl(0 0% 68%)",
  "hsl(0 0% 84%)",
];

// Same names as the theme colours. Each option carries its five shades so the
// picker can show the ramp itself, not a single dot.
export const CHART_COLORS = THEME_COLORS.map(({ id, label, swatch }) => ({
  id,
  label,
  swatch,
  shades:
    id === "default"
      ? DEFAULT_CHART_SHADES
      : shadesFor(...CHART_HUES[id]),
}));

export const FONTS = [
  { id: "default", label: "Default" },
  { id: "inter", label: "Inter" },
  { id: "roboto", label: "Roboto" },
  { id: "poppins", label: "Poppins" },
  { id: "montserrat", label: "Montserrat" },
  { id: "pt-sans", label: "PT Sans" },
  { id: "overpass-mono", label: "Overpass Mono" },
];

// Headings and card titles.
export const DISPLAY_FONTS = [
  // Default follows whatever the body font is.
  { id: "default", label: "Default" },
  { id: "geist", label: "Geist" },
  { id: "montserrat", label: "Montserrat" },
  { id: "poppins", label: "Poppins" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
  { id: "outfit", label: "Outfit" },
  { id: "kumbh-sans", label: "Kumbh Sans" },
  { id: "hedvig-letters-serif", label: "Hedvig Letters Serif" },
];

export const SCALES = [
  { id: "90", label: "90%" },
  { id: "95", label: "95%" },
  { id: "100", label: "100%" },
  { id: "105", label: "105%" },
  { id: "110", label: "110%" },
];

export const RADII = [
  { id: "0", label: "Square" },
  { id: "0.35", label: "Small" },
  { id: "0.5", label: "Default" },
  { id: "0.75", label: "Medium" },
  { id: "1", label: "Round" },
];

export const COLOR_SCHEMAS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export const CONTENT_LAYOUTS = [
  { id: "full", label: "Full width" },
  { id: "centered", label: "Centered" },
];

export const SIDEBAR_COLLAPSIBLE = [
  { id: "icon", label: "To icons" },
  { id: "offcanvas", label: "Off-canvas" },
  { id: "none", label: "Always open" },
];

export const SIDEBAR_VARIANTS = [
  { id: "sidebar", label: "Classic" },
  { id: "floating", label: "Floating" },
  { id: "inset", label: "Inset" },
];

// key -> { options, default, attribute }. attribute null means the setting is
// not a data-* attribute (the sidebar ones, and the colour schema, which
// next-themes owns).
export const SETTINGS = {
  themeColor: { options: THEME_COLORS, default: "default", attribute: "palette" },
  chartColors: { options: CHART_COLORS, default: "default", attribute: "charts" },
  font: { options: FONTS, default: "default", attribute: "font" },
  displayFont: { options: DISPLAY_FONTS, default: "default", attribute: "displayFont" },
  scale: { options: SCALES, default: "100", attribute: "scale" },
  radius: { options: RADII, default: "0.5", attribute: "radius" },
  colorSchema: { options: COLOR_SCHEMAS, default: "system", attribute: null },
  contentLayout: { options: CONTENT_LAYOUTS, default: "full", attribute: "contentLayout" },
  sidebarCollapsible: { options: SIDEBAR_COLLAPSIBLE, default: "icon", attribute: null },
  sidebarVariant: { options: SIDEBAR_VARIANTS, default: "sidebar", attribute: null },
};

export const SETTING_KEYS = Object.keys(SETTINGS);

export const DEFAULT_PREFERENCES = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, SETTINGS[key].default])
);

export const STORAGE_KEY = "whealth-preferences";

export const isValid = (key, value) =>
  Boolean(SETTINGS[key]?.options.some((option) => option.id === value));

// Drops anything unknown, so a stale value in storage or on the account
// cannot put the page into a state the CSS has no rules for.
export function normalise(input) {
  const result = { ...DEFAULT_PREFERENCES };
  if (!input || typeof input !== "object") return result;
  for (const key of SETTING_KEYS) {
    if (isValid(key, input[key])) result[key] = input[key];
  }
  return result;
}

// Writes the data-* attributes. Defaults are removed rather than written, so
// the base rules in globals.css apply and the markup stays clean.
export function applyPreferences(preferences, root) {
  const element = root ?? document.documentElement;
  for (const key of SETTING_KEYS) {
    const { attribute, default: fallback } = SETTINGS[key];
    if (!attribute) continue;
    const value = preferences[key];
    if (!value || value === fallback) {
      delete element.dataset[attribute];
    } else {
      element.dataset[attribute] = value;
    }
  }
}

// Settings the Random button shuffles. Scale, colour schema, content layout
// and the sidebar are left alone: a surprise change to those is disorienting
// rather than fun.
export const RANDOMISED = ["themeColor", "chartColors", "font", "displayFont", "radius"];

export function randomPreferences(current = DEFAULT_PREFERENCES) {
  const pick = (key) => {
    const { options } = SETTINGS[key];
    return options[Math.floor(Math.random() * options.length)].id;
  };
  return {
    ...current,
    ...Object.fromEntries(RANDOMISED.map((key) => [key, pick(key)])),
  };
}

// Everything back to its default except light/dark, which is left as it is:
// clearing a colour or a font should not throw someone reading in dark mode
// into light, or back to following the system.
export function resetPreferences(current = DEFAULT_PREFERENCES, colorSchema) {
  const keep = isValid("colorSchema", colorSchema)
    ? colorSchema
    : current.colorSchema;
  return { ...DEFAULT_PREFERENCES, colorSchema: keep };
}
