// Recognising a stale-build error.
//
// When the server's build changes under an open tab -- a deploy, or a dev
// server restart -- the JavaScript already running references chunk filenames
// that no longer exist. The next navigation asks for one, gets a 404, and the
// error boundary catches it.
//
// This is the one error class that reset() cannot fix. reset() re-renders the
// same tree, which requests the same missing file, which fails again: the
// "Try again" button becomes a loop the user cannot get out of. Only a full
// reload fetches the new HTML with the new chunk names.
//
// The message text is the only signal available -- the browser throws a plain
// TypeError for a failed module script, and Next wraps some of these -- so the
// patterns are matched against both the name and the message.
const PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk .* failed/i,
  /Failed to load chunk/i,
  /Loading CSS chunk .* failed/i,
  // Native ES module failures, which is what Turbopack and modern browsers
  // produce rather than webpack's ChunkLoadError.
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
];

export function isStaleBuildError(error) {
  if (!error) return false;
  const text = `${error.name ?? ""} ${error.message ?? ""}`;
  return PATTERNS.some((pattern) => pattern.test(text));
}

// One reload, never a loop.
//
// If the reload does not fix it -- the chunk is genuinely missing rather than
// stale, or the user is offline -- the flag is already set and the error screen
// is shown instead of reloading again. sessionStorage rather than localStorage
// so it is scoped to the tab and clears when it closes, and every access is
// guarded because it throws in a private window with site data blocked.
const FLAG = "whealthos:stale-build-reload";

export function reloadOnceForStaleBuild() {
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch {
    // No storage: reloading blind risks a loop, so the error screen is shown.
    return false;
  }
  window.location.reload();
  return true;
}

// Called once the app has rendered successfully, so a later stale build in the
// same tab is allowed its own reload.
export function clearStaleBuildFlag() {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    // Nothing to clear.
  }
}
