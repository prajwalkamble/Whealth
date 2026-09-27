"use client";

import {
  AppearanceActions,
  AppearanceSections,
  useAppearance,
} from "@/components/appearance-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// The same controls as the panel behind the palette icon, laid out for a page
// rather than a narrow sheet: two columns of sections once there is room.
const AppearanceCard = () => {
  const appearance = useAppearance();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Saved to your account, so it follows you to another browser or device.
          The palette icon in the top bar offers the same settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* The selects are Radix, whose ids come from useId; rendering them
            before mount makes the server and client trees disagree. A
            placeholder of roughly the same shape avoids the page jumping. */}
        {appearance.ready ? (
          <>
            <AppearanceSections
              appearance={appearance}
              className="grid items-start gap-x-6 gap-y-6 sm:grid-cols-2"
            />
            <AppearanceActions
              appearance={appearance}
              className="border-t pt-6 sm:max-w-md"
            />
          </>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppearanceCard;
