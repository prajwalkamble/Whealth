// The tools catalogue.
//
// One source of truth. The directory page, the footer column, each tool's
// metadata, the breadcrumb and every "related tools" list read from here, so a
// tool cannot appear in one place under a different name or point at a route
// that does not exist.
//
// Adding a tool means adding an entry here, an engine in lib/tools/, and a form
// component in the tool route's _components. Nothing else needs touching.

// A category's id is also its ?category= value, so there is one spelling of it
// rather than an internal name plus a URL name that can drift apart.
// A category's id is also its ?category= value, so there is one spelling of it
// rather than an internal name plus a URL name that can drift apart.
//
// Five broad categories, deliberately kept broad: someone arriving with a
// money question should recognise where it belongs without knowing any
// financial vocabulary.
//
// Retirement currently has no tools. It is listed because it is part of the
// taxonomy, and the directory renders its empty state rather than hiding the
// category or inventing a calculator to fill it.
// A category's id is also its ?category= value, so there is one spelling of it
// rather than an internal name plus a URL name that can drift apart.
//
// Declared in the order they appear in the filter. "All" is not a category --
// it is the absence of one -- and "Other" is last by convention.
//
// "Other" is declared but holds nothing. It is kept so a genuinely
// uncategorisable tool has somewhere to go, and the directory hides a category
// with no tools rather than showing an empty tab. Filling it with tools that
// do have a home elsewhere is the exact thing this taxonomy exists to avoid.
export const CATEGORIES = [
  { id: "retirement", name: "Retirement" },
  { id: "savings", name: "Savings" },
  { id: "investing", name: "Investing" },
  { id: "debt", name: "Debt" },
  { id: "home", name: "Home & Property" },
  { id: "net-worth", name: "Net Worth" },
  { id: "other", name: "Other" },
];

// `summary` answers "what problem does this solve?" -- it is the card
// description and the meta description, so it is written once and read as both.
export const TOOLS = [
  {
    slug: "retirement-withdrawal-planner",
    name: "Retirement Withdrawal Planner",
    short: "Retirement Withdrawal",
    category: "retirement",
    question: "I'm retired. How long will my savings last at what I'm drawing?",
    summary:
      "See how many years your retirement savings could last at your current withdrawals, once inflation and returns are accounted for.",
    related: ["retirement-corpus-planner", "financial-runway-planner", "net-worth-calculator"],
  },
  {
    slug: "retirement-corpus-planner",
    name: "Retirement Corpus Planner",
    short: "Retirement Corpus",
    category: "retirement",
    question: "How much will I need saved by the time I retire?",
    summary:
      "Work out the pot your retirement would need, and whether what you're saving now is on course to reach it.",
    related: ["retirement-withdrawal-planner", "investment-growth-planner", "sip-goal-planner"],
  },
  {
    slug: "financial-runway-planner",
    name: "Financial Runway Planner",
    short: "Financial Runway",
    category: "savings",
    question: "If my income stopped today, how long could my savings support me?",
    summary:
      "Estimate how long your available savings could support your essential or current spending.",
    related: ["emergency-fund-planner", "net-worth-calculator", "goal-funding-planner"],
  },
  {
    slug: "emergency-fund-planner",
    name: "Emergency Fund Planner",
    short: "Emergency Fund",
    category: "savings",
    question: "How much should I keep set aside for an emergency?",
    summary:
      "Size a reserve against your essential costs, and see how far what you already hold would stretch.",
    related: ["financial-runway-planner", "goal-funding-planner", "net-worth-calculator"],
  },
  {
    slug: "goal-funding-planner",
    name: "Goal Funding Planner",
    short: "Goal Funding",
    category: "savings",
    question: "I need a specific amount by a specific date. What do I contribute?",
    summary:
      "Estimate how much you may need to contribute regularly to reach a financial goal by a target date.",
    related: ["investment-growth-planner", "sip-goal-planner", "emergency-fund-planner"],
  },
  {
    slug: "debt-payoff-planner",
    name: "Debt Payoff Planner",
    short: "Debt Payoff",
    category: "debt",
    question: "I have several debts. What order should I clear them in?",
    summary:
      "Compare debt repayment strategies and estimate how long it could take to become debt-free.",
    related: ["loan-prepayment-planner", "net-worth-calculator", "financial-runway-planner"],
  },
  {
    slug: "loan-prepayment-planner",
    name: "Loan Prepayment Planner",
    short: "Loan Prepayment",
    category: "debt",
    question: "If I pay extra each month, what would it save me?",
    summary:
      "See how much time and interest paying more than your instalment could save on an existing loan.",
    related: ["debt-payoff-planner", "home-affordability-planner", "net-worth-calculator"],
  },
  {
    slug: "investment-growth-planner",
    name: "Investment Growth Planner",
    short: "Investment Growth",
    category: "investing",
    question: "What could my investments grow to if I keep contributing?",
    summary:
      "Project what an initial amount plus regular contributions could become, and how much of that is growth.",
    related: ["sip-goal-planner", "goal-funding-planner", "net-worth-calculator", "retirement-corpus-planner"],
  },
  {
    slug: "sip-goal-planner",
    name: "SIP Goal Planner",
    short: "SIP Goal",
    category: "investing",
    question: "What monthly SIP would it take to reach my target?",
    summary:
      "Work out the monthly SIP a target might need, or project where your current SIP would land.",
    related: ["goal-funding-planner", "investment-growth-planner"],
  },
  {
    slug: "net-worth-calculator",
    name: "Net Worth Calculator",
    short: "Net Worth",
    category: "net-worth",
    question: "What is my financial position right now?",
    summary: "See the difference between what you own and what you owe, and what each is made of.",
    related: ["debt-payoff-planner", "investment-growth-planner", "financial-runway-planner", "retirement-withdrawal-planner"],
  },
  {
    slug: "home-affordability-planner",
    name: "Home Affordability Planner",
    short: "Home Affordability",
    category: "home",
    question: "What home price could realistically fit my finances?",
    summary:
      "Estimate the property price and instalment your income and existing commitments could support.",
    related: ["rent-vs-buy-planner", "loan-prepayment-planner", "net-worth-calculator"],
  },
  {
    slug: "rent-vs-buy-planner",
    name: "Rent vs. Buy Planner",
    short: "Rent vs. Buy",
    category: "home",
    question: "Over my time horizon, would renting or buying cost me less?",
    summary:
      "Compare renting against buying over a time horizon, including what your deposit could have earned instead.",
    related: ["home-affordability-planner", "loan-prepayment-planner", "investment-growth-planner"],
  },
];

