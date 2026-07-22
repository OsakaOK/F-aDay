import { and, eq, sql } from "drizzle-orm";
import {
  funFacts,
  flags as flagsTable,
  hints as hintsTable,
  votes as votesTable,
} from "@/db/schema";
import { getPlayerProgressForToday } from "./game";
import { validateSubmission } from "./validation";

export const FLAG_THRESHOLD = 5;

export class CommunityError extends Error {
  constructor(
    public code:
      | "not_eligible"
      | "already_submitted"
      | "invalid"
      | "not_found"
      | "wrong_country",
    message: string,
  ) {
    super(message);
  }
}

type TargetType = "hint" | "fact";
type VoteValue = "up" | "down";

const solvedGate = (outcome: string | null | undefined) => outcome === "won";

// ---- Submissions ----

export async function submitHint(cookieId: string, rawText: string) {
  const { db, country, cycleNumber, progress } = await withProgress(cookieId);
  if (!solvedGate(progress?.outcome)) {
    throw new CommunityError(
      "not_eligible",
      "Only players who solved today's flag can submit a hint.",
    );
  }
  const result = validateSubmission(rawText, country);
  if (!result.ok) throw new CommunityError("invalid", result.reason);

  const existing = await db
    .select({ id: hintsTable.id })
    .from(hintsTable)
    .where(
      and(
        eq(hintsTable.submittedBy, cookieId),
        eq(hintsTable.countryId, country.id),
        eq(hintsTable.cycleSubmitted, cycleNumber),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    throw new CommunityError("already_submitted", "You've already submitted a hint for this one.");
  }

  await db.insert(hintsTable).values({
    countryId: country.id,
    cycleSubmitted: cycleNumber,
    submittedBy: cookieId,
    text: result.text,
  });
}

export async function submitFact(cookieId: string, rawText: string) {
  const { db, country, cycleNumber, progress } = await withProgress(cookieId);
  if (!solvedGate(progress?.outcome)) {
    throw new CommunityError(
      "not_eligible",
      "Only players who solved today's flag can submit a fun fact.",
    );
  }
  const result = validateSubmission(rawText, country);
  if (!result.ok) throw new CommunityError("invalid", result.reason);

  const existing = await db
    .select({ id: funFacts.id })
    .from(funFacts)
    .where(
      and(
        eq(funFacts.submittedBy, cookieId),
        eq(funFacts.countryId, country.id),
        eq(funFacts.cycleSubmitted, cycleNumber),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    throw new CommunityError("already_submitted", "You've already submitted a fact for this one.");
  }

  await db.insert(funFacts).values({
    countryId: country.id,
    cycleSubmitted: cycleNumber,
    submittedBy: cookieId,
    text: result.text,
  });
}

// ---- Voting ----

export async function castVote(
  cookieId: string,
  targetType: TargetType,
  targetId: string,
  value: VoteValue,
) {
  const { db, country, progress } = await withProgress(cookieId);
  if (!solvedGate(progress?.outcome)) {
    throw new CommunityError("not_eligible", "You're not eligible to vote on this yet.");
  }

  // hints and fun_facts share the columns used here; cast to one concrete type so
  // Drizzle's generics resolve. The runtime value is still the correct table.
  const table = (targetType === "hint" ? hintsTable : funFacts) as typeof hintsTable;
  const [target] = await db
    .select({ id: table.id, countryId: table.countryId, status: table.status })
    .from(table)
    .where(eq(table.id, targetId))
    .limit(1);
  if (!target || target.status !== "active") {
    throw new CommunityError("not_found", "That item no longer exists.");
  }
  if (target.countryId !== country.id) {
    throw new CommunityError("wrong_country", "You can only vote on today's country.");
  }

  await db.transaction(async (tx) => {
    const [prev] = await tx
      .select({ value: votesTable.value })
      .from(votesTable)
      .where(and(eq(votesTable.cookieId, cookieId), eq(votesTable.targetId, targetId)))
      .limit(1);

    const prevValue = prev?.value ?? null;
    // Clicking the same button again clears the vote (toggle off).
    const nextValue: VoteValue | null = prevValue === value ? null : value;

    const upDelta = (nextValue === "up" ? 1 : 0) - (prevValue === "up" ? 1 : 0);
    const downDelta = (nextValue === "down" ? 1 : 0) - (prevValue === "down" ? 1 : 0);

    if (nextValue === null) {
      await tx
        .delete(votesTable)
        .where(and(eq(votesTable.cookieId, cookieId), eq(votesTable.targetId, targetId)));
    } else if (prevValue === null) {
      await tx.insert(votesTable).values({ cookieId, targetType, targetId, value: nextValue });
    } else {
      await tx
        .update(votesTable)
        .set({ value: nextValue })
        .where(and(eq(votesTable.cookieId, cookieId), eq(votesTable.targetId, targetId)));
    }

    if (upDelta !== 0 || downDelta !== 0) {
      await tx
        .update(table)
        .set({
          upvotes: sql`${table.upvotes} + ${upDelta}`,
          downvotes: sql`${table.downvotes} + ${downDelta}`,
        })
        .where(eq(table.id, targetId));
    }
  });
}

// ---- Flagging ----

export async function castFlag(
  cookieId: string,
  targetType: TargetType,
  targetId: string,
) {
  const { db, country, progress } = await withProgress(cookieId);
  if (!solvedGate(progress?.outcome)) {
    throw new CommunityError("not_eligible", "You're not eligible to flag this yet.");
  }

  const table = (targetType === "hint" ? hintsTable : funFacts) as typeof hintsTable;
  const [target] = await db
    .select({ id: table.id, countryId: table.countryId, status: table.status })
    .from(table)
    .where(eq(table.id, targetId))
    .limit(1);
  if (!target || target.status !== "active") {
    throw new CommunityError("not_found", "That item no longer exists.");
  }
  if (target.countryId !== country.id) {
    throw new CommunityError("wrong_country", "You can only flag today's country.");
  }

  await db.transaction(async (tx) => {
    // Idempotent: a repeat flag from the same player does nothing (unique index).
    const inserted = await tx
      .insert(flagsTable)
      .values({ cookieId, targetType, targetId })
      .onConflictDoNothing()
      .returning({ id: flagsTable.id });
    if (inserted.length === 0) return;

    const [updated] = await tx
      .update(table)
      .set({ flagCount: sql`${table.flagCount} + 1` })
      .where(eq(table.id, targetId))
      .returning({ flagCount: table.flagCount });

    // 5 flags auto-removes immediately — no admin approval step.
    if (updated && updated.flagCount >= FLAG_THRESHOLD) {
      await tx.update(table).set({ status: "removed" }).where(eq(table.id, targetId));
    }
  });
}

// ---- shared ----

async function withProgress(cookieId: string) {
  const { country, cycleNumber, progress } = await getPlayerProgressForToday(cookieId);
  const { getDb } = await import("@/db");
  const db = await getDb();
  return { db, country, cycleNumber, progress };
}
