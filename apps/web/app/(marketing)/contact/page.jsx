import Link from "next/link";
import {
  Lightbulb,
  LifeBuoy,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import ContactForm from "./_components/contact-form";
import {
  CONTACT_EMAIL,
  CONTACT_TOPICS,
  DO_NOT_SEND,
  IN_APP_CHANNEL,
} from "@/lib/company/contact";

export const metadata = {
  title: "Contact | WHealthOS",
  description:
    "Get in touch with WHealthOS about the product, your account, feedback or anything else. One inbox, read by the person who builds it.",
  alternates: { canonical: "/contact" },
};

// The Contact page.
//
// Composition is deliberately its own: the legal pages are a table of contents
// beside numbered sections, and About is a stack of editorial sections. Here
// the form is the page. Everything else is either guidance for filling it in
// or a way to reach the same inbox without it.
//
// The form is the only client component. The address, the guidance and the
// privacy note render on the server, so they are readable with JavaScript
// disabled -- which matters, because that address is the fallback when the
// form cannot be used.
//
// What is deliberately not here: a response-time commitment, a phone number, a
// postal address, office hours, a support portal, a live chat, a status page
// and a billing queue for a product with no billing. See lib/company/
// contact.js for what each omission rests on.

// One icon per enquiry type, in the order lib/company/contact.js declares
// them. Decorative: the label carries the meaning, so none is announced.
const TOPIC_ICONS = {
  support: LifeBuoy,
  account: UserCog,
  feedback: Lightbulb,
  security: ShieldCheck,
  other: MessageCircle,
};

const Panel = ({ title, children, className }) => (
  <section className={className}>
    <h2 className="text-sm font-semibold">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  </section>
);

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {/* -mr-2 cancels the pr-2 baked into .gradient-title, which keeps
              the gradient from clipping the final letter. */}
          Let’s <span className="gradient-title -mr-2">talk</span>.
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
          Questions about the product, trouble with your account, an idea for
          something that should exist — it all arrives in the same place, and
          it is read by the person who builds WHealthOS.
        </p>
      </header>

      {/* The enquiry types, laid out as a list rather than a row of cards:
          they are guidance for the field below, not five things to choose
          between on a pricing page. */}
      <section aria-labelledby="what-we-help-with" className="mt-14 border-t pt-8">
        <h2
          id="what-we-help-with"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          What we can help with
        </h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {CONTACT_TOPICS.map((topic) => {
            const Icon = TOPIC_ICONS[topic.id] ?? MessageCircle;
            return (
              <div key={topic.id} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-sm font-medium">{topic.label}</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                    {topic.description}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        <div className="min-w-0">
          <ContactForm />
        </div>

        <aside className="space-y-8 lg:pt-1">
          <Panel title="Email us directly">
            <p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4"
              >
                <Mail aria-hidden className="h-4 w-4" />
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>
              The same inbox the form delivers to, and the address published in
              the{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              for data requests.
            </p>
          </Panel>

          <Panel title={IN_APP_CHANNEL.label} className="border-t pt-8">
            <p>{IN_APP_CHANNEL.description}</p>
          </Panel>

          <Panel title="Please don’t send" className="border-t pt-8">
            <ul className="space-y-2">
              {DO_NOT_SEND.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60"
                  />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
            <p>
              None of it is needed to help you, and this form is an email relay
              rather than a secure channel for credentials.
            </p>
          </Panel>

          <Panel title="What happens to your message" className="border-t pt-8">
            <p>
              It is emailed to us and nothing else: your message is not saved
              into WHealthOS, and the address you give is used to reply and for
              nothing more. The{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              sets out how we handle it.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
