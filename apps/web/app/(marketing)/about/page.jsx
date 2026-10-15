import AboutHero from "./_components/about-hero";
import Stats from "./_components/stats";
import Capabilities from "./_components/capabilities";
import WhySection from "./_components/why-section";
import Belief from "./_components/belief";
import WhatIs from "./_components/what-is";
import MissionVision from "./_components/mission-vision";
import CoreValues from "./_components/core-values";
import Philosophy from "./_components/philosophy";
import Enterprise from "./_components/enterprise";
import Trust from "./_components/trust";
import Promise from "./_components/promise";
import Status from "./_components/status";
import AboutCta from "./_components/about-cta";
import { getLandingStats } from "@/lib/stats";
import { buildStatTiles } from "@/lib/stat-tiles";

export const metadata = {
  title: "WHealthOS — About",
  description:
    "What WHealthOS is, the financial-management problem it is built against, what works today and what does not exist yet.",
  alternates: { canonical: "/about" },
};

// A server component throughout: nothing on this page needs state, so none of
// it ships JavaScript beyond what the shared header already requires.
//
// The sections run in a deliberate order — curiosity, understanding, the
// problem, the product, trust, mission, ambition, action — so the page reads as
// one argument rather than a stack of unrelated panels.
//
// Everything described as current was checked against the codebase. Anything
// without an implementation behind it is labelled Planned, and that label is a
// word rather than a colour, so the distinction survives greyscale, a screen
// reader, or CSS failing to load.
export default async function AboutPage() {
  // Same contract as the landing page: a database that is unreachable hides
  // the figures instead of taking the page down with it.
  const stats = buildStatTiles(
    await getLandingStats().catch((error) => {
      console.error("Failed to load stats for the About page:", error);
      return null;
    })
  );

  return (
    // pt-28 clears the fixed header, which the marketing layout does not
    // reserve space for. Matches the pricing page.
    <div className="container mx-auto px-4 pb-24 pt-28 md:pt-32">
      <AboutHero />
      <Stats stats={stats} />
      <Capabilities />
      <WhySection />
      <Belief />
      <WhatIs />
      <MissionVision />
      <CoreValues />
      <Philosophy />
      <Enterprise />
      <Trust />
      <Promise />
      {/* Last before the call to action: everything above describes what
          WHealthOS is for, and this is the line between the part that works
          and the part that does not. Asking someone to sign up without it
          would be asking them to infer it. */}
      <Status />
      <AboutCta />
    </div>
  );
}
