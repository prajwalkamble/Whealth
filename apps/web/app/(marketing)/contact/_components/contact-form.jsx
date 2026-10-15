"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, SendHorizonal } from "lucide-react";
import { submitContactEnquiry } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_EMAIL,
  CONTACT_TOPICS,
  DEFAULT_TOPIC,
} from "@/lib/company/contact";
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  CONTACT_SUBJECT_MAX,
  CONTACT_EMAIL_MAX,
  contactInputSchema,
} from "@/app/lib/schema";
import { cn } from "@/lib/utils";

// The enquiry form.
//
// Five states, each with its own visible and announced form: idle, submitting,
// a validation failure on a named field, a failure that belongs to the whole
// form (rate limited, provider down, nowhere to deliver), and success.
//
// The same schema runs here and on the server. This copy exists so someone
// gets told about a mistyped address before a round trip; the server's copy is
// the one that decides, because this is a public endpoint and the browser's
// opinion of a payload is a courtesy.
//
// Static ids rather than useId(): a useId() value must never reach rendered
// markup in this repository -- it encodes the component's position in the tree
// and the server and the client have disagreed about that before. One of these
// renders per page.
const IDS = {
  topic: "contact-topic",
  name: "contact-name",
  email: "contact-email",
  subject: "contact-subject",
  message: "contact-message",
  formError: "contact-form-error",
  status: "contact-status",
};

const errorId = (field) => `${IDS[field]}-error`;
const hintId = (field) => `${IDS[field]}-hint`;

const EMPTY = {
  topic: DEFAULT_TOPIC,
  name: "",
  email: "",
  subject: "",
  message: "",
  // The honeypot. Held in state like any other field so React does not
  // complain about an uncontrolled input, and never shown to anyone.
  website: "",
};

// A label that always says what the control is, with the hint and the error
// tied to it rather than floating beside it.
const Field = ({ id, label, hint, error, children }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
    </label>
    {children}
    {error ? (
      <p
        id={`${id}-error`}
        className="flex items-start gap-1.5 text-sm font-medium text-destructive"
      >
        <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </p>
    ) : (
      hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )
    )}
  </div>
);

