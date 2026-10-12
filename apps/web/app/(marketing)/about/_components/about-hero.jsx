import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Asymmetric rather than a centred SaaS hero: copy on the left, the real
// product on the right.
//
// The screenshots are captured from the live demo rather than drawn, so they
// show the application's own navigation and figures. They do have to be
// recaptured when a section ships -- these two spent a while showing Cards,
// Budgets, Goals and Analytics greyed out after all four were built.
const AboutHero = () => (
  <header className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        About WHealthOS
      </p>

      <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.25rem]">
        Understand your money.{" "}
        {/* -mr-2 cancels the pr-2 baked into .gradient-title, which keeps
            the gradient off a descender at heading sizes but renders as a
            stray gap when the span sits mid sentence. */}
        <span className="gradient-title -mr-2">Control your finances.</span> Build
        toward what matters.
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        WHealthOS brings your financial activity into one clear picture —
        helping you manage your accounts, understand your spending, plan your
        finances and work toward your goals.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href="/sign-up">Get Started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/demo">Explore WHealthOS</Link>
        </Button>
      </div>
    </div>

    <figure className="min-w-0">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Image
          src="/dashboard-preview.png"
          alt="The WHealthOS dashboard: sidebar navigation, total balance, income, expenses and savings rate, with income sources, cash flow and an expense breakdown."
          width={1280}
          height={1195}
          priority
          className="h-auto w-full dark:hidden"
        />
        <Image
          src="/dashboard-preview-dark.png"
          alt=""
          aria-hidden
          width={1280}
          height={1195}
          priority
          className="hidden h-auto w-full dark:block"
        />
      </div>
    </figure>
  </header>
);

export default AboutHero;
