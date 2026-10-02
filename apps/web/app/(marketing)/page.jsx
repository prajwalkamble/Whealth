import HeroSection from "@/components/hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { featuresData, howItWorksData, testimonialsData } from "@/data/landing";
import { getLandingStats } from "@/lib/stats";
import Image from "next/image";
import Link from "next/link";

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// Real values only. Every tile is computed from the database, and a figure
// with nothing behind it yet is left out rather than shown as a guess.
//
// What each one actually measures, since two of the labels could be read more
// broadly than the data supports:
//
//   Transaction Success Rate  the share of recorded transactions whose status
//                             is COMPLETED. A failed write never becomes a
//                             row, so it is not an attempt-to-success ratio.
//   Average User Savings      the average savings rate across users who have
//                             recorded income -- their own figures, not
//                             evidence that WHealthOS produced the saving.
//   Improved Financial Growth the share of users whose savings rate rose on
//                             last month. Again a change in their own figures.
function buildStats(stats) {
  if (!stats) return [];

  const list = [];

  if (stats.successRate !== null) {
    list.push({
      label: "Transaction Success Rate",
      // Floored, so 99.96% is never rounded up to a flat 100%.
      value: `${Math.floor(stats.successRate * 10) / 10}%`,
    });
  }

  if (stats.savingsRate !== null) {
    list.push({
      label: "Average User Savings",
      value: `${stats.savingsRate.toFixed(1)}%`,
    });
  }

  if (stats.improved !== null) {
    list.push({
      label: "Improved Financial Growth",
      value: `${Math.round(stats.improved)}%`,
    });
  }

  list.push({
    label: "Active Users Worldwide",
    value: compactNumber.format(stats.activeUsers),
  });

  return list;
}

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
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
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
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonialsData.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center mb-4">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div className="ml-4">
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{testimonial.quote}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            {" "}
            Join thousands of users who are already managing their finances smarter with WHealthOS
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 animate-pulse"
            asChild
          >
            <Link href="/dashboard">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
