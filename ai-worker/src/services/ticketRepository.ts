import { randomUUID } from "node:crypto";
import { pool } from "../db.js";

type TicketPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TicketRecord = {
  id: string;
  title: string;
  description: string;
};

type TicketAnalysisInput = {
  ticketId: string;
  category: string;
  priority: TicketPriorityValue;
  summary: string;
};

export const getTicketForAnalysis = async (ticketId: string) => {
  const result = await pool.query<TicketRecord>(
    'select id, title, description from "Ticket" where id = $1',
    [ticketId]
  );

  return result.rows[0] || null;
};

export const saveTicketAnalysis = async (input: TicketAnalysisInput) => {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const analysisResult = await client.query(
      `
        insert into "TicketAnalysis" ("id", "ticketId", "category", "priority", "summary", "createdAt", "updatedAt")
        values ($1, $2, $3, $4::"TicketPriority", $5, now(), now())
        on conflict ("ticketId")
        do update set
          "category" = excluded."category",
          "priority" = excluded."priority",
          "summary" = excluded."summary",
          "updatedAt" = now()
        returning "id", "ticketId", "category", "priority", "summary", "createdAt", "updatedAt"
      `,
      [randomUUID(), input.ticketId, input.category, input.priority, input.summary]
    );

    await client.query('update "Ticket" set "priority" = $1::"TicketPriority", "updatedAt" = now() where "id" = $2', [
      input.priority,
      input.ticketId
    ]);

    await client.query("commit");

    return analysisResult.rows[0];
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};
