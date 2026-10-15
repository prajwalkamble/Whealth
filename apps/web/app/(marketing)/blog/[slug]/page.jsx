import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { COMPANY_LINKS } from "@/lib/company/links";
import { formatPostDate, publishedPost, publishedPosts } from "@/lib/blog/posts";
import { articleFor } from "../_posts/registry";

// One article.
//
// Only published posts exist here: publishedPost() returns null for a draft or
// an unknown slug, and the page calls notFound() -- so a draft's URL is a 404
// rather than a page someone can be sent a link to.
//
// generateStaticParams lists the published slugs, which also means a draft is
// not prerendered into the build output.

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = publishedPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} | WHealthOS`,
    description: post.description,
    alternates: { canonical: `${COMPANY_LINKS.blog}/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = publishedPost(slug);
  const Article = articleFor(slug);
  if (!post || !Article) notFound();

  // Structured data, kept to the properties that are actually established:
  // the headline, the description, the real publication date, and WHealthOS as
  // both author and publisher. No image, because there is no article image to
  // name; no named individual, and no absolute URL, which would hard-code a
  // domain this page does not otherwise depend on.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "en",
    author: { "@type": "Organization", name: "WHealthOS" },
    publisher: { "@type": "Organization", name: "WHealthOS" },
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <script
        type="application/ld+json"
        // The object is built above from static values, so there is nothing
        // user-supplied in it to escape.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-2xl">
        <Link
          href={COMPANY_LINKS.blog}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          All articles
        </Link>

        <article className="mt-8">
          <header>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>{post.topic}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.date} className="tabular-nums">
                {formatPostDate(post.date)}
              </time>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
              {post.description}
            </p>
          </header>

          <div className="mt-10 space-y-6 border-t pt-10">
            <Article />
          </div>
        </article>

        <footer className="mt-14 border-t pt-8">
          <p className="text-sm leading-6 text-muted-foreground">
            The code behind all of this is public — see the{" "}
            <Link
              href={COMPANY_LINKS.openSource}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Open Source page
            </Link>
            . If something here is wrong, or you want to argue with it,{" "}
            <Link
              href={COMPANY_LINKS.contact}
              className="font-medium text-foreground underline underline-offset-4"
            >
              get in touch
            </Link>
            .
          </p>
          <Link
            href={COMPANY_LINKS.blog}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            All articles
          </Link>
        </footer>
      </div>
    </div>
  );
}
