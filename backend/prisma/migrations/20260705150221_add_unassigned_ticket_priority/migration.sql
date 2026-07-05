-- AlterEnum
ALTER TYPE "TicketPriority" ADD VALUE 'UNASSIGNED';

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "priority" SET DEFAULT 'UNASSIGNED';
