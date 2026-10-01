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

// Feedback sent from the widget in the app. Plain on purpose: this one is read
// by the maintainer, not by a user, so what matters is who wrote it, what kind
// of report it is, and the message itself, unaltered.
export default function FeedbackEmail({
  label = "Feedback",
  message = "",
  from = "A WHealthOS user",
  replyTo = null,
}) {
  return (
    <Html>
      <Head />
      <Preview>
        {label} from {from}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.title}>{label}</Heading>

          <Section>
            <Text style={styles.meta}>
              From: {from}
              {replyTo ? ` (${replyTo})` : " (no email address on file)"}
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
    color: "#1f2937",
    fontSize: "20px",
    margin: "0 0 4px",
  },
  meta: {
    color: "#6b7280",
    fontSize: "13px",
    margin: "0",
  },
  rule: {
    borderColor: "#e5e7eb",
    margin: "16px 0",
  },
  message: {
    color: "#1f2937",
    fontSize: "15px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    margin: "0",
  },
};
