import { SETTINGS, STORAGE_KEY } from "@/lib/preferences";

// Runs before the first paint, so a reload does not show the default
// appearance for an instant -- the same trick next-themes uses for dark mode.
// It is inlined because it has to run before any stylesheet is applied.
//
// key -> [attribute, default, allowed ids]. The allowed list is what stops a
// stale or hand-edited value in storage reaching <html>: normalise() in the
// provider drops those, but only once React has hydrated, so without this the
// pre-paint pass and the React pass could disagree for a frame.
const ATTRIBUTES = Object.fromEntries(
  Object.entries(SETTINGS)
    .filter(([, setting]) => setting.attribute)
    .map(([key, setting]) => [
      key,
      [
        setting.attribute,
        setting.default,
        setting.options.map((option) => option.id),
      ],
    ])
);

const SCRIPT = `
try {
  var stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || "{}");
  var attrs = ${JSON.stringify(ATTRIBUTES)};
  var root = document.documentElement;
  for (var key in attrs) {
    var attr = attrs[key][0], fallback = attrs[key][1], allowed = attrs[key][2];
    var value = stored[key];
    if (value && value !== fallback && allowed.indexOf(value) !== -1) {
      root.dataset[attr] = value;
    } else {
      delete root.dataset[attr];
    }
  }
} catch (e) {}
`;

const PreferencesScript = () => (
  <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
);

export default PreferencesScript;
