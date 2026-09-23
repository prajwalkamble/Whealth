import { DEFAULT_PREFERENCES, SETTINGS, STORAGE_KEY } from "@/lib/preferences";

// Runs before the first paint, so a reload does not show the default
// appearance for an instant -- the same trick next-themes uses for dark mode.
// It is inlined because it has to run before any stylesheet is applied.
const ATTRIBUTES = Object.fromEntries(
  Object.entries(SETTINGS)
    .filter(([, setting]) => setting.attribute)
    .map(([key, setting]) => [key, [setting.attribute, setting.default]])
);

const SCRIPT = `
try {
  var stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || "{}");
  var attrs = ${JSON.stringify(ATTRIBUTES)};
  var root = document.documentElement;
  for (var key in attrs) {
    var value = stored[key];
    if (value && value !== attrs[key][1]) root.dataset[attrs[key][0]] = value;
  }
} catch (e) {}
`;

const PreferencesScript = () => (
  <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
);

export default PreferencesScript;
