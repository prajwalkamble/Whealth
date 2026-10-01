import { currentUser } from "@clerk/nextjs/server";
import AppearanceCard from "./_components/appearance-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your account and how WHealthOS looks.
        </p>
      </div>

      <AppearanceCard />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Your name, email and password are managed by your WHealthOS sign-in.
            Use the avatar menu in the top bar to change them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {email ?? "No email address"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