export const TOOL_SLUGS = TOOLS.map((tool) => tool.slug);

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export const toolPath = (slug) => `/tools/${slug}`;

// The card and the breadcrumb both want a tool's category label and its route.
// Derived here rather than stored on each tool, so a label cannot be right in
// one place and stale in another.
export const describeTool = (tool) => ({
  ...tool,
  href: toolPath(tool.slug),
  categoryLabel: CATEGORIES.find((c) => c.id === tool.category)?.name ?? null,
});

// Resolving ?category= into something safe to render.
//
// Anything that is not one of the five is treated as "all" rather than as an
// error: a stale bookmark or a typed URL should show the directory, not a
// broken page, and inventing a category from the query string is exactly the
// bug this guards against.
export function resolveCategory(value) {
  const requested = Array.isArray(value) ? value[0] : value;
  if (!requested || requested === "all") {
    return { id: null, valid: true, category: null };
  }
  const category = CATEGORIES.find((c) => c.id === requested) ?? null;
  return category
    ? { id: category.id, valid: true, category }
    : { id: null, valid: false, category: null };
}

// The tools shown for a resolved category. No category means all of them.
//
// A plain array filter over ten static entries -- there is no request to make
// and nothing to cache.
// The categories the filter shows.
//
// A category with no tools is hidden rather than rendered as a tab that leads
// to an empty page. The active one is always included even when empty, so a
// direct link to it still highlights the right chip instead of showing
// nothing selected.
export function visibleCategories(activeId = null) {
  const counts = new Map();
  for (const tool of TOOLS) counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
  return CATEGORIES.filter((c) => counts.has(c.id) || c.id === activeId);
}

export const toolsInCategory = (categoryId) =>
  (categoryId ? TOOLS.filter((tool) => tool.category === categoryId) : TOOLS).map(describeTool);

export const toolBySlug = (slug) => TOOLS.find((tool) => tool.slug === slug) ?? null;

export const categoryById = (id) => CATEGORIES.find((category) => category.id === id) ?? null;

// The directory, grouped and in the order the categories are declared.
export const groupedTools = () =>
  CATEGORIES.map((category) => ({
    ...category,
    tools: TOOLS.filter((tool) => tool.category === category.id),
  }));

export const relatedTools = (slug) => {
  const tool = toolBySlug(slug);
  if (!tool) return [];
  return tool.related.map(toolBySlug).filter(Boolean);
};

// The four in the footer, chosen because between them they cover the four
// questions people actually arrive with: how long will my money last, can I
// reach my goal, how do I clear what I owe, and where do I stand.
export const FOOTER_TOOL_SLUGS = [
  "financial-runway-planner",
  "goal-funding-planner",
  "debt-payoff-planner",
  "net-worth-calculator",
];
