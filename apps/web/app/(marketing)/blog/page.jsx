import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COMPANY_LINKS } from "@/lib/company/links";
import { formatPostDate, publishedPosts } from "@/lib/blog/posts";

export const metadata = {
  title: "Blog | WHealthOS",
  description:
    "Notes from building WHealthOS: how the product handles financial data, and the decisions behind it.",
  alternates: { canonical: "/blog" },
};

// The blog index.
//
// An editorial list rather than a grid of cards: there are two articles, and
// three cards with one empty slot is how a blog announces it has nothing to
// say. The date sits in its own column so the list reads chronologically at a
// glance.
//
// Drafts are not here, because publishedPosts() does not return them. See
// lib/blog/posts.js.

export default function BlogPage() {
  const posts = publishedPosts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
          Notes from building this. Mostly how the product handles money and
          why it was built that way — written when there is something worth
          writing, rather than on a schedule.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="mt-14 max-w-2xl rounded-xl border bg-muted/40 p-6">
          <h2 className="text-base font-semibold">Nothing published yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            There is nothing here to read at the moment. The{" "}
            <Link
              href={COMPANY_LINKS.openSource}
              className="font-medium text-foreground underline underline-offset-4"
            >
              repository
            </Link>{" "}
            is the most honest account of what WHealthOS does today.
          </p>
        </div>
      ) : (
        <ol className="mt-14 divide-y border-t">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group grid gap-x-10 gap-y-3 py-10 md:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="flex items-baseline gap-3 md:flex-col md:gap-1.5">
                  <time
                    dateTime={post.date}
                    className="text-sm tabular-nums text-muted-foreground"
                  >
                    {formatPostDate(post.date)}
                  </time>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {post.topic}
                  </span>
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    <Link
                      href={`${COMPANY_LINKS.blog}/${post.slug}`}
                      className="rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 max-w-2xl text-[0.975rem] leading-7 text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Read
                    <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
