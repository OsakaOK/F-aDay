import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const outcomeEnum = pgEnum("outcome", ["won", "lost"]);
export const contentStatusEnum = pgEnum("content_status", ["active", "removed"]);
export const targetTypeEnum = pgEnum("target_type", ["hint", "fact"]);
export const voteValueEnum = pgEnum("vote_value", ["up", "down"]);

/**
 * The full country dataset, pulled once at seed time from the open REST Countries
 * source data (mledoze/countries) + World Bank population. `cycleIndex` is the
 * country's fixed position in the pre-shuffled daily sequence; the puzzle for a
 * given day is `countries[daysSinceEpoch % count]`.
 */
export const countries = pgTable(
  "countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cca3: text("cca3").notNull().unique(),
    cca2: text("cca2").notNull(),
    name: text("name").notNull(),
    officialName: text("official_name").notNull(),
    flagUrl: text("flag_url").notNull(),
    flagEmoji: text("flag_emoji").notNull(),
    capital: text("capital"),
    population: bigint("population", { mode: "number" }),
    region: text("region"),
    subregion: text("subregion"),
    area: bigint("area", { mode: "number" }),
    languages: jsonb("languages").$type<string[]>().notNull().default([]),
    currencies: jsonb("currencies").$type<string[]>().notNull().default([]),
    borders: jsonb("borders").$type<string[]>().notNull().default([]),
    /** Lowercased name + altSpellings + translations, used to reject giveaway submissions. */
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    cycleIndex: integer("cycle_index").notNull().unique(),
  },
  (t) => [uniqueIndex("countries_cycle_index_idx").on(t.cycleIndex)],
);

/**
 * One row per (player, country, cycle). Records the player's guesses and outcome
 * for a given day's puzzle. Its existence locks the player out of replaying.
 */
export const playerProgress = pgTable(
  "player_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cookieId: text("cookie_id").notNull(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id),
    cycleNumber: integer("cycle_number").notNull(),
    /** Array of guessed cca3 codes, in order. Length is also the guess count. */
    guesses: jsonb("guesses").$type<string[]>().notNull().default([]),
    outcome: outcomeEnum("outcome"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("player_progress_unique_idx").on(
      t.cookieId,
      t.countryId,
      t.cycleNumber,
    ),
    index("player_progress_cookie_idx").on(t.cookieId),
  ],
);

export const hints = pgTable(
  "hints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id),
    cycleSubmitted: integer("cycle_submitted").notNull(),
    submittedBy: text("submitted_by").notNull(),
    text: text("text").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    flagCount: integer("flag_count").notNull().default(0),
    status: contentStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("hints_country_idx").on(t.countryId),
    // One hint per player per country per cycle.
    uniqueIndex("hints_one_per_player_idx").on(
      t.submittedBy,
      t.countryId,
      t.cycleSubmitted,
    ),
  ],
);

export const funFacts = pgTable(
  "fun_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id),
    cycleSubmitted: integer("cycle_submitted").notNull(),
    submittedBy: text("submitted_by").notNull(),
    text: text("text").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    flagCount: integer("flag_count").notNull().default(0),
    status: contentStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("fun_facts_country_idx").on(t.countryId),
    uniqueIndex("fun_facts_one_per_player_idx").on(
      t.submittedBy,
      t.countryId,
      t.cycleSubmitted,
    ),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cookieId: text("cookie_id").notNull(),
    targetType: targetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    value: voteValueEnum("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_unique_idx").on(t.cookieId, t.targetId),
  ],
);

export const flags = pgTable(
  "flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cookieId: text("cookie_id").notNull(),
    targetType: targetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("flags_unique_idx").on(t.cookieId, t.targetId),
  ],
);

export type Country = typeof countries.$inferSelect;
export type PlayerProgress = typeof playerProgress.$inferSelect;
export type Hint = typeof hints.$inferSelect;
export type FunFact = typeof funFacts.$inferSelect;
