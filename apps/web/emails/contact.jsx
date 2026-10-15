import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// An enquiry from the public form on /contact.
//
// Read by the maintainer, not by a user, so it is plain: what the message is
// about, who says they sent it, and the message itself unaltered.
//
// The sender's address is labelled unverified on purpose. Nothing confirms it
// -- there is no sign-in behind this form and no confirmation email -- so the
// one line of context that matters when replying is that the address was
// typed, not proven.
export default function ContactEmail({
  topic = "Enquiry",
  subject = "",
  message = "",
  name = null,
  email = null,
}) {
  return (
    <Html>
      <Head />
      <Preview>
        {topic} from {name || email || "someone on the website"}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.title}>{subject || topic}</Heading>
          {subject && <Text style={styles.topic}>{topic}</Text>}

          <Section>
            <Text style={styles.meta}>
              From: {name || "No name given"}
              {email ? ` <${email}>` : ""}
            </Text>
            <Text style={styles.caution}>
              Sent through the public form on /contact. The address above was
              typed by whoever submitted it and has not been verified.
            </Text>
          </Section>

          <Hr style={styles.rule} />

          {/* pre-wrap: the message is kept exactly as it was typed, including
              blank lines, rather than collapsed into one paragraph. */}
          <Text style={styles.message}>{message}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "24px",
    borderRadius: "8px",
    maxWidth: "600px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 16px",
  },
  topic: {
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6b7280",
    margin: "-8px 0 16px",
  },
  meta: {
    fontSize: "14px",
    color: "#374151",
    margin: "0",
  },
  caution: {
    fontSize: "13px",
    lineHeight: "18px",
    color: "#6b7280",
    margin: "8px 0 0",
  },
  rule: {
    borderColor: "#e5e7eb",
    margin: "20px 0",
  },
  message: {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#111827",
    whiteSpace: "pre-wrap",
    margin: "0",
  },
};
