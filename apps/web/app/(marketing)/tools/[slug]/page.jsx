import { notFound } from "next/navigation";
import { TOOL_SLUGS, toolBySlug, toolPath } from "@/lib/tools/registry";
import ToolShell from "../_components/tool-shell";
import { CONTENT } from "../_components/content";

// One route per tool, all ten rendered from the registry.
//
// A static route file each would be ten near-identical copies of this, and the
// first thing to drift would be the shell. generateStaticParams still gives
// every tool its own prerendered page and its own metadata.
export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) return {};
  return {
    title: `${tool.name} | WHealthOS`,
    description: tool.summary,
    alternates: { canonical: toolPath(tool.slug) },
  };
}

export default async function ToolPage({ params }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  // A slug that is not in the registry is a 404, not an empty shell.
  if (!tool) notFound();

  const content = CONTENT[slug];
  if (!content) notFound();

  const Calculator = content.Calculator;

  return (
    <ToolShell
      tool={tool}
      howItWorks={content.howItWorks}
      assumptions={content.assumptions}
      considerations={content.considerations}
    >
      <Calculator />
    </ToolShell>
  );
}
