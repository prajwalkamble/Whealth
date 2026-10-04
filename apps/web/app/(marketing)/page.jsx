import HeroSection from "@/components/hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { featuresData, howItWorksData } from "@/data/landing";
import { buildStatTiles } from "@/lib/stat-tiles";
import { getLandingStats } from "@/lib/stats";
import Link from "next/link";

// The band drops a figure it cannot compute rather than showing a gap; the
// About page renders the same tiles and shows the gap. Labels and formatting
// are shared, so the two cannot drift.
const buildStats = (stats) =>
  buildStatTiles(stats).filter(({ value }) => value !== null);

// Literal class names so Tailwind generates them; the column count follows how
// many stats are shown.
const STAT_COLUMNS = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export default async function Home() {
  // The landing page must render even when the database is unreachable, so a
  // failed lookup hides the stats instead of taking the page down with it.
  const statsData = buildStats(
    await getLandingStats().catch((error) => {
      console.error("Failed to load landing stats:", error);
      return null;
    })
  );

  return (
    <div className="mt-40">
      <HeroSection />

      {statsData.length > 0 && (
        <section className="py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div
              className={`grid grid-cols-2 gap-8 ${STAT_COLUMNS[statsData.length]}`}
            >
              {statsData.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="mb-2 text-4xl font-bold tabular-nums tracking-tight text-primary">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Manage Your Finances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresData.map((feature, index) => (
              <Card key={index} className="p-6">
                <CardContent className="space-y-4 pt-4">
                  {feature.icon}
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksData.map((step, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight">
              Ready to take control of your finances?
            </h2>
            {/* No user count. There is nothing here that cannot be backed up. */}
            <p className="mt-4 text-muted-foreground">
              Bring your accounts, spending and budgets into one place, and see
              where your money actually goes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">Explore WHealthOS</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
