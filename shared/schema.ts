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
  unique,
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
  google_id: varchar("google_id", { length: 255 }).unique(),
  email: varchar("email").unique(),
  first_name: varchar("first_name"),
  last_name: varchar("last_name"),
  profile_image_url: varchar("profile_image_url"),
  nickname: varchar("nickname").unique(),
  is_admin: boolean("is_admin").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  deezer_id: varchar("deezer_id", { length: 255 }),
  itunes_id: varchar("itunes_id", { length: 255 }),
  mts_music_id: varchar("mts_music_id", { length: 255 }),
  yandex_music_id: varchar("yandex_music_id", { length: 255 }),
  yandex_music_url: text("yandex_music_url"),
  image_url: text("image_url"),
  genres: text("genres").array(),
  popularity: integer("popularity"),
  followers: integer("followers"),
  last_updated: timestamp("last_updated").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  total_tracks: integer("total_tracks"),
});

export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  artist_id: integer("artist_id").references(() => artists.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("album"), // "album", "single", or "compilation"
  release_date: timestamp("release_date"),
  cover_url: text("cover_url"),
  cover_small: text("cover_small"),
  cover_medium: text("cover_medium"),
  cover_big: text("cover_big"),
  cover_xl: text("cover_xl"),
  streaming_links: jsonb("streaming_links"),
  deezer_id: varchar("deezer_id", { length: 255 }),
  itunes_id: varchar("itunes_id", { length: 255 }),
  yandex_music_id: varchar("yandex_music_id", { length: 255 }),
  yandex_music_url: text("yandex_music_url"),
  total_tracks: integer("total_tracks"),
  duration: integer("duration"), // общая длительность в секундах
  explicit_lyrics: boolean("explicit_lyrics").default(false),
  explicit_content_lyrics: integer("explicit_content_lyrics").default(0), // 0-4
  explicit_content_cover: integer("explicit_content_cover").default(0), // 0-4
  genres: jsonb("genres"), // массив жанров
  upc: varchar("upc", { length: 50 }), // UPC код
  label: varchar("label", { length: 255 }), // лейбл звукозаписи
  contributors: jsonb("contributors"), // участники (продюсеры, авторы и т.д.)
  tracks: jsonb("tracks"), // список треков альбома
  is_test_data: boolean("is_test_data").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate releases by same artist and title
  uniqueArtistTitle: unique().on(table.artist_id, table.title),
}));

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").references(() => users.id),
  release_id: integer("release_id").references(() => releases.id),
  score: integer("score").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").references(() => users.id),
  release_id: integer("release_id").references(() => releases.id),
  content: text("content"),
  rating: integer("rating"),
  parent_id: integer("parent_id").references(() => comments.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const commentReactions = pgTable("comment_reactions", {
  id: serial("id").primaryKey(),
  comment_id: integer("comment_id").references(() => comments.id),
  user_id: varchar("user_id").references(() => users.id),
  reaction_type: varchar("reaction_type", { length: 10 }).notNull(), // 'like' or 'dislike'
  created_at: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  comment_id: integer("comment_id").references(() => comments.id),
  reported_by: varchar("reported_by").references(() => users.id),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending' or 'resolved'
  created_at: timestamp("created_at").defaultNow(),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }),
  description: text("description"),
  is_active: boolean("is_active").default(true),
  is_public: boolean("is_public").default(true),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const collectionReleases = pgTable("collection_releases", {
  id: serial("id").primaryKey(),
  collection_id: integer("collection_id").references(() => collections.id, { onDelete: "cascade" }).notNull(),
  release_id: integer("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull(),
  sort_order: integer("sort_order").default(0),
  added_at: timestamp("added_at").defaultNow(),
}, (table) => ({
  uniqueCollectionRelease: unique().on(table.collection_id, table.release_id),
}));

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
    fields: [releases.artist_id],
    references: [artists.id],
  }),
  ratings: many(ratings),
  comments: many(comments),
  collectionReleases: many(collectionReleases),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.user_id],
    references: [users.id],
  }),
  release: one(releases, {
    fields: [ratings.release_id],
    references: [releases.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
  release: one(releases, {
    fields: [comments.release_id],
    references: [releases.id],
  }),
  reactions: many(commentReactions),
  reports: many(reports),
}));

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  comment: one(comments, {
    fields: [commentReactions.comment_id],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentReactions.user_id],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  comment: one(comments, {
    fields: [reports.comment_id],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [reports.reported_by],
    references: [users.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionReleases: many(collectionReleases),
}));

export const collectionReleasesRelations = relations(collectionReleases, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionReleases.collection_id],
    references: [collections.id],
  }),
  release: one(releases, {
    fields: [collectionReleases.release_id],
    references: [releases.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCommentReactionSchema = createInsertSchema(commentReactions).omit({
  id: true,
  created_at: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  created_at: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCollectionReleaseSchema = createInsertSchema(collectionReleases).omit({
  id: true,
  added_at: true,
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
export type Collection = typeof collections.$inferSelect;
export type CollectionRelease = typeof collectionReleases.$inferSelect;

export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertCommentReaction = z.infer<typeof insertCommentReactionSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertCollectionRelease = z.infer<typeof insertCollectionReleaseSchema>;

// Import Jobs schema for background processing
export const importJobs = pgTable('import_jobs', {
  id: serial('id').primaryKey(),
  playlist_id: integer('playlist_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Автопарсинг плейлистов - список URL для ежедневного импорта
export const autoImportPlaylists = pgTable('auto_import_playlists', {
  id: serial('id').primaryKey(),
  user_id: varchar('user_id').notNull().references(() => users.id),
  url: text('url').notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').default(true),
  platform: varchar('platform', { length: 50 }).default('mts'), // 'mts', 'yandex', etc.
  is_active: boolean('is_active').default(true),
  last_imported_at: timestamp('last_imported_at'),
  sort_order: integer('sort_order').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const insertImportJobSchema = createInsertSchema(importJobs).omit({ 
  id: true, 
  createdAt: true 
});

export type ImportJob = typeof importJobs.$inferSelect;
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;

// Auto Import Playlists schema
export const insertAutoImportPlaylistSchema = createInsertSchema(autoImportPlaylists)
  .omit({ 
    id: true, 
    created_at: true,
    updated_at: true
  })
  .extend({
    user_id: z.string().min(1, "User ID обязателен"),
    url: z.string().min(1, "URL обязателен").url("Введите корректный URL"),
    name: z.string().min(1, "Название обязательно").max(255, "Название слишком длинное"),
    platform: z.string().min(1, "Платформа обязательна"),
    sort_order: z.number().int().min(0, "Порядок сортировки должен быть неотрицательным").optional(),
    enabled: z.boolean().optional(),
    description: z.string().optional()
  });
export type InsertAutoImportPlaylist = z.infer<typeof insertAutoImportPlaylistSchema>;
export type SelectAutoImportPlaylist = typeof autoImportPlaylists.$inferSelect;

// Import logs для отслеживания результатов автоматического импорта
export const importLogs = pgTable('import_logs', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull().default('playlist'),
  status: varchar('status', { length: 20 }).default('pending'),
  message: text('message'),
  details: jsonb('details'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const insertImportLogSchema = createInsertSchema(importLogs).omit({ 
  id: true
});

export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;

// Discography cache для ускорения импортов
export const discographyCache = pgTable('discography_cache', {
  id: serial('id').primaryKey(),
  artist_id: integer('artist_id').references(() => artists.id, { onDelete: 'cascade' }).notNull(),
  source: varchar('source', { length: 20 }).notNull(), // 'deezer', 'itunes'
  album_ids: text('album_ids').array().notNull(), // массив ID альбомов
  last_updated: timestamp('last_updated').notNull().defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
});

export const insertDiscographyCacheSchema = createInsertSchema(discographyCache).omit({ 
  id: true,
  created_at: true
});

export type DiscographyCache = typeof discographyCache.$inferSelect;
export type InsertDiscographyCache = z.infer<typeof insertDiscographyCacheSchema>;
