import { formatCompactCurrency } from "./format";

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// The four public figures, formatted once so the landing page and the About
// page cannot drift apart on a label or a rounding rule.
//
// A tile whose figure cannot be computed yet carries `value: null`. What to do
// with that is the caller's decision, not this module's: the landing band drops
// it, the About page shows the label with the number missing. Neither invents
// one.
//
// What each one actually measures, since two of the labels could be read more
// broadly than the data supports:
//
//   Transaction Success Rate  the share of recorded transactions whose status
//                             is COMPLETED. A failed write never becomes a
//                             row, so it is not an attempt-to-success ratio.
//   Average User Savings      income minus expenses, averaged per user --
//                             what their own figures add up to, not evidence
//                             that WHealthOS produced the saving.
//   Transactions Tracked      every transaction row, all users. A plain count
//                             of what the product holds.
//
// "Improved Financial Growth" stood where Transactions Tracked now does. It
// compared the current calendar month against the previous one, so it was null
// for the first days of every month and compared a partial month against a
// complete one for the rest. getLandingStats still computes `improved`; put it
// back here only once that window is fixed.
export function buildStatTiles(stats) {
  if (!stats) return [];

  return [
    {
      label: "Transaction Success Rate",
      // Floored, so 99.96% is never rounded up to a flat 100%.
      value:
        stats.successRate === null
          ? null
          : `${Math.floor(stats.successRate * 10) / 10}%`,
    },
    {
      label: "Average User Savings",
      value:
        stats.savedAmount === null
          ? null
          : formatCompactCurrency(stats.savedAmount),
    },
    {
      label: "Transactions Tracked",
      value: compactNumber.format(stats.transactions),
    },
    {
      label: "Active Users Worldwide",
      value: compactNumber.format(stats.activeUsers),
    },
  ];
}
