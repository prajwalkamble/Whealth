"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import { usePreferences } from "@/components/preferences-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// soon: the section is not built yet, so the item renders as a disabled
// button with a "Coming Soon" tooltip instead of a link. Keeping them out of
// the router entirely is deliberate -- a live link to a page that does not
// exist lands the user on the 404 screen.
const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Accounts", url: "/accounts", icon: Wallet },
  { title: "Cards", icon: CreditCard, soon: true },
  { title: "Budgets", icon: PiggyBank, soon: true },
  { title: "Goals", icon: Target, soon: true },
  { title: "Analytics", icon: BarChart3, soon: true },
  { title: "Settings", url: "/settings", icon: Settings },
];

// The account pages live under /account/[id] and editing under
// /transaction/create, so each section owns more than its own path.
const SECTION_PREFIXES = {
  "/accounts": ["/accounts", "/account/"],
  "/transactions": ["/transactions", "/transaction/"],
};

const isActive = (pathname, url) => {
  const prefixes = SECTION_PREFIXES[url] ?? [url];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
};

// Roughly the size of the cursor glyph, so the label clears its bottom-right
// corner instead of sitting under the pointer itself.
const CURSOR_OFFSET = { x: 16, y: 20 };

// A "Coming Soon" label that follows the pointer, rather than the sidebar's
// usual tooltip. Radix anchors a tooltip to its trigger, so on a full-width
// menu item the label lands wherever the item is -- not next to the cursor.
// Tracking the pointer is the only way to keep it by the prohibited symbol
// wherever on the button the cursor happens to be.
//
// aria-disabled rather than the disabled attribute, so the button still
// receives hover events at all. The variants in ui/sidebar.jsx then apply
// `aria-disabled:pointer-events-none`, which kills hover just as the attribute
// would, so pointer events are put back -- without that there is no label and
// no cursor change. A type="button" outside a form does nothing when clicked,
// so there is no navigation to prevent.
const ComingSoonItem = ({ item }) => {
  const [point, setPoint] = useState(null);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        aria-disabled="true"
        aria-describedby={point ? `soon-${item.title}` : undefined}
        onPointerMove={(event) =>
          setPoint({ x: event.clientX, y: event.clientY })
        }
        onPointerLeave={() => setPoint(null)}
        onPointerDown={() => setPoint(null)}
        className="aria-disabled:pointer-events-auto cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground"
      >
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>

      {/* Portalled to the body and fixed, so the sidebar's own overflow and
          stacking context cannot clip it. Rendered only once the pointer has
          moved, so the server and the first client render agree. */}
      {point &&
        createPortal(
          <div
            id={`soon-${item.title}`}
            role="tooltip"
            style={{
              left: point.x + CURSOR_OFFSET.x,
              top: point.y + CURSOR_OFFSET.y,
            }}
            className="pointer-events-none fixed z-[60] rounded-md border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md"
          >
            Coming Soon
          </div>,
          document.body
        )}
    </SidebarMenuItem>
  );
};

// items: demo mode passes its own list, pointing at /demo/* and locking the
// sections a guest cannot reach. Everything else about the rail is the same,
// so the two shells cannot drift apart visually.
const AppSidebar = ({ items = NAV_ITEMS, homeHref = "/dashboard" }) => {
  const pathname = usePathname();
  // Sidebar Variant and Sidebar Collapse from the customiser. These are props
  // rather than CSS, so they come from the provider.
  const { preferences } = usePreferences();

  return (
    <Sidebar
      variant={preferences.sidebarVariant}
      collapsible={preferences.sidebarCollapsible}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref}>
                <Image
                  src="/logo.png"
                  alt="Whealth"
                  width={120}
                  height={48}
                  className="h-8 w-auto object-contain group-data-[collapsible=icon]:h-6"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                item.soon ? (
                  <ComingSoonItem key={item.title} item={item} />
                ) : (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(pathname, item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
