-- Email received at a WHealthOS address, through the Resend inbound webhook.
--
-- This table is not tenant data. An inbound email arrives from anyone, to a
-- support address, and its From header is trivially forged -- so it carries no
-- userId and is never linked to one. Its row-level security therefore admits
-- only the job runner, not the per-tenant application role: there is no tenant
-- it could belong to, and pretending otherwise would be the authorization bug.
--
-- The HTML body is not stored. Only the plain-text part is kept, truncated, so
-- that nothing exists which could later be rendered into a page by mistake.
BEGIN;

CREATE TYPE "InboundEmailStatus" AS ENUM ('RECEIVED', 'FORWARDED', 'FAILED');

CREATE TABLE public.inbound_emails (
    "id"          TEXT                 NOT NULL,
    -- The webhook delivery's identifier. Resend retries a delivery it did not
    -- get a 2xx for, so UNIQUE is what makes reprocessing impossible rather
    -- than merely unlikely: the duplicate insert fails instead of creating a
    -- second row and sending a second forward.
    "eventId"     TEXT                 NOT NULL,
    "messageId"   TEXT,
    "fromAddress" TEXT                 NOT NULL,
    "toAddress"   TEXT                 NOT NULL,
    "subject"     TEXT,
    "text"        TEXT,
    "attachments" INTEGER              NOT NULL DEFAULT 0,
    "status"      "InboundEmailStatus" NOT NULL DEFAULT 'RECEIVED',
    "forwardedAt" TIMESTAMP(3),
    "error"       TEXT,
    "receivedAt"  TIMESTAMP(3)         NOT NULL,
    "createdAt"   TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inbound_emails_eventId_key" ON public.inbound_emails("eventId");
CREATE INDEX "inbound_emails_receivedAt_idx" ON public.inbound_emails("receivedAt" DESC);
CREATE INDEX "inbound_emails_status_idx"     ON public.inbound_emails("status");

-- Row-level security, as every table here has.
--
-- The policy is job-runner-only on purpose. Other tables isolate by
-- app_current_tenant(); this one has no tenant column to isolate by, so the
-- restricted application role is given no way to read or write it at all.
ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_emails FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inbound_emails_job_runner_only ON public.inbound_emails;
CREATE POLICY inbound_emails_job_runner_only ON public.inbound_emails
  USING      (app_is_job_runner())
  WITH CHECK (app_is_job_runner());

COMMIT;
