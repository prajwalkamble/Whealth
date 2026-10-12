-- Legal document acceptance.
--
-- One row per acceptance: which Terms version, which Privacy Policy version,
-- and when. Written only when a person explicitly agrees, and written entirely
-- by the server.
--
-- Deliberately additive. No existing table is touched and no row is written
-- for anyone who already has an account: a consent record that nobody actually
-- gave is worse than a missing one, because it looks like evidence.
BEGIN;

CREATE TABLE public.legal_consents (
    "id"             TEXT         NOT NULL,
    "userId"         TEXT         NOT NULL,
    "termsVersion"   TEXT         NOT NULL,
    "privacyVersion" TEXT         NOT NULL,
    "acceptedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_consents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public.legal_consents
  ADD CONSTRAINT "legal_consents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- What makes a retry safe rather than merely unlikely: a refresh, a double
-- click or a retried request after a timeout re-inserts the same three values
-- and loses on this constraint, instead of recording a second acceptance.
CREATE UNIQUE INDEX "legal_consents_user_versions_key"
  ON public.legal_consents("userId", "termsVersion", "privacyVersion");
CREATE INDEX "legal_consents_userId_idx" ON public.legal_consents("userId");

-- Row-level security, as every table here has.
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_consents FORCE  ROW LEVEL SECURITY;

-- Two policies rather than the usual one, because this table is an audit
-- record and not tenant data the tenant owns.
--
-- A tenant may read their own consents. Only the job-runner role may write
-- them, which is the role provisioning runs as -- so a request carrying a
-- signed-in user's tenant context cannot insert a consent it did not give,
-- amend the version on one it did, or delete the record of it. Postgres ORs
-- the applicable policies per command, so SELECT is allowed by either and
-- INSERT, UPDATE and DELETE are allowed only by the write policy.
DROP POLICY IF EXISTS legal_consents_read ON public.legal_consents;
CREATE POLICY legal_consents_read ON public.legal_consents
  FOR SELECT
  USING (app_is_job_runner() OR "userId" = app_current_tenant());

DROP POLICY IF EXISTS legal_consents_write ON public.legal_consents;
CREATE POLICY legal_consents_write ON public.legal_consents
  FOR ALL
  USING      (app_is_job_runner())
  WITH CHECK (app_is_job_runner());

COMMIT;
