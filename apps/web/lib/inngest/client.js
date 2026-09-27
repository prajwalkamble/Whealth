import { Inngest } from "inngest";

// Create a client to send and receive events.
//
// The id is Inngest's identity for this app; changing it (even to fix the
// spelling) would register a new app and orphan the existing run history.
//
// Retries are configured per function (`retries`), which is where Inngest
// reads them. A `retryFunction` option used to sit here, but Inngest has no
// such option and silently ignored it.
export const inngest = new Inngest({
  id: "whelth",
  name: "Whelth",
});
