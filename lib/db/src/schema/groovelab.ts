import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  decimal,
  bigint,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Taxonomy ──────────────────────────────────────────────────────────────────

export const timeSignatures = pgTable("time_signatures", {
  id: serial("id").primaryKey(),
  numerator: integer("numerator").notNull(),
  denominator: integer("denominator").notNull(),
  displayName: varchar("display_name", { length: 20 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const feels = pgTable("feels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  parentGenreId: integer("parent_genre_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const instrumentTypes = pgTable("instrument_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 30 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const contentTypes = pgTable("content_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 20 }).default("student").notNull(),
  ageGroup: varchar("age_group", { length: 20 }).default("standard").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

// ── Creators ──────────────────────────────────────────────────────────────────

export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeChannelId: varchar("youtube_channel_id", { length: 50 }).unique(),
  channelName: varchar("channel_name", { length: 255 }).notNull(),
  channelUrl: text("channel_url"),
  subscriberCount: integer("subscriber_count").default(0).notNull(),
  totalViews: bigint("total_views", { mode: "number" }).default(0).notNull(),
  videoCount: integer("video_count").default(0).notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }).default("0.00").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isClaimed: boolean("is_claimed").default(false).notNull(),
  claimedByUserId: uuid("claimed_by_user_id").references(() => users.id),
  paypalEmail: varchar("paypal_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Loops ─────────────────────────────────────────────────────────────────────

export const loops = pgTable("loops", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  sourceType: varchar("source_type", { length: 20 }).notNull(),
  youtubeVideoId: varchar("youtube_video_id", { length: 20 }),
  youtubeEmbedUrl: text("youtube_embed_url"),
  midiFileUrl: text("midi_file_url"),
  midiData: jsonb("midi_data"),
  externalUrl: text("external_url"),
  externalSource: varchar("external_source", { length: 100 }),
  creatorId: uuid("creator_id").references(() => creators.id),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  bpm: integer("bpm"),
  bpmRangeLow: integer("bpm_range_low"),
  bpmRangeHigh: integer("bpm_range_high"),
  keySignature: varchar("key_signature", { length: 10 }),
  durationSeconds: integer("duration_seconds"),
  viewCount: bigint("view_count", { mode: "number" }).default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }).default("0.00").notNull(),
  isEmbeddable: boolean("is_embeddable").default(true).notNull(),
  aiClassified: boolean("ai_classified").default(false).notNull(),
  aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }),
  description: text("description"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Junction Tables ───────────────────────────────────────────────────────────

export const loopTimeSignatures = pgTable("loop_time_signatures", {
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  timeSignatureId: integer("time_signature_id").references(() => timeSignatures.id).notNull(),
});

export const loopFeels = pgTable("loop_feels", {
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  feelId: integer("feel_id").references(() => feels.id).notNull(),
});

export const loopGenres = pgTable("loop_genres", {
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  genreId: integer("genre_id").references(() => genres.id).notNull(),
});

export const loopInstrumentTypes = pgTable("loop_instrument_types", {
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  instrumentTypeId: integer("instrument_type_id").references(() => instrumentTypes.id).notNull(),
});

export const loopContentTypes = pgTable("loop_content_types", {
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  contentTypeId: integer("content_type_id").references(() => contentTypes.id).notNull(),
});

// ── Favorites & Playlists ─────────────────────────────────────────────────────

export const favorites = pgTable("favorites", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlistItems = pgTable("playlist_items", {
  playlistId: uuid("playlist_id").references(() => playlists.id, { onDelete: "cascade" }).notNull(),
  loopId: uuid("loop_id").references(() => loops.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
});

// ── Live Sessions ─────────────────────────────────────────────────────────────

export const liveSessions = pgTable("live_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomCode: varchar("room_code", { length: 10 }).unique().notNull(),
  teacherId: uuid("teacher_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  currentLoopId: uuid("current_loop_id").references(() => loops.id),
  currentTempo: integer("current_tempo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const sessionParticipants = pgTable("session_participants", {
  sessionId: uuid("session_id").references(() => liveSessions.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// ── Practice Logs ─────────────────────────────────────────────────────────────

export const practiceLogs = pgTable("practice_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  loopId: uuid("loop_id").references(() => loops.id),
  sessionId: uuid("session_id").references(() => liveSessions.id),
  durationSeconds: integer("duration_seconds").notNull(),
  bpmPracticed: integer("bpm_practiced"),
  practicedAt: timestamp("practiced_at").defaultNow().notNull(),
});

// ── Chord Progressions ────────────────────────────────────────────────────────

export const chordProgressions = pgTable("chord_progressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  progressionType: varchar("progression_type", { length: 50 }),
  chords: jsonb("chords").notNull(),
  keySignature: varchar("key_signature", { length: 10 }),
  timeSignatureId: integer("time_signature_id").references(() => timeSignatures.id),
  genreId: integer("genre_id").references(() => genres.id),
  difficultyLevel: integer("difficulty_level"),
  isJazzStandard: boolean("is_jazz_standard").default(false).notNull(),
  composer: varchar("composer", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Insert Schemas ────────────────────────────────────────────────────────────

export const insertLoopSchema = createInsertSchema(loops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLoop = z.infer<typeof insertLoopSchema>;
export type Loop = typeof loops.$inferSelect;

export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creators.$inferSelect;

export const insertChordProgressionSchema = createInsertSchema(chordProgressions).omit({
  id: true,
  createdAt: true,
});
export type InsertChordProgression = z.infer<typeof insertChordProgressionSchema>;
export type ChordProgression = typeof chordProgressions.$inferSelect;

export const insertPracticeLogSchema = createInsertSchema(practiceLogs).omit({
  id: true,
  practicedAt: true,
});
export type InsertPracticeLog = z.infer<typeof insertPracticeLogSchema>;
export type PracticeLog = typeof practiceLogs.$inferSelect;
