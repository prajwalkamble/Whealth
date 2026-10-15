import { Code, CodeBlock, H2, Item, List, P, Pullout } from "../_components/prose";

// Sources for this article, all in the repository: AGENTS.md's conventions,
// apps/web/lib/session.js, apps/web/lib/action-error.js, apps/web/lib/
// queries.js, apps/web/actions/transaction.js and apps/web/lib/email/send.js.

const Article = () => (
  <>
    <P>
      React server actions are a genuinely pleasant API boundary. You write a
      function, call it from a component, and the framework does the wiring.
      That convenience is also what makes them easy to get wrong in a product
      that holds money.
    </P>

    <Pullout>
      It reads like an import and a call. It behaves like an open HTTP route
      that anyone can post anything to.
    </Pullout>

    <P>
      Every exported function of a <Code>&quot;use server&quot;</Code> module
      is reachable over the network. Not the ones you call from a form — all of
      them. The export is the endpoint. Three rules came out of taking that
      literally, and each one has a visible shape in the codebase.
    </P>

    <H2 id="reads">Reads do not belong in an actions module</H2>

    <P>
      The convenient thing is to put a query next to the mutation that uses it
      and export both. The cost is a public endpoint for data no browser ever
      asked for.
    </P>

    <P>
      So reads live in <Code>lib/queries.js</Code>, which is a plain module: a
      server component imports it directly, and nothing about it is addressable
      from outside. Writes live in <Code>actions/</Code>. The split is not
      about tidiness, it is about how much surface is exposed — and it reaches
      further than queries. Sending email is a plain module too:
    </P>

    <CodeBlock label="apps/web/lib/email/send.js">
      {`// This is a plain module, not a "use server" one: every export of a
// server action module is a public HTTP endpoint, and an endpoint that
// sends mail to an arbitrary address is a spam relay.`}
    </CodeBlock>

    <P>
      The actions that send mail — feedback, an enquiry from the contact page —
      call into it after deciding, themselves, that the caller is allowed to.
    </P>

    <H2 id="order">Every write starts the same four steps</H2>

    <P>
      If an endpoint can be called by anyone, then the first thing it does
      cannot be the work. Every write in WHealthOS opens with the same
      sequence:
    </P>

    <List>
      <Item>
        <Code>requireClerkUserId()</Code> — the signed-in id from the verified
        session, throwing <Code>Unauthorized</Code> if there is none. Nothing
        reads an id from the payload.
      </Item>
      <Item>
        <Code>enforceRateLimit(kind, userId)</Code> — before a database
        connection is taken, so a flood does not hold one open while Arcjet is
        asked about it.
      </Item>
      <Item>
        <Code>parseOrThrow(schema, rawData)</Code> — the payload validated
        here, not in the form. The form&rsquo;s validation is for the person
        typing; this one is for the endpoint.
      </Item>
      <Item>
        <Code>withCurrentTenant(...)</Code> — resolves that session to an
        internal user id server-side and runs the work scoped to it. No
        client-supplied identifier ever selects whose records are touched.
      </Item>
    </List>

    <P>
      The ordering is load-bearing in both directions: authentication before
      rate limiting, because an unauthenticated caller should not consume
      anyone&rsquo;s quota, and rate limiting before the database, because
      Arcjet is a network call.
    </P>

    <H2 id="columns">Validated is not the same as allowed</H2>

    <P>
      Schema validation tells you the payload is well-formed. It does not tell
      you every field in it is yours to write. Spread a validated object
      straight into an <Code>update</Code> and you have handed the client
      whatever the schema happened to keep.
    </P>

    <CodeBlock label="apps/web/actions/transaction.js">
      {`// The columns a client is allowed to set. Spreading the validated
// payload straight into Prisma would still carry whatever zod chose to
// keep, so the writable surface is named explicitly here.
const transactionColumns = (data) => ({ ... });`}
    </CodeBlock>

    <P>
      Naming the writable columns is dull and it is the difference between
      &ldquo;this field is the right type&rdquo; and &ldquo;this field is one
      the browser gets to decide&rdquo;.
    </P>

    <H2 id="errors">The failure the framework hides</H2>

    <P>
      One more thing about actions, which is less about security and more about
      honesty. In production, Next.js replaces the message of any error an
      action throws with a generic one — sensibly, since an exception can carry
      query or infrastructure detail.
    </P>

    <P>
      Which means a thrown &ldquo;Amount must be greater than zero&rdquo; or
      &ldquo;Too many requests&rdquo; arrives at the browser as
      &ldquo;Something went wrong&rdquo;. Every message written for a user was
      being swallowed in the one environment where it mattered. Actions
      therefore <em>return</em> their expected failures:
    </P>

    <CodeBlock label="apps/web/lib/action-error.js">
      {`if (error instanceof ActionError) {
  return { success: false, error: error.message };
}
console.error("Server action failed:", error);
return { success: false, error: GENERIC_ACTION_ERROR };`}
    </CodeBlock>

    <P>
      A deliberate message, written to be shown, crosses the wire intact.
      Anything else is logged on the server and reported as a generic failure,
      which is what it is.
    </P>

    <H2 id="summary">What it adds up to</H2>

    <P>
      None of this is exotic. It is the ordinary discipline of an HTTP API,
      applied to something that does not look like one — and that is the whole
      point. The abstraction is good enough that you can forget what is
      underneath it, so the rules are written down in{" "}
      <Code>AGENTS.md</Code> where the next change has to walk past them.
    </P>
  </>
);

export default Article;
