import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  COMPANY_CONTENT_LINKS,
  COMPANY_LINKS,
  COMPANY_NAV,
} from "@/lib/company/links";
import { CONTACT_EMAIL, CONTACT_TOPICS, DO_NOT_SEND } from "@/lib/company/contact";
import { HIRING_STATUS, OPENINGS } from "@/lib/company/careers";
import {
  NOT_YET_PUBLISHED,
  PUBLISHED,
  REPOSITORY,
} from "@/lib/company/open-source";
import { POSTS, publishedPost, publishedPosts } from "@/lib/blog/posts";
import { ARTICLES } from "@/app/(marketing)/blog/_posts/registry";
import { contactInputSchema, firstFieldError } from "@/app/lib/schema";

// Guards on the Company section: About, Contact, Careers, Open Source, Blog.
//
// These pages are where a product is most tempted to invent things -- a
// support address nobody reads, a job opening that does not exist, a licence
// the repository does not carry, a blog post with a date on it that was never
// published. None of that breaks a build, and all of it is a false statement
// to a visitor.
//
// So the assertions here are mostly about what must NOT be on these pages, and
// about the few facts that have to stay in step with the repository they were
// read out of. When one of them legitimately changes, the fact belongs in
// lib/company/ or lib/blog/posts.js and the test should change in the same
// commit -- deliberately, not by deleting an assertion to make a build pass.

const WEB = path.resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(path.join(WEB, relative), "utf8");
const exists = (relative) => existsSync(path.join(WEB, relative));

const PAGES = {
  about: "app/(marketing)/about/page.jsx",
  contact: "app/(marketing)/contact/page.jsx",
  careers: "app/(marketing)/careers/page.jsx",
  openSource: "app/(marketing)/open-source/page.jsx",
  blog: "app/(marketing)/blog/page.jsx",
  blogPost: "app/(marketing)/blog/[slug]/page.jsx",
};

const CONTACT_FORM = "app/(marketing)/contact/_components/contact-form.jsx";
const CONTACT_ACTION = "actions/contact.js";
const FOOTER = "components/footer.jsx";
const HEADER_NAV = "components/header-nav.jsx";

// Comments discuss the things these pages deliberately leave out, so a
// forbidden-phrase check against raw source would flag the explanation rather
// than a claim. JSX also breaks prose at whatever column the formatter chose,
// so whitespace is collapsed before any sentence is looked for.
const renderedText = (source) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\s+/g, " ");

const prose = (relative) => renderedText(read(relative)).toLowerCase();

