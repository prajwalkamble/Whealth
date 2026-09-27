"use client";

import { Palette } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  AppearanceActions,
  AppearanceSections,
  useAppearance,
} from "./appearance-controls";

// The customizer behind the palette icon in the top bar. The controls
// themselves live in appearance-controls.jsx, shared with the Appearance card
// in Settings so the two cannot drift apart.
const ThemeCustomizer = () => {
  const appearance = useAppearance();

  // Until mounted, render a plain button rather than the dropdown. Radix
  // builds its ids with useId, and when the server's tree and the first
  // client tree differ at all those ids diverge, which React reports as a
  // hydration failure and then trips over while patching the DOM. A
  // placeholder of the same size keeps the header from shifting.
  if (!appearance.ready) {
    return (
      <Button variant="ghost" size="icon" disabled aria-hidden>
        <Palette className="h-5 w-5" />
        <span className="sr-only">Customize appearance</span>
      </Button>
    );
  }

  return (
    <Sheet>
      {/* The provider is local rather than relied upon from an ancestor: this
          button also sits in the marketing header, which is outside the
          sidebar's provider, and a bare Radix tooltip throws without one.
          Nested providers are fine. */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Customize Dashboard"
              >
                <Palette className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Customize Dashboard</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Customize</SheetTitle>
          <SheetDescription>
            Customize the visual appearance of dashboard
          </SheetDescription>
        </SheetHeader>

        <AppearanceSections
          appearance={appearance}
          className="-mx-6 flex-1 space-y-6 overflow-y-auto px-6 py-6"
        />

        <AppearanceActions appearance={appearance} className="border-t pt-4" />
      </SheetContent>
    </Sheet>
  );
};

export default ThemeCustomizer;
