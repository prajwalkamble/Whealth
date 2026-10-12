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

// An email received at a WHealthOS address, forwarded to the maintainer.
//
// Every value here comes from a stranger. React escapes each one as text, and
// the original HTML part is never passed in -- only the plain-text body -- so
// there is no path by which a sender's markup reaches this message.
export default function InboundForwardEmail({
  from = null,
  to = null,
  subject = null,
  text = "",
  attachments = 0,
  receivedAt = null,
}) {
  return (
    <Html>
      <Head />
      <Preview>{subject ?? "Inbound email"}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.title}>{subject ?? "(no subject)"}</Heading>

          <Section>
            <Text style={styles.meta}>
              From: {from ?? "unknown"}
              <br />
              To: {to ?? "unknown"}
              <br />
              Received: {receivedAt ? new Date(receivedAt).toUTCString() : "unknown"}
              {attachments > 0 && (
                <>
                  <br />
                  Attachments: {attachments} (not downloaded)
                </>
              )}
            </Text>
          </Section>

          <Hr style={styles.rule} />

          {/* The plain-text body, kept as written. pre-wrap preserves the
              sender's line breaks without interpreting anything. */}
          <Text style={styles.message}>{text || "(no plain-text body)"}</Text>

          <Hr style={styles.rule} />
          <Text style={styles.note}>
            The sender address is taken from the message and is not verified.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#f6f9fc", fontFamily: "-apple-system, sans-serif" },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "24px",
    borderRadius: "8px",
    maxWidth: "600px",
  },
  title: { color: "#1f2937", fontSize: "20px", margin: "0 0 4px" },
  meta: { color: "#6b7280", fontSize: "13px", margin: "0", lineHeight: "1.6" },
  rule: { borderColor: "#e5e7eb", margin: "16px 0" },
  message: {
    color: "#1f2937",
    fontSize: "15px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    margin: "0",
  },
  note: { color: "#9ca3af", fontSize: "12px", margin: "0" },
};
