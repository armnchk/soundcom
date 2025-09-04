import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  nickname: varchar("nickname").unique(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id),
  title: varchar("title", { length: 255 }).notNull(),
  releaseDate: timestamp("release_date"),
  coverUrl: text("cover_url"),
  streamingLinks: jsonb("streaming_links"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  releaseId: integer("release_id").references(() => releases.id),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  releaseId: integer("release_id").references(() => releases.id),
  text: text("text"),
  rating: integer("rating"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commentReactions = pgTable("comment_reactions", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").references(() => comments.id),
  userId: varchar("user_id").references(() => users.id),
  reactionType: varchar("reaction_type", { length: 10 }).notNull(), // 'like' or 'dislike'
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").references(() => comments.id),
  reportedBy: varchar("reported_by").references(() => users.id),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending' or 'resolved'
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(ratings),
  comments: many(comments),
  commentReactions: many(commentReactions),
  reports: many(reports),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  releases: many(releases),
}));

export const releasesRelations = relations(releases, ({ one, many }) => ({
  artist: one(artists, {
    fields: [releases.artistId],
    references: [artists.id],
  }),
  ratings: many(ratings),
  comments: many(comments),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  release: one(releases, {
    fields: [ratings.releaseId],
    references: [releases.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  release: one(releases, {
    fields: [comments.releaseId],
    references: [releases.id],
  }),
  reactions: many(commentReactions),
  reports: many(reports),
}));

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  comment: one(comments, {
    fields: [commentReactions.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentReactions.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  comment: one(comments, {
    fields: [reports.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [reports.reportedBy],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
  createdAt: true,
});

export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  createdAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentReactionSchema = createInsertSchema(commentReactions).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Release = typeof releases.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type CommentReaction = typeof commentReactions.$inferSelect;
export type Report = typeof reports.$inferSelect;

export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertCommentReaction = z.infer<typeof insertCommentReactionSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
