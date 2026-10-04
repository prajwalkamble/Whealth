import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHART_COLORS,
  DISPLAY_FONTS,
  FONTS,
  THEME_COLORS,
  randomPreferences,
  resetPreferences,
  DEFAULT_PREFERENCES,
  SETTINGS,
  SETTING_KEYS,
  applyPreferences,
  isValid,
  normalise,
} from "@/lib/preferences";

describe("preferences", () => {
  it("covers the ten settings the customiser offers", () => {
    expect(SETTING_KEYS).toEqual([
      "themeColor",
      "chartColors",
      "font",
      "displayFont",
      "scale",
      "radius",
      "colorSchema",
      "contentLayout",
      "sidebarCollapsible",
      "sidebarVariant",
    ]);
  });

  it("gives every setting a default that is one of its own options", () => {
    for (const key of SETTING_KEYS) {
      expect(isValid(key, DEFAULT_PREFERENCES[key])).toBe(true);
    }
  });

  it("keeps known values and falls back for unknown ones", () => {
    const result = normalise({
      themeColor: "violet",
      radius: "9rem",
      sidebarVariant: "floating",
    });
    expect(result.themeColor).toBe("violet");
    expect(result.sidebarVariant).toBe("floating");
    expect(result.radius).toBe(DEFAULT_PREFERENCES.radius);
  });

  it("drops anything that is not a setting, so junk cannot be stored", () => {
    const result = normalise({ themeColor: "rose", evil: "<script>", 1: true });
    expect(Object.keys(result).sort()).toEqual([...SETTING_KEYS].sort());
    expect(result.evil).toBeUndefined();
  });

  it.each([null, undefined, "nonsense", 42, []])(
    "returns the defaults for %s",
    (input) => {
      expect(normalise(input)).toEqual(DEFAULT_PREFERENCES);
    }
  );

  it("writes data attributes only for non-default values", () => {
    const root = { dataset: {} };
    applyPreferences({ ...DEFAULT_PREFERENCES, themeColor: "blue", radius: "1" }, root);

    expect(root.dataset.palette).toBe("blue");
    expect(root.dataset.radius).toBe("1");
    // Defaults are absent, so the base rules in globals.css apply.
    expect(root.dataset.font).toBeUndefined();
    expect(root.dataset.charts).toBeUndefined();
  });

  it("removes an attribute when a setting goes back to its default", () => {
    const root = { dataset: { palette: "blue" } };
    applyPreferences(DEFAULT_PREFERENCES, root);
    expect(root.dataset.palette).toBeUndefined();
  });

  it("leaves the settings that are not attributes off the element", () => {
    const root = { dataset: {} };
    applyPreferences(
      { ...DEFAULT_PREFERENCES, sidebarVariant: "inset", colorSchema: "dark" },
      root
    );
    // next-themes owns the colour schema; the sidebar ones are props.
    expect(root.dataset.sidebarVariant).toBeUndefined();
    expect(root.dataset.colorSchema).toBeUndefined();
    expect(SETTINGS.sidebarVariant.attribute).toBeNull();
  });
});

