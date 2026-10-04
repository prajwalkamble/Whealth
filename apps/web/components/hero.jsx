import Link from "next/link";
import { Button } from "./ui/button";
import DashboardProductDemo from "./landing/dashboard-product-demo";

// A server component. It used to be a client component purely to drive a 3D
// tilt on the hero image from a window scroll listener. That cost a client
// bundle on the most-visited page, ran a handler on every scroll frame, had no
// prefers-reduced-motion path, and the perspective transform projected the
// image ~67px wider than the viewport at 1440, which put a horizontal
// scrollbar on the landing page. None of that bought anything, so it is gone.
//
// The visual is the product itself: the signed-in dashboard's own components,
// rendered against demo data and walked through by a GSAP timeline. It is a
// client island; the rest of the hero stays server-rendered.
const HeroSection = () => {
  return (
    <div className="px-4 pb-20">
      <div className="container mx-auto text-center">
        {/* Each word is its own span so the line can rise in sequence on
            load. The animation is CSS, not GSAP: this is the LCP element, and
            waiting for a client bundle to reveal the headline would delay the
            one thing the page is measured on. */}
        <h1 className="hero-headline mx-auto max-w-5xl text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          <span>Manage</span> <span>your</span> <span>finances</span>{" "}
          <span>with</span>{" "}
          {/* The gradient sits on one word, not the whole heading: a fully
              gradient-filled h1 reads as decoration, and it is the single
              loudest thing on a page asking to be trusted with money. */}
          <span className="gradient-title -mr-2">Intelligence</span>.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Track your accounts, understand where your money goes, and plan
          against a budget. One place for the whole picture.
        </p>

        {/* One call to action here. "Explore WHealthOS" lives in the header,
            where it is on screen the whole way down the page, so repeating it
            below only split the choice in two. */}
        <div className="mt-8 flex justify-center">
          {/* asChild: the button renders as the link itself. A <button>
              nested inside an <a> is invalid HTML. */}
          <Button size="lg" className="px-8" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>

        <DashboardProductDemo />
      </div>
    </div>
  );
};

export default HeroSection;
