ALTER TABLE "Ticket" ADD COLUMN "assignedAdminId" UUID;

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_assignedAdminId_fkey"
FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Ticket_assignedAdminId_idx" ON "Ticket"("assignedAdminId");