// Guards the promise that picking any option actually changes something: each
// one must have a rule in globals.css (or, for the sidebar and colour schema,
// be handled in React instead).
describe("every option is backed by a style rule", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  it.each(THEME_COLORS.filter((c) => c.id !== "default"))(
    "theme colour $id tints buttons, hovers and the sidebar, light and dark",
    ({ id }) => {
      for (const prefix of ["", ".dark"]) {
        const selector = `${prefix}[data-palette="${id}"] {`;
        const at = css.indexOf(selector);
        expect(at, selector).toBeGreaterThan(-1);
        const block = at === -1 ? "" : css.slice(at, css.indexOf("}", at));
        // --primary alone barely shows: hovers and the sidebar's active item
        // read --accent, and badges read --secondary.
        for (const token of [
          "--primary:",
          "--accent:",
          "--secondary:",
          "--ring:",
          "--sidebar-accent:",
          "--sidebar-primary:",
        ]) {
          expect(block, `${selector} ${token}`).toContain(token);
        }
      }
    }
  );

  it.each(CHART_COLORS.filter((c) => c.id !== "default"))(
    "chart ramp $id defines five series in both themes, keeping its hue",
    ({ id }) => {
      const hues = [];
      for (const prefix of ["", ".dark"]) {
        const selector = `${prefix}[data-charts="${id}"] {`;
        const at = css.indexOf(selector);
        expect(at, selector).toBeGreaterThan(-1);
        const block = at === -1 ? "" : css.slice(at, css.indexOf("}", at));
        for (let i = 1; i <= 5; i++) {
          expect(block).toContain(`--chart-${i}:`);
        }
        hues.push(...[...block.matchAll(/--chart-\d:\s*([\d.]+)\s/g)].map((m) => m[1]));
      }
      // Dark mode mirrors the lightness but never changes the colour.
      expect(new Set(hues).size).toBe(1);
    }
  );

  it.each(FONTS.filter((f) => f.id !== "default"))(
    "font $id maps to a family",
    ({ id }) => {
      expect(css).toContain(`[data-font="${id}"]`);
    }
  );

  it.each(DISPLAY_FONTS.filter((f) => f.id !== "default"))(
    "display font $id maps to a family",
    ({ id }) => {
      expect(css).toContain(`[data-display-font="${id}"]`);
    }
  );

  it('"Default" display font follows the body font', () => {
    expect(css).toContain("--font-display: var(--font-body)");
  });

  // Card is rounded-xl; when only lg/md/sm followed --radius the setting
  // changed the customizer's own buttons but not the dashboard's cards.
  it("maps every rounded step to --radius", () => {
    const config = readFileSync(new URL("../tailwind.config.mjs", import.meta.url), "utf8");
    const radii = config.slice(config.indexOf("borderRadius"), config.indexOf("borderRadius") + 500);
    for (const step of ["'3xl'", "'2xl'", "xl:", "lg:", "md:", "sm:"]) {
      expect(radii).toContain(step);
    }
    expect(radii.match(/var\(--radius\)/g).length).toBeGreaterThanOrEqual(6);
  });

  // The families are declared on <html>; on <body> the var() inside
  // --font-body could not see them and no font applied at all.
  it("declares the font variables on <html>", () => {
    const layout = readFileSync(new URL("../app/layout.js", import.meta.url), "utf8");
    expect(layout).toMatch(/<html[^>]*className=\{fontVariables\}/);
    expect(layout).not.toMatch(/<body className=\{fontVariables\}/);
  });

  const chartSeries = (scope) => {
    // The scope may head a grouped selector -- ":root" is written as
    // ":root,\n  .theme-light {" so a subtree can be forced light inside a
    // dark page. Anchor to a selector at the start of a line followed by "{"
    // or ",", so the word ".dark" inside a comment is not mistaken for the
    // block itself.
    const selector = new RegExp(
      "^\\s*" + scope.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[,{]",
      "m"
    );
    const found = selector.exec(css);
    const at = found ? css.indexOf("{", found.index) : -1;
    const block = at === -1 ? "" : css.slice(at, css.indexOf("}", at));
    return [...block.matchAll(/--chart-\d:\s*[\d.]+\s+([\d.]+)%\s+([\d.]+)%/g)].map(
      (m) => ({ saturation: Number(m[1]), lightness: Number(m[2]) })
    );
  };

  it("draws charts in neutral greys by default, in both themes", () => {
    for (const scope of [":root", ".dark"]) {
      const series = chartSeries(scope);
      expect(series, scope).toHaveLength(5);
      for (const { saturation } of series) expect(saturation).toBe(0);
    }
  });

  it("spans a wide range, so charts read crisply rather than dull", () => {
    // The ramp that looked dull sat in a 44-78% band; the reference runs
    // from near-black to pale.
    const light = chartSeries(":root").map((s) => s.lightness);
    expect(Math.max(...light) - Math.min(...light)).toBeGreaterThanOrEqual(60);
  });

  it("leads with the strongest shade in each theme", () => {
    // Light mode starts dark, dark mode starts pale, so series 1 is the most
    // visible series against either background.
    const light = chartSeries(":root").map((s) => s.lightness);
    const dark = chartSeries(".dark").map((s) => s.lightness);
    expect(light[0]).toBeLessThan(light[4]);
    expect(dark[0]).toBeGreaterThan(dark[4]);
  });

  it.each(CHART_COLORS.filter((c) => c.id !== "default"))(
    "ramp $id keeps one hue across its five shades",
    ({ id }) => {
      const at = css.indexOf(`[data-charts="${id}"] {`);
      const block = at === -1 ? "" : css.slice(at, css.indexOf("}", at));
      const hues = [...block.matchAll(/--chart-\d:\s*([\d.]+)\s/g)].map((m) => m[1]);
      expect(hues).toHaveLength(5);
      // A ramp, not a rainbow: shifting the hue per series turned "rose"
      // into an orange by the fifth shade.
      expect(new Set(hues).size).toBe(1);
    }
  );

  it("keeps the dark surface off near-black", () => {
    const dark = css.match(/\.dark\s*\{([^}]*)\}/)[1];
    const lightness = Number(
      dark.match(/--background:\s*[\d.]+\s+[\d.]+%\s+([\d.]+)%/)[1]
    );
    expect(lightness).toBeGreaterThan(8);
  });
});

