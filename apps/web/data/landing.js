import {
  BarChart3,
  PieChart,
  CreditCard,
  Search,
  Zap,
  ReceiptIndianRupee,
} from "lucide-react";

// Features Data
export const featuresData = [
  {
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    title: "Analytics",
    description:
      "Cash flow across months, spending by category, income sources and savings rate.",
  },
  {
    icon: <ReceiptIndianRupee className="h-8 w-8 text-primary" />,
    title: "Receipt scanning",
    description:
      "Photograph a receipt and it is read into a draft transaction for you to confirm.",
  },
  {
    icon: <PieChart className="h-8 w-8 text-primary" />,
    title: "Budgets",
    description:
      "Set a monthly limit, track it against real spending, and get an email before you pass it.",
  },
  {
    icon: <CreditCard className="h-8 w-8 text-primary" />,
    title: "Multiple accounts",
    description:
      "Current and savings accounts in one place, with balances that stay in step.",
  },
  {
    icon: <Search className="h-8 w-8 text-primary" />,
    title: "Search",
    description:
      "Find any transaction or account across your own records.",
  },
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: "Monthly summary",
    description:
      "A monthly email covering what changed, with written commentary on the figures.",
  },
];

// How It Works Data
export const howItWorksData = [
  {
    icon: <CreditCard className="h-8 w-8 text-primary" />,
    title: "1. Create Your Account",
    description:
      "Get started in minutes with our simple and secure sign-up process",
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    title: "2. Track Your Spending",
    description:
      "Automatically categorize and track your transactions in real-time",
  },
  {
    icon: <PieChart className="h-8 w-8 text-primary" />,
    title: "3. Get Insights",
    description:
      "Receive AI-powered insights and recommendations to optimize your finances",
  },
];

// Testimonials Data
// testimonialsData removed: it held three invented people with portraits from
// a fake-person generator, and one of the quotes praised multi-currency, which
// is not built. There are no real testimonials yet, so the landing page shows
// none rather than borrowed ones.
