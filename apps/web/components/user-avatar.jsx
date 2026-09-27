"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

// Clerk mounts the avatar in the browser, so the server can only ever send a
// placeholder. Gating on Clerk's own loading state (ClerkLoading/ClerkLoaded)
// raced: when Clerk was already loaded from cache by the time React hydrated,
// the client rendered the avatar where the server had sent the placeholder,
// and React flagged the mismatched attributes. Gating on our own mount means
// the server and the first client render are always the same placeholder.
const UserAvatar = ({ size = "h-8 w-8" }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("rounded-full bg-muted", size)} aria-hidden />;
  }

  return <UserButton appearance={{ elements: { avatarBox: size } }} />;
};

export default UserAvatar;
