import Section from "./section";

// The split of responsibility matters enough to show as two explicit columns.
// Enterprise is customer-operated: WHealthOS builds and releases the software,
// the organisation runs it. Nothing here should read as a managed service.
const CUSTOMER = [
  "Infrastructure",
  "Deployment",
  "Monitoring",
  "Security operations",
  "Backups",
  "Availability",
  "Administration",
];

const WHEALTHOS = [
  "Product development",
  "Product releases",
  "Feature updates",
  "Bug fixes",
  "Security fixes",
  "Documentation",
];

// Two bordered cards here would repeat the Today / Planned pair in "What is
// WHealthOS?". This is a division of responsibility rather than a comparison
// of two options, so it reads as one table split down the middle: a shared
// rule across the top, a hairline between the halves, no boxes.
const Column = ({ title, items }) => (
  <div className="pt-6 md:px-8 md:first:pl-0 md:last:pr-0">
    <h3 className="text-sm font-semibold">{title}</h3>
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item} className="text-sm text-muted-foreground">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const Enterprise = () => (
  <Section
    id="enterprise"
    title="Built to grow with the organisation."
    lead="WHealthOS is being designed so one financial foundation can eventually support individuals, professionals, businesses and customer-operated enterprise deployments. None of the enterprise work exists yet."
  >
    <div className="mt-10 grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
      <Column title="The organisation operates" items={CUSTOMER} />
      <Column title="WHealthOS provides" items={WHEALTHOS} />
    </div>
  </Section>
);

export default Enterprise;