describe("The Company routes", () => {
  it("every link in lib/company/links.js resolves to a page", () => {
    for (const [name, href] of Object.entries(COMPANY_LINKS)) {
      const route = href.replace(/^\//, "");
      expect(
        exists(`app/(marketing)/${route}/page.jsx`),
        `${name} (${href}) has no page`
      ).toBe(true);
    }
  });

  // Every navigation entry clickable, and every href a route that exists.
  it("navigates to real routes, from the one source", () => {
    const entries = [...COMPANY_NAV, ...COMPANY_CONTENT_LINKS];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.href, `${entry.label} has no href`).toBeTruthy();
      expect(Object.values(COMPANY_LINKS)).toContain(entry.href);
    }
  });

  // About and Contact are the footer's Company group and are not in the top
  // bar, by instruction. NAV feeds both the desktop nav and the mobile sheet,
  // so the one assertion against it covers both.
  it("links About and Contact from the footer, and not from the header", () => {
    expect(COMPANY_NAV.map((entry) => entry.href)).toEqual([
      COMPANY_LINKS.about,
      COMPANY_LINKS.contact,
    ]);

    const footer = read(FOOTER);
    expect(footer).toContain('from "@/lib/company/links"');
    // They head the footer's Company group, with Blog under them.
    expect(footer).toContain('title: "Company", links: [...COMPANY_NAV');
    expect(footer).toContain("...COMPANY_CONTENT_LINKS");

    const header = read(HEADER_NAV);
    expect(header).not.toContain("COMPANY_NAV");
    const bar = renderedText(header);
    for (const label of ["About", "Contact"]) {
      expect(bar, `${label} is still in the top bar`).not.toContain(label);
    }
  });

  // Blog is the only resource that exists. Documentation, a Help Center, a
  // Getting Started guide and a Changelog have no pages, so the footer does
  // not name them -- not even as unlinked text, which advertises a section
  // just as surely as a link does.
  it("lists only the resources that exist", () => {
    expect(COMPANY_CONTENT_LINKS.map((entry) => entry.href)).toEqual([
      COMPANY_LINKS.blog,
    ]);
    const footer = read(FOOTER);
    expect(footer).toContain('title: "Resources"');
    for (const absent of [
      "Documentation",
      "Help Center",
      "Getting Started",
      "Changelog",
      "Roadmap",
      "Status",
    ]) {
      expect(renderedText(footer), `${absent} is still in the footer`).not.toContain(absent);
    }
  });

  // By instruction: the footer presents WHealthOS as the commercial product
  // it is. The /open-source page still exists and still says the repository is
  // public -- it is simply not advertised in the chrome. Careers likewise:
  // there is no role open.
  it("does not advertise Open Source or Careers in the chrome", () => {
    const advertised = [...COMPANY_NAV, ...COMPANY_CONTENT_LINKS].map(
      (entry) => entry.href
    );
    expect(advertised).not.toContain(COMPANY_LINKS.openSource);
    expect(advertised).not.toContain(COMPANY_LINKS.careers);

    for (const source of [read(FOOTER), read(HEADER_NAV)]) {
      const text = renderedText(source);
      expect(text).not.toContain("Open Source");
      expect(text).not.toContain("Careers");
      expect(text).not.toContain("GitHub");
    }
    // The pages themselves stay, and stay honest.
    expect(exists("app/(marketing)/careers/page.jsx")).toBe(true);
    expect(exists("app/(marketing)/open-source/page.jsx")).toBe(true);
  });

  // A footer link that leads nowhere is the one thing a footer must not do.
  it("points every footer link at a route that exists", () => {
    const footer = read(FOOTER);
    expect(footer).not.toContain('href="#"');
    const hrefs = [...footer.matchAll(/href: "(\/[^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      if (href.startsWith("/tools/")) continue; // generated from the registry
      const route = href.replace(/^\//, "");
      const found =
        exists(`app/(marketing)/${route}/page.jsx`) ||
        exists(`app/(main)/${route}/page.jsx`) ||
        exists(`app/${route}/page.jsx`);
      expect(found, `${href} has no page`).toBe(true);
    }
  });

  // The reference footer opens with a call to action. The landing page used
  // to end with its own, directly above -- two of them stacked said the same
  // thing twice, so the page's went and the footer's carries every page.
  it("carries the call to action, and the landing page no longer repeats it", () => {
    const footer = read(FOOTER);
    expect(footer).toContain("Take control of your finances");
    expect(footer).toContain('href="/sign-up"');
    expect(renderedText(read("app/(marketing)/page.jsx"))).not.toContain(
      "Ready to take control"
    );
  });

  // A decorative circle that does not scroll is worse than no circle.
  it("gives the back-to-top control a name and a job", () => {
    const button = read("components/back-to-top.jsx");
    expect(button).toContain('aria-label="Back to top"');
    expect(button).toContain("window.scrollTo");
    // scrollTo's "smooth" ignores the motion preference, so the component
    // reads it.
    expect(button).toContain("prefers-reduced-motion");
    expect(read(FOOTER)).toContain("<BackToTop");
  });

  // The reference carries four social icons. WHealthOS has no accounts, and a
  // borrowed or guessed profile is a lie about where to find us.
  it("invents no social profiles", () => {
    const text = renderedText(read(FOOTER));
    for (const platform of [
      "twitter",
      "x.com",
      "facebook",
      "instagram",
      "linkedin",
      "youtube",
      "Social profile",
    ]) {
      expect(text.toLowerCase(), platform).not.toContain(platform.toLowerCase());
    }
    // mailto: is the only non-route destination the footer has.
    const external = [...read(FOOTER).matchAll(/https?:\/\/[^"'`\s]+/g)].map((m) => m[0]);
    expect(external).toEqual([]);
  });

  it("stays public: no company route is in isProtectedRoute", () => {
    const middleware = readFileSync(path.join(WEB, "middleware.js"), "utf8");
    const block = middleware.slice(
      middleware.indexOf("isProtectedRoute"),
      middleware.indexOf("const aj")
    );
    for (const href of Object.values(COMPANY_LINKS)) {
      expect(block).not.toContain(`"${href}`);
    }
  });

  it.each(Object.entries(PAGES))("%s declares a canonical URL", (_name, file) => {
    expect(read(file)).toMatch(/alternates: \{ canonical:/);
  });

  it.each(Object.entries(PAGES))("%s sets a title and a description", (_name, file) => {
    const source = read(file);
    expect(source).toMatch(/title:/);
    expect(source).toMatch(/description:/);
  });

  // About composes its sections, so its heading lives in the hero component
  // rather than in the route file.
  const H1_SOURCES = { ...PAGES, about: "app/(marketing)/about/_components/about-hero.jsx" };

  it.each(Object.entries(H1_SOURCES))("%s has exactly one h1", (_name, file) => {
    const source = read(file);
    const count = (source.match(/<h1[\s>]/g) ?? []).length;
    expect(count).toBe(1);
  });

  it.each(Object.entries(PAGES))("%s has no dead internal link", (_name, file) => {
    const source = read(file);
    const hrefs = [...source.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);

    for (const href of hrefs) {
      const [route] = href.split("#");
      if (!route || route === "/") continue;
      const relative = `app/(marketing)${route}/page.jsx`;
      const alt = `app${route}/page.jsx`;
      expect(
        exists(relative) || exists(alt),
        `${file} links to ${href}, which has no page`
      ).toBe(true);
    }
  });

  // Every external destination on these pages has to be one of the verified
  // ones. An invented URL is the failure mode here: it looks right and sends
  // people somewhere that is not ours.
  it.each(Object.entries(PAGES))("%s links only verified external URLs", (_name, file) => {
    const source = read(file);
    const allowed = new Set([
      REPOSITORY.url,
      REPOSITORY.issuesUrl,
      REPOSITORY.newIssueUrl,
      ...PUBLISHED.files.map((entry) => entry.url),
    ]);
    const external = [...source.matchAll(/href="(https?:\/\/[^"]*)"/g)].map((m) => m[1]);
    for (const url of external) {
      expect(allowed.has(url), `${file} links ${url}, which is not verified`).toBe(true);
    }
  });

  it.each(Object.entries(PAGES))("%s opens external links safely", (_name, file) => {
    const source = read(file);
    const blanks = (source.match(/target="_blank"/g) ?? []).length;
    const rels = (source.match(/rel="noreferrer noopener"/g) ?? []).length;
    expect(rels).toBeGreaterThanOrEqual(blanks);
  });
});

describe("Contact", () => {
  const page = read(PAGES.contact);
  const form = read(CONTACT_FORM);
  const action = read(CONTACT_ACTION);

  it("publishes only the verified address", () => {
    for (const file of [PAGES.contact, PAGES.careers, PAGES.openSource, CONTACT_FORM]) {
      const addresses = [...read(file).matchAll(/[\w.+-]+@[\w.-]+\.\w+/g)].map((m) => m[0]);
      for (const address of addresses) {
        expect(address, `${file} publishes ${address}`).toBe(CONTACT_EMAIL);
      }
    }
  });

  it("names the address from lib/company/contact.js rather than inline", () => {
    expect(page).toContain('from "@/lib/company/contact"');
    expect(page).not.toContain(`"${CONTACT_EMAIL}"`);
  });

  // The operator asked for this page to carry nothing about the project being
  // developed in the open -- no wording, no category, no link, nothing in its
  // metadata. The check covers the page, the form, the action, the email it
  // sends and the facts module behind all four.
  it("says nothing about the project being developed in the open", () => {
    const forbidden = /open.?source|github|repositor|issue tracker|pull request|contribut|source code/i;
    const files = {
      page: PAGES.contact,
      form: CONTACT_FORM,
      action: CONTACT_ACTION,
      email: "emails/contact.jsx",
      facts: "lib/company/contact.js",
    };
    for (const [name, file] of Object.entries(files)) {
      const source = read(file);
      expect(source, `${name} imports the open-source facts`).not.toContain(
        "@/lib/company/open-source"
      );
      const match = renderedText(source).match(forbidden);
      expect(match, `${name} mentions "${match?.[0]}"`).toBeNull();
    }
  });

  it("offers no category for a product that has no billing", () => {
    const ids = CONTACT_TOPICS.map((topic) => topic.id);
    expect(ids).toContain("support");
    expect(ids).toContain("security");
    expect(ids).not.toContain("billing");
    expect(prose(PAGES.contact)).not.toContain("subscription");
  });

  it("promises no response time", () => {
    const text = `${prose(PAGES.contact)} ${prose(CONTACT_FORM)}`;
    for (const phrase of [
      "within 24 hours",
      "within 48 hours",
      "same day",
      "one business day",
      "two business days",
      "we respond within",
      "guaranteed response",
      "24/7",
    ]) {
      expect(text, `claims "${phrase}"`).not.toContain(phrase);
    }
  });

  it("invents no support apparatus", () => {
    const text = prose(PAGES.contact);
    for (const phrase of ["live chat", "call us", "phone support", "support portal", "our offices", "business hours"]) {
      expect(text, `claims "${phrase}"`).not.toContain(phrase);
    }
  });

  it("tells people what not to send, and links the Privacy Policy", () => {
    expect(DO_NOT_SEND.length).toBeGreaterThan(0);
    expect(page).toContain("DO_NOT_SEND");
    expect(page).toContain('href="/privacy"');
    expect(exists("app/(marketing)/privacy/page.jsx")).toBe(true);
  });

  describe("the action", () => {
    it("is a server action that validates its own payload", () => {
      expect(action.startsWith('"use server"')).toBe(true);
      expect(action).toContain("contactInputSchema.safeParse(rawData)");
    });

    it("rate limits an anonymous caller before doing any work", () => {
      expect(action).toContain('checkAnonymousRateLimit("contact")');
      const limitAt = action.indexOf("checkAnonymousRateLimit");
      const parseAt = action.indexOf("contactInputSchema.safeParse");
      expect(limitAt).toBeLessThan(parseAt);
    });

    it("separates a rate limit from a delivery failure, for the form to render", () => {
      for (const code of ["rate-limited", "validation", "delivery", "unavailable"]) {
        expect(action, `no ${code} result`).toContain(`"${code}"`);
      }
    });

    it("names a retry time only when one is known", () => {
      expect(action).toContain("limit.retryAfterSeconds");
      expect(action).toContain("minutes");
      // The fallback branch exists, so an unknown reset never becomes a guess.
      expect(action).toContain("Please try again later");
    });

    it("refuses a honeypot submission", () => {
      expect(action).toContain("if (website)");
      expect(action).toContain("CONTACT_HONEYPOT");
    });

    it("sends only to the configured inbox, never to an address from the payload", () => {
      expect(action).toContain("process.env.FEEDBACK_EMAIL");
      expect(action).toContain("to: INBOX");
      expect(action).toContain("replyTo: email");
      // No other recipient can be chosen by the caller.
      expect(action).not.toMatch(/to:\s*(email|rawData|parsed)/);
    });

    it("refuses rather than pretending when there is nowhere to deliver", () => {
      expect(action).toContain("if (!INBOX)");
    });

    it("never reports success for a send that failed", () => {
      expect(action).toContain("if (!result.success)");
      const failureAt = action.indexOf("if (!result.success)");
      const successAt = action.lastIndexOf("return { success: true");
      expect(failureAt).toBeLessThan(successAt);
    });

    it("swallows an accidental duplicate instead of sending it twice", () => {
      expect(action).toContain("seenRecently(");
      expect(action).toContain("DUPLICATE_WINDOW_MS");
      expect(action).toContain('code: "duplicate"');
    });

    it("logs no message body and no address", () => {
      // The only console calls carry a code and a topic, or the reason the
      // provider gave -- never the enquiry itself.
      const logs = [...action.matchAll(/console\.error\(([\s\S]*?)\);/g)].map((m) => m[1]);
      for (const log of logs) {
        expect(log).not.toContain("message");
        expect(log).not.toContain("email");
        expect(log).not.toContain("name");
      }
    });

    it("does not store the enquiry", () => {
      expect(action).not.toMatch(/@\/lib\/prisma|adminDb|withTenant/);
    });
  });

  describe("the form", () => {
    it("keeps the honeypot out of sight and out of the tab order", () => {
      expect(form).toContain("tabIndex={-1}");
      expect(form).toContain("aria-hidden");
      expect(form).toContain('id="contact-website"');
    });

    it("uses static ids, never useId()", () => {
      expect(renderedText(form)).not.toContain("useId");
      expect(form).toContain("const IDS = {");
    });

    it("gives every field a visible label tied to its control", () => {
      expect(form).toContain('<label htmlFor={id}');
      for (const field of ["name", "email", "subject", "message", "topic"]) {
        expect(form, `${field} has no id`).toContain(`${field}: "contact-${field}"`);
      }
    });

    it("marks an invalid control and describes why", () => {
      expect(form).toContain("aria-invalid={Boolean(errors.email)}");
      expect(form).toContain('aria-describedby={errors.email ? errorId("email")');
      expect(form).toContain("const errorId =");
    });

    it("reports a form-level failure as an alert", () => {
      expect(form).toContain('role="alert"');
      expect(form).toContain("{formError}");
    });

    it("announces progress without making every control live", () => {
      expect(form).toContain("aria-busy={submitting}");
      expect((form.match(/aria-live="polite"/g) ?? []).length).toBeLessThanOrEqual(2);
      expect(form).toContain('role="status"');
    });

    it("blocks a second submission while one is in flight", () => {
      expect(form).toContain("if (submitting) return;");
      expect(form).toContain("disabled={submitting}");
    });

    it("keeps what was typed when sending fails", () => {
      // setValues(EMPTY) appears once, on success, and nowhere in a failure
      // branch.
      expect((form.match(/setValues\(EMPTY\)/g) ?? []).length).toBe(1);
      const successAt = form.indexOf("setSent({");
      const clearAt = form.indexOf("setValues(EMPTY)", successAt);
      expect(clearAt).toBeGreaterThan(successAt);
    });

    it("does not move focus once a message has been sent", () => {
      const sentPanel = form.slice(form.indexOf("if (sent)"), form.indexOf("return (\n    <form"));
      expect(sentPanel).not.toContain("focus(");
    });

    it("respects a reduced-motion preference", () => {
      expect(form).toContain("motion-reduce:animate-none");
    });

    it("claims only that the message was sent", () => {
      const text = prose(CONTACT_FORM);
      expect(text).toContain("your message has been sent");
      for (const phrase of ["we have read", "will get back to you within", "delivered to"]) {
        expect(text).not.toContain(phrase);
      }
    });
  });

  describe("the schema", () => {
    const valid = {
      topic: CONTACT_TOPICS[0].id,
      name: " A Person ",
      email: "  Someone@Example.COM ",
      subject: "  A short subject  ",
      message: "this is a real message",
      website: "",
    };

    it("normalises what it keeps", () => {
      const parsed = contactInputSchema.parse(valid);
      expect(parsed.email).toBe("someone@example.com");
      expect(parsed.name).toBe("A Person");
      expect(parsed.subject).toBe("A short subject");
    });

    it("strips anything from the subject that could start a second header", () => {
      const parsed = contactInputSchema.parse({
        ...valid,
        subject: "Hello\r\nBcc: someone@elsewhere.test",
      });
      expect(parsed.subject).not.toMatch(/[\r\n]/);
      expect(parsed.subject).toBe("Hello Bcc: someone@elsewhere.test");
    });

    it("drops fields it was not expecting", () => {
      const parsed = contactInputSchema.parse({ ...valid, to: "victim@example.test", admin: true });
      expect(parsed).not.toHaveProperty("to");
      expect(parsed).not.toHaveProperty("admin");
    });

    it("requires every field a reply depends on", () => {
      for (const field of ["name", "email", "subject", "message"]) {
        expect(
          contactInputSchema.safeParse({ ...valid, [field]: "" }).success,
          `${field} may be empty`
        ).toBe(false);
        expect(
          contactInputSchema.safeParse({ ...valid, [field]: "   " }).success,
          `${field} may be whitespace`
        ).toBe(false);
      }
    });

    it("rejects an address that is not one", () => {
      expect(contactInputSchema.safeParse({ ...valid, email: "not-an-address" }).success).toBe(false);
    });

    it("rejects a topic it does not offer", () => {
      expect(contactInputSchema.safeParse({ ...valid, topic: "billing" }).success).toBe(false);
    });

    it("bounds every field", () => {
      expect(contactInputSchema.safeParse({ ...valid, message: "too short" }).success).toBe(false);
      expect(contactInputSchema.safeParse({ ...valid, message: "x ".repeat(2500) }).success).toBe(false);
      expect(contactInputSchema.safeParse({ ...valid, email: `${"a".repeat(250)}@example.com` }).success).toBe(false);
      expect(contactInputSchema.safeParse({ ...valid, name: "n".repeat(81) }).success).toBe(false);
      expect(contactInputSchema.safeParse({ ...valid, subject: "s".repeat(121) }).success).toBe(false);
    });

    it("names the field a failure belongs to", () => {
      const result = contactInputSchema.safeParse({ ...valid, email: "nope" });
      expect(result.success).toBe(false);
      expect(firstFieldError(result.error)).toMatchObject({ field: "email" });
    });
  });
});

describe("Careers", () => {
  const page = read(PAGES.careers);
  const text = prose(PAGES.careers);

  it("says plainly that there is nothing open", () => {
    expect(OPENINGS).toHaveLength(0);
    expect(text).toContain("no open roles");
    expect(HIRING_STATUS.summary).toBeTruthy();
    expect(HIRING_STATUS.asOf).toBeTruthy();
  });

  it("invents no roles, no package and no process", () => {
    for (const phrase of [
      "salary",
      "equity",
      "stock options",
      "benefits package",
      "perks",
      "interview process",
      "hiring process",
      "we are always looking for exceptional",
      "join our team of",
    ]) {
      expect(text, `claims "${phrase}"`).not.toContain(phrase);
    }
  });

  it("collects nothing: no application form and no CV upload", () => {
    expect(page).not.toContain('type="file"');
    expect(page).not.toContain("<form");
    for (const phrase of ["upload your cv", "upload your resume", "attach your cv", "apply now"]) {
      expect(text, `invites "${phrase}"`).not.toContain(phrase);
    }
  });

  it("points at the two routes that do exist", () => {
    expect(page).toContain("COMPANY_LINKS.contact");
    expect(page).toContain("COMPANY_LINKS.openSource");
  });

  // If a real role is ever added, it has to be a complete one.
  it.each(OPENINGS)("an opening carries everything a reader needs: %s", (opening) => {
    expect(opening.title).toBeTruthy();
    expect(opening.summary).toBeTruthy();
    expect(opening.arrangement).toBeTruthy();
    expect(opening.howToApply).toBeTruthy();
    expect(opening.responsibilities?.length).toBeGreaterThan(0);
    expect(opening.requirements?.length).toBeGreaterThan(0);
  });
});

describe("Open Source", () => {
  const page = read(PAGES.openSource);
  const text = prose(PAGES.openSource);

  it("names one repository, and it is the verified one", () => {
    expect(REPOSITORY.url).toBe("https://github.com/prajwalkamble/Whealth");
    expect(REPOSITORY.visibility).toBe("public");
    for (const entry of PUBLISHED.files) {
      expect(entry.url.startsWith(`${REPOSITORY.url}/`)).toBe(true);
    }
  });

  it("states the licence the published branch actually carries", () => {
    expect(page).toContain("PUBLISHED.license.name");
    expect(PUBLISHED.license.spdx).toBeTruthy();
  });

  it("does not present the unpublished licence as the one in force", () => {
    if (PUBLISHED.current) return;
    // The page may name the Apache licence -- it has to, to explain the
    // change -- but not as a statement about what is available now.
    for (const phrase of [
      `the repository is licensed under the ${NOT_YET_PUBLISHED.license.name.toLowerCase()}`,
      `licensed under the ${NOT_YET_PUBLISHED.license.name.toLowerCase()}`,
      "the code is apache-2.0",
    ]) {
      expect(text, `claims "${phrase}"`).not.toContain(phrase);
    }
    // The licence is rendered from PUBLISHED rather than written into the
    // page, and the gap is explained rather than left for a reader to find.
    expect(page).toContain("{PUBLISHED.license.name}");
    expect(page).toContain("!PUBLISHED.current");
    expect(text).toContain("not published yet");
  });

  it("links no file that is not on the published branch", () => {
    const hrefs = [...page.matchAll(/href="(https?:\/\/[^"]*)"/g)].map((m) => m[1]);
    for (const document of NOT_YET_PUBLISHED.documents) {
      for (const href of hrefs) {
        expect(
          href.includes(document.label),
          `links ${document.label}, which is not published`
        ).toBe(false);
      }
    }
  });

  it("shows no vanity metrics", () => {
    for (const phrase of ["stars", "forks", "contributors", "downloads", "commits a week"]) {
      // "no star, fork or contributor counts" is the page saying it does not
      // show them, which is why the singular forms are what is checked.
      expect(text, `shows "${phrase}"`).not.toMatch(
        new RegExp(`\\d[\\d,.]*\\s*${phrase}`)
      );
    }
  });

  it("keeps the maintainer's name out of the rendered page", () => {
    // The GitHub handle is a person's name and the operator asked for it to
    // stay off the site. It is unavoidable inside the repository URL, so only
    // the text outside hrefs and imported constants is checked.
    const withoutLinks = text.replace(/href="[^"]*"/g, " ");
    expect(withoutLinks).not.toContain(REPOSITORY.owner);
  });

  it("separates the source from the hosted service", () => {
    expect(page).toContain("SERVICE_BOUNDARY");
    expect(text).toContain("trademark");
  });

  it("sends security reports to a private channel, not the issue tracker", () => {
    expect(text).toContain("do not open a public issue");
    expect(page).toContain("CONTACT_EMAIL");
  });
});

describe("Blog", () => {
  it("has a page for every published post and none for a draft", () => {
    for (const post of POSTS) {
      const registered = Object.hasOwn(ARTICLES, post.slug);
      if (post.status === "published") {
        expect(registered, `${post.slug} is published with no article`).toBe(true);
      } else {
        expect(registered, `${post.slug} is a draft with an article`).toBe(false);
      }
    }
  });

  it("gives a published post everything the page needs", () => {
    expect(publishedPosts().length).toBeGreaterThan(0);
    for (const post of publishedPosts()) {
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.excerpt).toBeTruthy();
      expect(post.topic).toBeTruthy();
      // A real date, in ISO form, that parses.
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(post.date))).toBe(false);
    }
  });

  it("puts no date on a draft, and says what it is waiting for", () => {
    const drafts = POSTS.filter((post) => post.status !== "published");
    for (const draft of drafts) {
      expect(draft.date, `${draft.slug} has a date`).toBeNull();
      expect(draft.needs, `${draft.slug} does not say what it needs`).toBeTruthy();
    }
  });

  it("does not resolve a draft or an unknown slug", () => {
    for (const draft of POSTS.filter((post) => post.status !== "published")) {
      expect(publishedPost(draft.slug)).toBeNull();
    }
    expect(publishedPost("not-a-post")).toBeNull();
  });

  it("prerenders published slugs only, and 404s anything else", () => {
    const route = read(PAGES.blogPost);
    expect(route).toContain("publishedPosts()");
    expect(route).toContain("export const dynamicParams = false");
    expect(route).toContain("notFound()");
  });

  it("builds structured data from verified values only", () => {
    const route = read(PAGES.blogPost);
    expect(route).toContain('"@type": "BlogPosting"');
    expect(route).toContain("datePublished: post.date");
    // Organization, not a named individual, and no made-up image.
    expect(route).toContain('author: { "@type": "Organization", name: "WHealthOS" }');
    expect(route).not.toContain("image:");
  });

  it("links back to the index from an article", () => {
    const route = read(PAGES.blogPost);
    expect(route).toContain("href={COMPANY_LINKS.blog}");
  });

  it("handles having nothing published", () => {
    const index = read(PAGES.blog);
    expect(index).toContain("posts.length === 0");
  });

  it.each(Object.keys(ARTICLES))("%s makes no first-person claim", (slug) => {
    // The articles are written from the codebase. A sentence in the operator's
    // voice -- what they felt, used or remember -- is the one thing that
    // cannot be sourced that way, so it stays out until they write it.
    const article = read(`app/(marketing)/blog/_posts/${slug}.jsx`);
    const text = renderedText(article);
    expect(text).not.toMatch(/\bI\b|\bI'|\bmy\b|\bwe\b|\bour\b|\bme\b/i);
  });
});

describe("About", () => {
  const page = read(PAGES.about);

  it("describes where the product stands, from the verified feature list", () => {
    expect(page).toContain("<Status />");
    const status = read("app/(marketing)/about/_components/status.jsx");
    expect(status).toContain('from "@/lib/legal/terms"');
    expect(status).toContain("FEATURES.map");
  });

  it("no longer advertises a built section as planned", () => {
    const capabilities = read("app/(marketing)/about/_components/capabilities.jsx");
    const goals = capabilities.slice(capabilities.indexOf('title: "Goals"'));
    const entry = goals.slice(0, goals.indexOf("},"));
    expect(entry).not.toContain("planned: true");
    // The sections that really are unbuilt keep the badge.
    expect(capabilities).toContain("planned: true");
  });
});
