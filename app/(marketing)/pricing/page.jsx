import Link from "next/link";
import { Button } from "@/components/ui/button";
import PricingPlans from "./_components/pricing-plans";
import PricingFaq from "./_components/pricing-faq";

export const metadata = {
  title: "Pricing · WHealthOS",
  description:
    "Start free and upgrade when you need more capacity, more control and AI-powered insight into your finances.",
};

// A server component: only the billing switch and the feature tooltips need
// state, and those live in PricingPlans.
export default function PricingPage() {
  return (
    // pt-24 clears the fixed header, which the marketing layout does not
    // reserve space for.
    <div className="container mx-auto px-4 pb-20 pt-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pricing
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
          Simple pricing.{" "}
          <span className="gradient-title">Smarter financial management.</span>
        </h1>

        <p className="mt-4 text-muted-foreground">
          Start for free. Upgrade when you need more control, more capacity, and
          deeper insights into your finances.
        </p>
      </div>

      <div className="mt-10">
        <PricingPlans />
      </div>

      <div className="mt-14">
        <PricingFaq />
      </div>

      <section className="mt-8 flex flex-col items-center justify-between gap-6 rounded-xl border bg-muted/40 p-6 md:flex-row md:p-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Ready to take control of your finances?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with WHealthOS for free, or explore it first with sample data.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/demo">Explore WHealthOS</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