const ContactForm = () => {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null);

  const fields = useRef({});
  const register = (name) => (element) => {
    fields.current[name] = element;
  };

  const set = (name) => (event) => {
    const value = event?.target ? event.target.value : event;
    setValues((current) => ({ ...current, [name]: value }));
    // A field stops being wrong as soon as it is touched again. Leaving the
    // message under a control someone is already fixing is just noise.
    setErrors((current) => (current[name] ? { ...current, [name]: null } : current));
  };

  const focusField = (name) => {
    const element = fields.current[name];
    if (element?.focus) element.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    const parsed = contactInputSchema.safeParse(values);
    if (!parsed.success) {
      const found = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !found[field]) found[field] = issue.message;
      }
      setErrors(found);
      focusField(Object.keys(found)[0]);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const result = await submitContactEnquiry(values);

      if (result?.success) {
        setSent({ subject: values.subject });
        setValues(EMPTY);
        return;
      }

      if (result?.field) {
        setErrors({ [result.field]: result.error });
        focusField(result.field);
        return;
      }

      // Rate limited, the provider refused, or there is nowhere to deliver.
      // Nothing typed is cleared, so retrying costs nothing.
      setFormError(result?.error ?? "Couldn't send that just now. Please try again.");
    } catch {
      // A network failure or a crash. The message stays where it is.
      setFormError(
        "Couldn't reach the server. Please check your connection and try again, or email us instead."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      // Announced rather than focused: moving focus here would take it away
      // from wherever the person left it. role="status" is polite, so it is
      // read after whatever a screen reader is already saying.
      <div
        id={IDS.status}
        role="status"
        aria-live="polite"
        className="rounded-xl border bg-card p-6 sm:p-8"
      >
        <CheckCircle2 aria-hidden className="h-6 w-6 text-foreground" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          Your message has been sent
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {sent.subject ? (
            <>
              It went out with the subject “{sent.subject}”. A reply will come
              from{" "}
            </>
          ) : (
            <>A reply will come from </>
          )}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          , so it is worth checking your spam folder if nothing arrives.
          WHealthOS is one person, so we cannot promise a turnaround.
        </p>
        <Button variant="outline" size="sm" className="mt-6" onClick={() => setSent(null)}>
          Write another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={submitting}
      className="rounded-xl border bg-card p-6 sm:p-8"
      noValidate
    >
      <h2 className="text-lg font-semibold tracking-tight">Send a message</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Everything here reaches the same inbox. The more specific the message,
        the better the answer.
      </p>

      {formError && (
        <div
          id={IDS.formError}
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm leading-6 text-foreground"
        >
          <AlertCircle aria-hidden className="mt-1 h-4 w-4 shrink-0 text-destructive" />
          <p>{formError}</p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <Field
          id={IDS.topic}
          label="What is this about?"
          error={errors.topic}
          hint={CONTACT_TOPICS.find((topic) => topic.id === values.topic)?.description}
        >
          <Select value={values.topic} onValueChange={set("topic")} disabled={submitting}>
            <SelectTrigger
              id={IDS.topic}
              ref={register("topic")}
              className="w-full"
              aria-describedby={errors.topic ? errorId("topic") : hintId("topic")}
            >
              <SelectValue placeholder="Choose a subject area" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_TOPICS.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={IDS.name} label="Your name" error={errors.name}>
            <Input
              id={IDS.name}
              ref={register("name")}
              name="name"
              value={values.name}
              onChange={set("name")}
              maxLength={CONTACT_NAME_MAX}
              autoComplete="name"
              required
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? errorId("name") : undefined}
              disabled={submitting}
            />
          </Field>

          <Field
            id={IDS.email}
            label="Your email"
            error={errors.email}
            hint="Used to reply, and nothing else."
          >
            <Input
              id={IDS.email}
              ref={register("email")}
              name="email"
              type="email"
              inputMode="email"
              value={values.email}
              onChange={set("email")}
              maxLength={CONTACT_EMAIL_MAX}
              autoComplete="email"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? errorId("email") : hintId("email")}
              disabled={submitting}
            />
          </Field>
        </div>

        <Field id={IDS.subject} label="Subject" error={errors.subject}>
          <Input
            id={IDS.subject}
            ref={register("subject")}
            name="subject"
            value={values.subject}
            onChange={set("subject")}
            maxLength={CONTACT_SUBJECT_MAX}
            placeholder="A few words on what this is"
            required
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? errorId("subject") : undefined}
            disabled={submitting}
          />
        </Field>

        <Field
          id={IDS.message}
          label="Your message"
          error={errors.message}
          hint="Please don’t include passwords, card numbers or account numbers."
        >
          <Textarea
            id={IDS.message}
            ref={register("message")}
            name="message"
            value={values.message}
            onChange={set("message")}
            placeholder="What happened, what you expected, or what you would like to see."
            className="min-h-[170px] resize-y"
            maxLength={CONTACT_MESSAGE_MAX}
            required
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? errorId("message") : hintId("message")}
            disabled={submitting}
          />
        </Field>
      </div>

      {/* Hidden from people and from assistive technology, and out of the tab
          order. A script that fills every input it can find fills this one,
          and the submission is refused. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={set("website")}
        />
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-6">
        <Button type="submit" disabled={submitting} className="min-w-[10.5rem]">
          {submitting ? (
            <>
              {/* motion-reduce: the spinner is the only moving thing on the
                  page, and it still reads as busy without turning. */}
              <Loader2
                aria-hidden
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
              Sending…
            </>
          ) : (
            <>
              <SendHorizonal aria-hidden className="h-4 w-4" />
              Send message
            </>
          )}
        </Button>

        <p className={cn("text-sm text-muted-foreground", submitting && "opacity-70")}>
          Or email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>

      {/* One live region for the whole form, so progress is announced without
          attaching live semantics to every control. */}
      <p className="sr-only" role="status" aria-live="polite">
        {submitting ? "Sending your message." : ""}
      </p>
    </form>
  );
};

export default ContactForm;
