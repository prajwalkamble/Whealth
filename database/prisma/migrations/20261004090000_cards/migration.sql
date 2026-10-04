-- Cards: reference metadata for a user's payment cards.
--
-- Nothing here can be used to transact. There is no column for a full card
-- number, a CVV or a PIN, and last4 is a four-character label kept only so a
-- person can tell two cards apart.
BEGIN;

CREATE TYPE "CardNetwork" AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'OTHER');
CREATE TYPE "CardType"    AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "CardStatus"  AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE public.cards (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "issuer"      TEXT         NOT NULL,
    "network"     "CardNetwork" NOT NULL,
    "type"        "CardType"   NOT NULL,
    "last4"       TEXT         NOT NULL,
    "expiryMonth" INTEGER      NOT NULL,
    "expiryYear"  INTEGER      NOT NULL,
    "creditLimit" DECIMAL(65,30),
    "billingDay"  INTEGER,
    "dueDay"      INTEGER,
    "status"      "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId"      TEXT         NOT NULL,
    "accountId"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- Enforced here as well as in zod: a direct database write should not be able
-- to store a thirteenth month or a five-digit "last four".
ALTER TABLE public.cards
  ADD CONSTRAINT cards_last4_check       CHECK ("last4" ~ '^[0-9]{4}$'),
  ADD CONSTRAINT cards_expiry_month_check CHECK ("expiryMonth" BETWEEN 1 AND 12),
  ADD CONSTRAINT cards_expiry_year_check  CHECK ("expiryYear" BETWEEN 2000 AND 2100),
  ADD CONSTRAINT cards_billing_day_check  CHECK ("billingDay" IS NULL OR "billingDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT cards_due_day_check      CHECK ("dueDay" IS NULL OR "dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT cards_credit_limit_check CHECK ("creditLimit" IS NULL OR "creditLimit" >= 0);

ALTER TABLE public.cards
  ADD CONSTRAINT "cards_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL, not CASCADE: removing an account should not erase the record of a
-- card that happened to settle from it.
ALTER TABLE public.cards
  ADD CONSTRAINT "cards_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES public.accounts("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cards_userId_idx"     ON public.cards("userId");
CREATE INDEX "cards_user_status_idx" ON public.cards("userId", "status");
CREATE INDEX "cards_accountId_idx"  ON public.cards("accountId");

-- Same isolation as every other tenant table: the application role only ever
-- sees its own rows, and the job runner is exempt.
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cards_isolation ON public.cards;
CREATE POLICY cards_isolation ON public.cards
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

COMMIT;
