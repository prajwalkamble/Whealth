// One place for money formatting, so every screen shows the same thing.
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const compactRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatCurrency = (value) => rupees.format(Number(value) || 0);

// For tight spaces such as chart axes: ₹1.2L instead of ₹1,20,000.00.
export const formatCompactCurrency = (value) =>
  compactRupees.format(Number(value) || 0);
