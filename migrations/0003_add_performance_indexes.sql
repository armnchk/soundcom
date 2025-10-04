-- Добавление индексов для оптимизации производительности

-- Индексы для таблицы releases
CREATE INDEX IF NOT EXISTS idx_releases_artist_id ON releases(artist_id);
CREATE INDEX IF NOT EXISTS idx_releases_created_at ON releases(created_at);
CREATE INDEX IF NOT EXISTS idx_releases_release_date ON releases(release_date);
CREATE INDEX IF NOT EXISTS idx_releases_type ON releases(type);
CREATE INDEX IF NOT EXISTS idx_releases_is_test_data ON releases(is_test_data);
CREATE INDEX IF NOT EXISTS idx_releases_title ON releases USING gin(to_tsvector('english', title));

-- Составной индекс для фильтрации релизов
CREATE INDEX IF NOT EXISTS idx_releases_artist_type_date ON releases(artist_id, type, release_date DESC);

-- Индексы для таблицы artists
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_artists_deezer_id ON artists(deezer_id) WHERE deezer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_itunes_id ON artists(itunes_id) WHERE itunes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_mts_music_id ON artists(mts_music_id) WHERE mts_music_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_yandex_music_id ON artists(yandex_music_id) WHERE yandex_music_id IS NOT NULL;

-- Индексы для таблицы ratings
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_release_id ON ratings(release_id);
CREATE INDEX IF NOT EXISTS idx_ratings_score ON ratings(score);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_user_release ON ratings(user_id, release_id);

-- Индексы для таблицы comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_release_id ON comments(release_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_rating ON comments(rating);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Индексы для таблицы comment_reactions
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON comment_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_comment ON comment_reactions(user_id, comment_id);

-- Индексы для таблицы reports
CREATE INDEX IF NOT EXISTS idx_reports_comment_id ON reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by ON reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Индексы для таблицы collections
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_is_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public);
CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);

-- Индексы для таблицы collection_releases
CREATE INDEX IF NOT EXISTS idx_collection_releases_collection_id ON collection_releases(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_releases_release_id ON collection_releases(release_id);
CREATE INDEX IF NOT EXISTS idx_collection_releases_sort_order ON collection_releases(sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_releases_added_at ON collection_releases(added_at);

-- Индексы для таблицы users
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Индексы для таблицы sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Индексы для таблицы auto_import_playlists
CREATE INDEX IF NOT EXISTS idx_auto_import_playlists_user_id ON auto_import_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_import_playlists_enabled ON auto_import_playlists(enabled);
CREATE INDEX IF NOT EXISTS idx_auto_import_playlists_is_active ON auto_import_playlists(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_import_playlists_platform ON auto_import_playlists(platform);
CREATE INDEX IF NOT EXISTS idx_auto_import_playlists_sort_order ON auto_import_playlists(sort_order);

-- Индексы для таблицы import_jobs
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_import_jobs_started_at ON import_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_import_jobs_completed_at ON import_jobs(completed_at);

-- Индексы для таблицы import_logs
CREATE INDEX IF NOT EXISTS idx_import_logs_type ON import_logs(type);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at);

-- Индексы для таблицы discography_cache
CREATE INDEX IF NOT EXISTS idx_discography_cache_artist_id ON discography_cache(artist_id);
CREATE INDEX IF NOT EXISTS idx_discography_cache_source ON discography_cache(source);
CREATE INDEX IF NOT EXISTS idx_discography_cache_last_updated ON discography_cache(last_updated);

-- Составные индексы для сложных запросов
CREATE INDEX IF NOT EXISTS idx_releases_artist_test_data ON releases(artist_id, is_test_data, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_release_created ON comments(release_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_release_score ON ratings(release_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_collections_active_public ON collections(is_active, is_public, sort_order);

-- Индексы для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_releases_search ON releases USING gin(to_tsvector('english', title || ' ' || COALESCE(streaming_links->>'appleMusic', '')));
CREATE INDEX IF NOT EXISTS idx_artists_search ON artists USING gin(to_tsvector('english', name));

-- Индексы для JSON полей
CREATE INDEX IF NOT EXISTS idx_releases_genres ON releases USING gin(genres);
CREATE INDEX IF NOT EXISTS idx_releases_streaming_links ON releases USING gin(streaming_links);
CREATE INDEX IF NOT EXISTS idx_artists_genres ON artists USING gin(genres);

-- Статистика для оптимизатора запросов
ANALYZE;
