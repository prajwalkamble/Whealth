import { ClerkProvider } from "@clerk/nextjs";

// Clerk's provider, in one place so every layout mounts it the same way.
//
// telemetry={false}: the SDK otherwise POSTs usage events to a telemetry
// endpoint from the browser on every page it is mounted on. Nobody here reads
// that telemetry, and it is not something to send on a visitor's connection
// without asking.
const Clerk = ({ children }) => (
  <ClerkProvider telemetry={false}>{children}</ClerkProvider>
);

export default Clerk;
