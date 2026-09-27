// The pricing page's content, kept apart from its layout so the plans and the
// comparison table can be edited without touching the markup.
//
// NOTE: this page is presentational. There is no billing integration behind
// it, and none of the limits below (the daily transaction cap in particular)
// are enforced anywhere in the app yet. Wiring a payment provider and the
// entitlement checks is a separate piece of work.

export const BILLING_PERIODS = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly", note: "Save 20%" },
];

export const YEARLY_DISCOUNT = 0.2;

export const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Start managing your finances.",
    monthly: 0,
    cta: { label: "Create Free Account", href: "/sign-up" },
    limit: "5 per day",
    accent: "neutral",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Take control of your complete finances.",
    monthly: 299,
    cta: { label: "Start with Pro", href: "/sign-up" },
    limit: "15 per day",
    accent: "blue",
    popular: true,
  },
  {
    id: "intelligent",
    name: "Intelligent",
    tagline: "Understand your finances with AI-powered insights.",
    monthly: 599,
    cta: { label: "Get Intelligent", href: "/sign-up" },
    limit: "Higher / Unlimited",
    accent: "violet",
  },
];

// The highlighted row above the grouped features: a value per plan rather than
// a tick, so it is called out on its own.
export const HEADLINE_FEATURE = {
  icon: "CalendarClock",
  label: "Transactions per day",
  description: "Number of transactions you can add daily.",
};

// Each row lists the plans that include it. Anything absent shows a dash.
export const FEATURE_GROUPS = [
  {
    title: "Core Finance Management",
    features: [
      {
        icon: "LayoutDashboard",
        label: "Basic dashboard",
        hint: "Balances, income, spending and savings rate at a glance.",
        plans: ["free", "pro", "intelligent"],
      },
      {
        icon: "FileText",
        label: "Add and manage transactions",
        hint: "Record income and expenses, edit them, and delete in bulk.",
        plans: ["free", "pro", "intelligent"],
      },
      {
        icon: "Wallet",
        label: "Accounts",
        hint: "Track current and savings accounts separately.",
        plans: ["free", "pro", "intelligent"],
      },
      {
        icon: "CreditCard",
        label: "Cards & wallet",
        hint: "Keep your cards alongside the accounts they draw on.",
        plans: ["free", "pro", "intelligent"],
      },
      {
        icon: "BarChart3",
        label: "Basic financial overview",
        hint: "Monthly totals and a six-month cash-flow chart.",
        plans: ["free", "pro", "intelligent"],
      },
    ],
  },
  {
    title: "Financial Planning",
    features: [
      {
        icon: "PiggyBank",
        label: "Budgets",
        hint: "Set a monthly limit and get alerted before you pass it.",
        plans: ["pro", "intelligent"],
      },
      {
        icon: "Target",
        label: "Goals",
        hint: "Put money aside towards something and watch it build.",
        plans: ["pro", "intelligent"],
      },
      {
        icon: "ChartPie",
        label: "Analytics",
        hint: "Break spending down by category and compare months.",
        plans: ["pro", "intelligent"],
      },
    ],
  },
  {
    title: "Global & Data",
    features: [
      {
        icon: "Globe",
        label: "Multi-currency support",
        hint: "Hold and report on balances in more than one currency.",
        plans: ["pro", "intelligent"],
      },
      {
        icon: "Download",
        label: "Data export",
        hint: "Take everything with you as CSV whenever you want.",
        plans: ["pro", "intelligent"],
      },
    ],
  },
  {
    title: "Customization",
    features: [
      {
        icon: "Palette",
        label: "Theme toggle (light/dark)",
        hint: "Switch between light, dark and your system setting.",
        plans: ["free", "pro", "intelligent"],
      },
      {
        icon: "LayoutGrid",
        label: "Dashboard customization",
        hint: "Choose the layout and how the shell is arranged.",
        plans: ["pro", "intelligent"],
      },
      {
        icon: "Paintbrush",
        label: "Appearance customization (colors, typography, charts)",
        hint: "Theme colour, chart palette, fonts, scale and corner radius.",
        plans: ["pro", "intelligent"],
      },
    ],
  },
  {
    title: "AI & Insights",
    features: [
      {
        icon: "Sparkles",
        label: "AI financial insights",
        hint: "A monthly read on what changed and why.",
        plans: ["intelligent"],
      },
      {
        icon: "MessageSquare",
        label: "AI spending analysis",
        hint: "Patterns in your spending, picked out for you.",
        plans: ["intelligent"],
      },
      {
        icon: "FileBarChart",
        label: "Personalized financial summaries",
        hint: "A written summary of your month, sent by email.",
        plans: ["intelligent"],
      },
      {
        icon: "Lightbulb",
        label: "Natural-language financial queries",
        hint: "Ask about your money in plain words.",
        plans: ["intelligent"],
      },
      {
        icon: "Wand2",
        label: "AI-assisted budgeting",
        hint: "Budget suggestions based on what you actually spend.",
        plans: ["intelligent"],
      },
      {
        icon: "Brain",
        label: "Smart recommendations",
        hint: "Practical next steps, not generic advice.",
        plans: ["intelligent"],
      },
    ],
  },
  {
    title: "Support",
    features: [
      {
        icon: "Headphones",
        label: "Priority support",
        hint: "Your questions answered ahead of the queue.",
        plans: ["pro", "intelligent"],
      },
    ],
  },
];

export const FAQS = [
  {
    question: "Can I use WHealthOS for free?",
    answer:
      "Yes. The Free plan covers the dashboard, accounts, and up to five transactions a day, with no card required. You can also try everything without an account at all from the demo.",
  },
  {
    question: "Does WHealthOS charge per transaction?",
    answer:
      "No. Plans are a flat monthly price. The only per-transaction figure is the daily cap on how many you can add, which differs by plan.",
  },
  {
    question: "What happens when I reach my daily transaction limit?",
    answer:
      "Nothing already recorded is affected — you simply cannot add more until the next day, or until you move to a plan with a higher cap.",
  },
  {
    question: "What features are included in the Intelligent plan?",
    answer:
      "Everything in Pro, along with the AI work: monthly insights, spending analysis, written summaries, natural-language queries, budget suggestions and recommendations.",
  },
  {
    question: "Can I upgrade or downgrade later?",
    answer:
      "Yes, at any time. An upgrade applies immediately; a downgrade takes effect at the end of the period you have already paid for.",
  },
  {
    question: "Is AI financial advice?",
    answer:
      "No. The insights describe your own spending and suggest things to look at. They are not regulated financial advice, and you should speak to a qualified adviser before any significant decision.",
  },
  {
    question: "Are there any setup fees?",
    answer: "None. You pay the plan price and nothing else.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes, whenever you like. You keep the paid features until the end of the current period, then move to the Free plan — your data stays where it is.",
  },
];
