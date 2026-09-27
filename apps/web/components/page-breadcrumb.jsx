"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Section for the first path segment, so /account/<id> reads as
// "Accounts / Account details" rather than the raw id.
const SECTIONS = {
  dashboard: { label: "Dashboard", href: "/dashboard" },
  accounts: { label: "Accounts", href: "/accounts" },
  account: { label: "Accounts", href: "/accounts", leaf: "Account details" },
  transactions: { label: "Transactions", href: "/transactions" },
  transaction: {
    label: "Transactions",
    href: "/transactions",
    leaf: "Add transaction",
  },
  settings: { label: "Settings", href: "/settings" },
};

const PageBreadcrumb = () => {
  const pathname = usePathname();
  const [first, second] = pathname.split("/").filter(Boolean);
  const section = SECTIONS[first];
  if (!section) return null;

  const leaf = second ? section.leaf : null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {leaf ? (
            <BreadcrumbLink asChild>
              <Link href={section.href}>{section.label}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{section.label}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {leaf && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{leaf}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PageBreadcrumb;
