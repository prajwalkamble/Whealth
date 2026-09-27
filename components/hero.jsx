"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";
import { useEffect, useRef } from "react";

const HeroSection = () => {

  const imageRef = useRef();

  useEffect(() => {
    const imageElement = imageRef.current;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const sctollThreshold = 100;

      if(scrollPosition > sctollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="pb-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">
          Manage Your Finances <br /> With Intelligence
        </h1>
        <p className="text-xl textgray-600 mb-8 max-w-2xl mx-auto">
          {""}
          An AI-powered Financial Management platform that helps you track,
          analyze, and optimize your spendings with real-time insights.
        </p>
        {/* One call to action here. "Explore WHealthOS" lives in the header,
            where it is on screen the whole way down the page, so repeating it
            below only split the choice in two. */}
        <div className="flex justify-center">
          {/* asChild: the button renders as the link itself. A <button>
              nested inside an <a> is invalid HTML. */}
          <Button size="lg" className="px-8" asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </div>
        <div className="hero-image-wrapper">
          <div ref={imageRef} className="hero-image">
            <Image
              src="/banner.jpeg"
              width={1280}
              height={720}
              alt="Dashboard Preview"
              className="rounded-lg shadow-2xl border mx-auto"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