describe("randomPreferences", () => {
  it("only changes the visual settings", () => {
    const before = { ...DEFAULT_PREFERENCES, scale: "110", sidebarVariant: "inset" };
    const after = randomPreferences(before);

    expect(after.scale).toBe("110");
    expect(after.sidebarVariant).toBe("inset");
    expect(after.colorSchema).toBe(before.colorSchema);
    expect(after.contentLayout).toBe(before.contentLayout);
  });

  it("always picks values the app knows", () => {
    for (let i = 0; i < 50; i++) {
      const random = randomPreferences();
      expect(normalise(random)).toEqual(random);
    }
  });

  it("does eventually pick something other than the defaults", () => {
    const changed = Array.from({ length: 30 }, () => randomPreferences()).some(
      (p) => p.themeColor !== DEFAULT_PREFERENCES.themeColor
    );
    expect(changed).toBe(true);
  });
});

describe("resetPreferences", () => {
  it("restores every default", () => {
    const messy = {
      ...DEFAULT_PREFERENCES,
      themeColor: "rose",
      font: "poppins",
      radius: "1",
      scale: "110",
      sidebarVariant: "floating",
    };
    const reset = resetPreferences(messy, "system");
    for (const key of Object.keys(DEFAULT_PREFERENCES)) {
      expect(reset[key]).toBe(DEFAULT_PREFERENCES[key]);
    }
  });

  it("keeps dark mode when the look is reset", () => {
    // Clearing a colour should not throw someone reading at night into light.
    const reset = resetPreferences({ ...DEFAULT_PREFERENCES, themeColor: "rose" }, "dark");
    expect(reset.colorSchema).toBe("dark");
    expect(reset.themeColor).toBe(DEFAULT_PREFERENCES.themeColor);
  });

  it("keeps light mode too", () => {
    expect(resetPreferences(DEFAULT_PREFERENCES, "light").colorSchema).toBe("light");
  });

  it("falls back to the stored schema when the theme is unknown", () => {
    const current = { ...DEFAULT_PREFERENCES, colorSchema: "dark" };
    // next-themes reports undefined before it has mounted.
    expect(resetPreferences(current, undefined).colorSchema).toBe("dark");
    expect(resetPreferences(current, "solarized").colorSchema).toBe("dark");
  });
});
