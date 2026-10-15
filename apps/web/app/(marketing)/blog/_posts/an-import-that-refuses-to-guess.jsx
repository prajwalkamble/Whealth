import { Code, CodeBlock, H2, Item, List, P, Pullout } from "../_components/prose";

// Every claim in this article is checkable against apps/web/lib/import/
// transactions.js and the suites in apps/web/tests/import.test.js. If one of
// those rules changes, this article is wrong and should change with it.

const Article = () => (
  <>
    <P>
      WHealthOS can read a CSV or an XLSX of transactions and turn it into your
      records. The hard part of that job is not parsing. It is deciding what to
      do with a row that could mean two things.
    </P>

    <Pullout>
      An import that quietly reinterprets a date produces records you believe
      are yours. You will not question them — you will question the total,
      months later, and have no idea why it is wrong.
    </Pullout>

    <P>
      So the importer is built on one rule: refuse rather than guess. A row
      either maps cleanly or it is reported, with its line number and every
      reason it failed, and you decide what to do about it. That rule turns out
      to be most of the design.
    </P>

    <H2 id="dates">The date that reads two ways</H2>

    <P>
      <Code>03/04/2026</Code> is the third of April under the convention most
      of the world uses and the fourth of March under the one the United States
      uses. Both readings are real dates. A parser that picks one silently
      files that transaction in the wrong month, and every monthly figure built
      on top of it is wrong by one transaction without anything looking broken.
    </P>

    <P>
      WHealthOS accepts ISO dates first, because that is what it exports and
      what spreadsheets agree on, then <Code>dd/mm/yyyy</Code>. It does not
      attempt <Code>mm/dd/yyyy</Code> at all. A file in that format does not
      half-import: every ambiguous row comes back as an error you can see, which
      is a worse first experience and a better outcome than a plausible-looking
      import nobody checks.
    </P>

    <H2 id="amounts">The amount that is a thousand times wrong</H2>

    <P>
      Decimal separators are the same problem with a bigger blast radius.{" "}
      <Code>1.234,56</Code> is one thousand two hundred and thirty-four and a
      half in much of Europe. Strip the commas and keep the dot — the obvious
      implementation — and it becomes <Code>1.23456</Code>. That is not a
      rounding error, it is three orders of magnitude on real money.
    </P>

    <P>The rules are therefore written out rather than inferred:</P>

    <List>
      <Item>
        Both separators present — the last one is the decimal point.{" "}
        <Code>1,234.56</Code> and <Code>1.234,56</Code> are both 1234.56.
      </Item>
      <Item>
        Only a comma — three digits after it means a thousands separator, one
        or two means a decimal comma. <Code>1,234</Code> is 1234 and{" "}
        <Code>1,5</Code> is 1.5. Anything else, like <Code>1,23456</Code>, is
        ambiguous and refused.
      </Item>
      <Item>
        Only a dot — a decimal point, unless it groups exactly three digits
        with no other decimals, which is refused rather than guessed.
      </Item>
      <Item>
        Brackets mean a negative, because that is the accounting convention a
        bank export actually uses. A currency symbol and stray spaces are
        noise.
      </Item>
    </List>

    <P>
      Every one of those cases is a test. They are the cheapest tests in the
      repository and they protect the most expensive mistake in it.
    </P>

    <H2 id="currency">The column the schema does not have</H2>

    <P>
      A transaction in WHealthOS has no currency field. Neither does an
      account. There is one currency in the database and no exchange rate
      anywhere in the application.
    </P>

    <P>
      That makes a file declaring <Code>USD</Code> a question with no honest
      answer. Importing those rows as though they were rupees invents an
      exchange rate of 1.0 and writes it into someone&rsquo;s financial
      history. So the importer reads the currency column — which WHealthOS
      never writes — purely in order to refuse a row that declares a currency
      it cannot store, and to say why.
    </P>

    <Pullout>
      Reading a field you do not support, so that you can decline it properly,
      is worth more than ignoring it.
    </Pullout>

    <H2 id="duplicates">Possible duplicates stay possible</H2>

    <P>
      Re-importing the same statement is the normal mistake, so rows that look
      like ones you already have are matched. The schema has no external id,
      source or import column to match on, so the fingerprint is built from
      what does exist: the account, the civil date, the direction, the amount to
      two places, and the description folded to case-insensitive whitespace.
    </P>

    <P>
      Which is not proof. Two coffees on the same day for the same amount
      collide, and both are real. A match is therefore reported as a{" "}
      <em>possible</em> duplicate for you to decide about, never dropped
      quietly. The only case treated as certain is a row carrying a transaction
      id that already belongs to you — which happens when you export from
      WHealthOS and import the same file back, and that one is safe to skip.
    </P>

    <H2 id="preview">The preview is a courtesy, not the decision</H2>

    <P>
      Before anything is written you see what the importer made of the file:
      the rows it will add, the rows it refused and why, and the possible
      duplicates. That preview runs in the browser, which is the only reason it
      is instant.
    </P>

    <P>
      Then the server runs the same module again, from scratch, on whatever was
      submitted:
    </P>

    <CodeBlock label="apps/web/lib/import/transactions.js">
      {`// This module is pure and runs on both sides. The browser uses it to
// show the preview; the server runs it again on what is submitted,
// because the preview is a courtesy and the server action is a public
// endpoint.`}
    </CodeBlock>

    <P>
      Those two sentences are the security model of the feature. A server
      action in React looks like a function call, but it is an HTTP endpoint
      anyone can post to, so the browser&rsquo;s version of what the file said
      cannot be the version that gets written. Running one pure module in both
      places is what keeps the preview honest without trusting it: the same
      rules produce the same verdict, and the one that counts is the one the
      server reached.
    </P>

    <H2 id="cost">What this costs</H2>

    <P>
      Refusing is not free. A bank export in US date format imports zero rows
      here, where a more relaxed tool would import all of them and be wrong
      about half. Someone in that position has to fix their spreadsheet, and
      that is a genuinely worse afternoon.
    </P>

    <P>
      The trade is deliberate. A failed import is visible, annoying and
      fixable. A successful import of misread data is invisible, pleasant, and
      permanent — it becomes the history every later figure is calculated from.
      Of the two, the one worth avoiding is the quiet one.
    </P>
  </>
);

export default Article;
