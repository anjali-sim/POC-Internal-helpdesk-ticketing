-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "firstResponseDueAt" TIMESTAMP(3),
ADD COLUMN     "resolutionDueAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Ticket_status_resolutionDueAt_idx" ON "Ticket"("status", "resolutionDueAt");
