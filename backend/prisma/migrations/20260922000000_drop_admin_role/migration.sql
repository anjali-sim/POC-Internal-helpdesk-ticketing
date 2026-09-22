-- Admin was an optional stretch role and is out of scope; the helpdesk now has
-- only REQUESTER and AGENT. Postgres cannot drop a value from an enum in place,
-- so the type is recreated and existing ADMIN rows are demoted to REQUESTER.
-- That covers the system actor (system@helpdesk.test), which only ever appears
-- as the author of transition logs and must not join the round-robin pool.

UPDATE "User" SET "role" = 'REQUESTER' WHERE "role" = 'ADMIN';

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('REQUESTER', 'AGENT');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");

DROP TYPE "Role_old";
