import { DemoProvider } from "./_components/demo-provider";
import DemoShell from "./_components/demo-shell";

export const metadata = {
  title: "Demo · WHealthOS",
  description: "Explore WHealthOS with sample data, no account needed.",
};

// Outside the (main) group on purpose: these pages are public, and everything
// they show is computed in the browser, so none of the tenant machinery that
// wraps the signed-in app applies here.
export default function DemoLayout({ children }) {
  return (
    <DemoProvider>
      <DemoShell>{children}</DemoShell>
    </DemoProvider>
  );
}
