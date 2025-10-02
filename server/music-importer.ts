import { parsePlaylist, parseMultiplePlaylists } from './russian-music-parsers';
import { musicAPI } from './combined-music-api';
import { db } from './db';
import { artists, releases, discographyCache } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface ImportStats {
  newArtists: number;
  updatedArtists: number;
  newReleases: number;
  skippedReleases: number;
  errors: string[];
}

// Find or create artist in database
export async function findOrCreateArtist(artistName: string, source?: string, sourceId?: string) {
  // First try to find existing artist by name
  const existing = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
  
  if (existing.length > 0) {
    const artist = existing[0];
    
    // Update with external music service info if we have it and it's missing
    if (source && sourceId) {
      const updateData: any = { last_updated: new Date() };
      
      if (source === 'deezer' && !artist.deezer_id) {
        updateData.deezer_id = sourceId;
      } else if (source === 'itunes' && !artist.itunes_id) {
        updateData.itunes_id = sourceId;
      } else if (source === 'mts' && !artist.mts_music_id) {
        updateData.mts_music_id = sourceId;
      }
      
      if (Object.keys(updateData).length > 1) {
        await db.update(artists)
          .set(updateData)
          .where(eq(artists.id, artist.id));
      }
    }
    
    return artist.id;
  }
  
  // Create new artist
  const newArtistData: any = {
    name: artistName,
    last_updated: new Date()
  };
  
  if (source && sourceId) {
    if (source === 'deezer') {
      newArtistData.deezer_id = sourceId;
    } else if (source === 'itunes') {
      newArtistData.itunes_id = sourceId;
    } else if (source === 'mts') {
      newArtistData.mts_music_id = sourceId;
    }
  }
  
  const newArtist = await db.insert(artists)
    .values(newArtistData)
    .returning({ id: artists.id });
    
  return newArtist[0].id;
}

// Update artist with external music service information
export async function updateArtistWithMusicInfo(artistId: number, artistInfo: any, source: 'deezer' | 'itunes') {
  console.log(`🔧 Updating artist ${artistId} with ${source} data:`, JSON.stringify(artistInfo, null, 2));
  
  if (!artistInfo || !artistInfo.id) {
    console.log(`❌ Invalid artist info:`, artistInfo);
    return;
  }
  
  const updateData: any = {
    last_updated: new Date()
  };
  
  if (source === 'deezer') {
    updateData.deezer_id = artistInfo.id;
    updateData.genres = artistInfo.genres || [];
    updateData.popularity = artistInfo.popularity || 0;
    updateData.followers = artistInfo.followers || artistInfo.popularity || 0;
    updateData.image_url = artistInfo.imageUrl;
    console.log(`   ✅ Deezer update data:`, updateData);
  } else if (source === 'itunes') {
    updateData.itunes_id = artistInfo.id;
    updateData.genres = artistInfo.genres || [];
    console.log(`   ✅ iTunes update data:`, updateData);
    // iTunes не предоставляет followers и popularity в том же формате
  }
  
  try {
    await db.update(artists)
      .set(updateData)
      .where(eq(artists.id, artistId));
      
    console.log(`   ✅ Artist ${artistId} updated successfully`);
  } catch (error) {
    console.error(`   ❌ Error updating artist ${artistId}:`, error);
  }
}

// Check if release already exists
async function releaseExists(externalId: string, artistId: number, title: string, source: 'deezer' | 'itunes'): Promise<boolean> {
  const existing = await db.select()
    .from(releases)
    .where(
      and(
        eq(releases.artist_id, artistId),
        externalId ? 
          (source === 'deezer' ? eq(releases.deezer_id, externalId) : eq(releases.itunes_id, externalId))
          : eq(releases.title, title)
      )
    )
    .limit(1);
    
  return existing.length > 0;
}

// Create release from external album data
async function createReleaseFromAlbum(album: any, artistId: number, source: 'deezer' | 'itunes') {
  console.log(`🎵 Creating release: "${album.title}" from ${source}`);
  console.log(`   Album data:`, JSON.stringify(album, null, 2));
  
  // Обрабатываем жанры - преобразуем в правильный формат для JSONB
  let processedGenres = [];
  if (album.genres && Array.isArray(album.genres)) {
    processedGenres = album.genres.map((genre: any) => {
      if (typeof genre === 'string') {
        return { name: genre };
      } else if (genre && typeof genre === 'object') {
        return {
          name: genre.name || genre.title || 'Unknown',
          id: genre.id || null
        };
      }
      return { name: 'Unknown' };
    });
  }
  console.log(`   Processed genres:`, processedGenres);
  
  // Обрабатываем участников - преобразуем в правильный формат для JSONB
  let processedContributors = [];
  if (album.contributors && Array.isArray(album.contributors)) {
    processedContributors = album.contributors.map((contributor: any) => {
      if (typeof contributor === 'string') {
        return { name: contributor, role: 'contributor' };
      } else if (contributor && typeof contributor === 'object') {
        return {
          name: contributor.name || contributor.title || 'Unknown',
          role: contributor.role || 'contributor',
          id: contributor.id || null
        };
      }
      return { name: 'Unknown', role: 'contributor' };
    });
  }
  
  const releaseData: any = {
    artist_id: artistId,
    title: album.title,
    type: album.albumType,
    cover_url: album.imageUrl,
    cover_small: album.coverSmall,
    cover_medium: album.coverMedium,
    cover_big: album.coverBig,
    cover_xl: album.coverXl,
    total_tracks: album.trackCount,
    duration: album.duration,
    explicit_lyrics: album.explicitLyrics || false,
    explicit_content_lyrics: album.explicitContentLyrics || 0,
    explicit_content_cover: album.explicitContentCover || 0,
    genres: processedGenres,
    upc: album.upc,
    label: album.label,
    contributors: processedContributors
  };
  
  if (album.releaseDate) {
    releaseData.release_date = new Date(album.releaseDate);
  }
  
  if (source === 'deezer') {
    releaseData.deezer_id = album.id;
    releaseData.streaming_links = {
      deezer: `https://www.deezer.com/album/${album.id}`
    };
  } else if (source === 'itunes') {
    releaseData.itunes_id = album.id;
    releaseData.streaming_links = {
      itunes: `https://music.apple.com/album/${album.id}`
    };
  }
  
  // Добавляем Apple Music ссылку для iTunes релизов
  if (source === 'itunes' && album.id) {
    releaseData.streaming_links = {
      ...releaseData.streaming_links,
      appleMusic: `https://music.apple.com/album/${album.id}`
    };
  }
  
  console.log(`   Final release data:`, JSON.stringify(releaseData, null, 2));
  
  await db.insert(releases).values(releaseData);
  
  console.log(`   ✅ Release "${album.title}" created successfully`);
}

// Update existing release with additional data from another source
async function updateReleaseWithAdditionalData(existingRelease: any, album: any, source: 'deezer' | 'itunes') {
  const updateData: any = {};
  
  // Добавляем ID от другого сервиса
  if (source === 'deezer' && !existingRelease.deezer_id) {
    updateData.deezer_id = album.id;
    updateData.streaming_links = {
      ...existingRelease.streaming_links,
      deezer: `https://www.deezer.com/album/${album.id}`
    };
  } else if (source === 'itunes' && !existingRelease.itunes_id) {
    updateData.itunes_id = album.id;
    updateData.streaming_links = {
      ...existingRelease.streaming_links,
      itunes: `https://music.apple.com/album/${album.id}`,
      appleMusic: `https://music.apple.com/album/${album.id}`
    };
  }
  
  // Добавляем недостающие данные
  if (!existingRelease.cover_small && album.coverSmall) {
    updateData.cover_small = album.coverSmall;
  }
  if (!existingRelease.cover_medium && album.coverMedium) {
    updateData.cover_medium = album.coverMedium;
  }
  if (!existingRelease.cover_big && album.coverBig) {
    updateData.cover_big = album.coverBig;
  }
  if (!existingRelease.cover_xl && album.coverXl) {
    updateData.cover_xl = album.coverXl;
  }
  if (!existingRelease.duration && album.duration) {
    updateData.duration = album.duration;
  }
  if (!existingRelease.upc && album.upc) {
    updateData.upc = album.upc;
  }
  if (!existingRelease.label && album.label) {
    updateData.label = album.label;
  }
  
  // Обновляем жанры, если их нет или мало
  if ((!existingRelease.genres || existingRelease.genres.length === 0) && album.genres) {
    let processedGenres = [];
    if (Array.isArray(album.genres)) {
      processedGenres = album.genres.map((genre: any) => {
        if (typeof genre === 'string') {
          return { name: genre };
        } else if (genre && typeof genre === 'object') {
          return {
            name: genre.name || genre.title || 'Unknown',
            id: genre.id || null
          };
        }
        return { name: 'Unknown' };
      });
    }
    updateData.genres = processedGenres;
  }
  
  // Обновляем участников, если их нет
  if ((!existingRelease.contributors || existingRelease.contributors.length === 0) && album.contributors) {
    let processedContributors = [];
    if (Array.isArray(album.contributors)) {
      processedContributors = album.contributors.map((contributor: any) => {
        if (typeof contributor === 'string') {
          return { name: contributor, role: 'contributor' };
        } else if (contributor && typeof contributor === 'object') {
          return {
            name: contributor.name || contributor.title || 'Unknown',
            role: contributor.role || 'contributor',
            id: contributor.id || null
          };
        }
        return { name: 'Unknown', role: 'contributor' };
      });
    }
    updateData.contributors = processedContributors;
  }
  
  if (Object.keys(updateData).length > 0) {
    await db.update(releases)
      .set(updateData)
      .where(eq(releases.id, existingRelease.id));
  }
}

// Get cached discography for artist
async function getCachedDiscography(artistId: number, source: 'deezer' | 'itunes'): Promise<string[] | null> {
  const cached = await db.select()
    .from(discographyCache)
    .where(and(
      eq(discographyCache.artist_id, artistId),
      eq(discographyCache.source, source)
    ))
    .limit(1);
    
  return cached.length > 0 ? cached[0].album_ids : null;
}

// Update discography cache for artist
async function updateDiscographyCache(artistId: number, source: 'deezer' | 'itunes', albumIds: string[]) {
  // Delete existing cache
  await db.delete(discographyCache)
    .where(and(
      eq(discographyCache.artist_id, artistId),
      eq(discographyCache.source, source)
    ));
    
  // Insert new cache
  await db.insert(discographyCache).values({
    artist_id: artistId,
    source,
    album_ids: albumIds,
    last_updated: new Date()
  });
}

// Process a single artist: find in combined music APIs and import discography
export async function processArtist(artistName: string): Promise<{
  newReleases: number;
  skippedReleases: number;
  error?: string;
}> {
  try {
    console.log(`🎵 Processing artist: ${artistName}`);
    
    // Search for artist using combined API (Deezer + iTunes fallback)
    const musicResult = await musicAPI.findArtist(artistName);
    
    if (!musicResult) {
      console.log(`❌ Artist "${artistName}" not found in any music service`);
      return { newReleases: 0, skippedReleases: 0, error: `Not found in music services` };
    }
    
    console.log(`🔍 DEBUG: musicResult:`, JSON.stringify(musicResult, null, 2));
    
    const { artist, albums } = musicResult;
    
    console.log(`🔍 DEBUG: artist после деструктуризации:`, JSON.stringify(artist, null, 2));
    console.log(`🔍 DEBUG: albums после деструктуризации:`, JSON.stringify(albums, null, 2));
    
    if (!artist) {
      console.log(`❌ Artist data is missing from musicResult`);
      return { newReleases: 0, skippedReleases: 0, error: `Artist data is missing` };
    }
    
    console.log(`✅ Found artist: ${artist.name} (${artist.source}, ID: ${artist.id})`);
    
    // Find or create artist in our database
    const artistId = await findOrCreateArtist(artist.name, artist.source, artist.id);
    
    // Update artist with external music service information
    await updateArtistWithMusicInfo(artistId, artist, artist.source);
    
    console.log(`📀 Found ${albums.length} releases for ${artist.name}`);
    
    // Check if we have existing artist to optimize with caching
    const isExistingArtist = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
    const isUpdate = isExistingArtist.length > 0 && isExistingArtist[0].last_updated;
    
    let newReleases = 0;
    let skippedReleases = 0;
    let albumsToProcess = albums;
    
    if (isUpdate) {
      console.log(`🔄 Updating artist: ${artist.name}`);
      
      // Get cached discography
      const cachedAlbumIds = await getCachedDiscography(artistId, artist.source);
      
      if (cachedAlbumIds && cachedAlbumIds.length > 0) {
        // Filter only new albums that weren't in the cache
        const currentAlbumIds = albums.map(album => album.id);
        const newAlbumIds = currentAlbumIds.filter(id => !cachedAlbumIds.includes(id));
        
        albumsToProcess = albums.filter(album => newAlbumIds.includes(album.id));
        skippedReleases = albums.length - albumsToProcess.length;
        
        console.log(`💾 Cache optimization: ${albumsToProcess.length} new albums, ${skippedReleases} cached`);
      }
    }
    
    // Process albums (either all for new artists, or only new ones for existing)
    for (const album of albumsToProcess) {
      // Double-check if release already exists (safety net)
      if (await releaseExists(album.id, artistId, album.title, album.source)) {
        skippedReleases++;
        continue;
      }
      
      // Create new release
      await createReleaseFromAlbum(album, artistId, album.source);
      newReleases++;
      
      console.log(`  ✅ Added: "${album.title}" (${album.albumType})`);
    }
    
    // Update discography cache with all current album IDs
    const allAlbumIds = albums.map(album => album.id);
    await updateDiscographyCache(artistId, artist.source, allAlbumIds);
    
    console.log(`📊 ${artist.name}: +${newReleases} новых, ~${skippedReleases} пропущено`);
    
    return { newReleases, skippedReleases };
    
  } catch (error) {
    console.error(`❌ Error processing artist "${artistName}":`, error);
    return { 
      newReleases: 0, 
      skippedReleases: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Import discography for an artist
async function importDiscography(artistId: number, musicResult: any): Promise<{
  newReleases: number;
  skippedReleases: number;
  error?: string;
}> {
  try {
    const { artist, albums } = musicResult;
    
    console.log(`📀 Found ${albums.length} releases for ${artist.name}`);
    
    // Check if we have existing artist to optimize with caching
    const isExistingArtist = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
    const isUpdate = isExistingArtist.length > 0 && isExistingArtist[0].last_updated;
    
    let newReleases = 0;
    let skippedReleases = 0;
    let albumsToProcess = albums;
    
    if (isUpdate) {
      console.log(`🔄 Updating artist: ${artist.name}`);
      
      // Get cached discography
      const cachedAlbumIds = await getCachedDiscography(artistId, artist.source);
      
      if (cachedAlbumIds && cachedAlbumIds.length > 0) {
        // Filter only new albums that weren't in the cache
        const currentAlbumIds = albums.map(album => album.id);
        const newAlbumIds = currentAlbumIds.filter(id => !cachedAlbumIds.includes(id));
        
        albumsToProcess = albums.filter(album => newAlbumIds.includes(album.id));
        skippedReleases = albums.length - albumsToProcess.length;
        
        console.log(`💾 Cache optimization: ${albumsToProcess.length} new albums, ${skippedReleases} cached`);
      }
    }
    
    // Process albums (either all for new artists, or only new ones for existing)
    for (const album of albumsToProcess) {
      // Double-check if release already exists (safety net)
      if (await releaseExists(album.id, artistId, album.title, album.source)) {
        skippedReleases++;
        continue;
      }
      
      // Create new release
      const releaseData = {
        artist_id: artistId,
        title: album.title,
        release_date: album.releaseDate ? new Date(album.releaseDate) : null,
        cover_url: album.imageUrl || null,
        streaming_links: {
          deezer: album.source === 'deezer' ? `https://deezer.com/album/${album.id}` : null,
          itunes: album.source === 'itunes' ? `https://music.apple.com/album/${album.id}` : null,
        },
        deezer_id: album.source === 'deezer' ? album.id : null,
        itunes_id: album.source === 'itunes' ? album.id : null,
        type: album.albumType || 'album',
        total_tracks: album.trackCount || null,
        is_test_data: false,
      };
      
      await db.insert(releases).values(releaseData);
      newReleases++;
    }
    
    // Update cache with all processed album IDs
    await updateDiscographyCache(artistId, artist.source, albums.map(album => album.id));
    
    // Update artist's last updated timestamp
    await db.update(artists)
      .set({ last_updated: new Date() })
      .where(eq(artists.id, artistId));
    
    console.log(`✅ Imported ${newReleases} new releases for ${artist.name} (${skippedReleases} skipped)`);
    
    return {
      newReleases,
      skippedReleases,
    };
    
  } catch (error) {
    console.error(`❌ Error importing discography for artist ${artistId}:`, error);
    return {
      newReleases: 0,
      skippedReleases: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Process a single artist with MTS Music ID
async function processArtistWithMtsId(artistName: string, mtsId: string): Promise<{
  newReleases: number;
  skippedReleases: number;
  error?: string;
}> {
  try {
    console.log(`🎵 Processing artist: ${artistName} (MTS ID: ${mtsId})`);
    
    // Create or update artist in database with MTS ID
    const artistId = await findOrCreateArtist(artistName, 'mts', mtsId);
    
    // Search for artist using combined API (Deezer + iTunes fallback)
    const musicResult = await musicAPI.findArtist(artistName);
    
    if (!musicResult) {
      return {
        newReleases: 0,
        skippedReleases: 0,
        error: `Artist not found in music APIs`
      };
    }
    
    console.log(`✅ Found artist: ${musicResult.name} (Deezer: ${musicResult.deezerId}, iTunes: ${musicResult.itunesId})`);
    
    // Update with external music service IDs
    if (musicResult.deezerId) {
      await updateArtistWithMusicInfo(artistId, 'deezer', musicResult.deezerId);
    }
    if (musicResult.itunesId) {
      await updateArtistWithMusicInfo(artistId, 'itunes', musicResult.itunesId);
    }
    
    // Import discography
    const discographyResult = await importDiscography(artistId, musicResult);
    
    return {
      newReleases: discographyResult.newReleases,
      skippedReleases: discographyResult.skippedReleases,
      error: discographyResult.error
    };
    
  } catch (error) {
    console.error(`❌ Error processing artist ${artistName}:`, error);
    return {
      newReleases: 0,
      skippedReleases: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Import music from a single Russian music playlist (MTS Music, etc.)
export async function importFromRussianPlaylist(playlistUrl: string): Promise<ImportStats> {
  const stats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };
  
  try {
    console.log(`🎵 Starting import from playlist: ${playlistUrl}`);
    
    // Parse Russian music playlist (MTS Music, etc.)
    const playlistResult = await parsePlaylist(playlistUrl);
    
    if (!playlistResult) {
      stats.errors.push(`Failed to parse playlist: ${playlistUrl}`);
      return stats;
    }
    
    console.log(`📋 Parsed playlist "${playlistResult.name}" with ${playlistResult.tracks.length} tracks`);
    console.log(`👨‍🎤 Found ${playlistResult.uniqueArtists.length} unique artists`);
    
    // Process each track to extract artists with MTS IDs
    const artistsToProcess = new Map<string, string>(); // name -> mtsId
    
    for (const track of playlistResult.tracks) {
      if (track.artists && track.artists.length > 0) {
        // Use the new structure with MTS IDs
        for (const artist of track.artists) {
          if (artist.name && !artistsToProcess.has(artist.name)) {
            artistsToProcess.set(artist.name, artist.mtsId || '');
          }
        }
      } else {
        // Fallback to old structure
        if (track.artist && !artistsToProcess.has(track.artist)) {
          artistsToProcess.set(track.artist, track.artistMtsId || '');
        }
      }
    }
    
    console.log(`👨‍🎤 Processing ${artistsToProcess.size} artists with MTS IDs`);
    
    // Process each artist
    for (const [artistName, mtsId] of artistsToProcess.entries()) {
      const result = await processArtistWithMtsId(artistName, mtsId);
      
      stats.newReleases += result.newReleases;
      stats.skippedReleases += result.skippedReleases;
      
      if (result.error) {
        stats.errors.push(`${artistName}: ${result.error}`);
      } else {
        if (result.newReleases > 0) {
          stats.newArtists++;
        }
      }
      
      // Rate limiting between artists
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`✅ Import completed. New releases: ${stats.newReleases}, Skipped: ${stats.skippedReleases}, Errors: ${stats.errors.length}`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error during playlist import:', error);
    stats.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}

// Обратная совместимость
export async function importFromYandexPlaylist(playlistUrl: string): Promise<ImportStats> {
  console.log(`⚠️ importFromYandexPlaylist is deprecated, use importFromRussianPlaylist instead`);
  return importFromRussianPlaylist(playlistUrl);
}

// Update all existing artists with new releases using combined API
export async function updateAllArtists(): Promise<ImportStats> {
  const stats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting update of all existing artists...');

    // Get all artists with external music service IDs
    const artistsWithExternalIds = await db
      .select()
      .from(artists)
      .where(sql`(deezer_id IS NOT NULL AND deezer_id != '') OR (itunes_id IS NOT NULL AND itunes_id != '')`);

    console.log(`Found ${artistsWithExternalIds.length} artists with external music service IDs`);

    for (const artist of artistsWithExternalIds) {
      try {
        console.log(`🔄 Updating artist: ${artist.name}`);

        // Re-search for artist to get latest discography
        const musicResult = await musicAPI.findArtist(artist.name);
        
        if (!musicResult) {
          console.log(`⚠️ Artist "${artist.name}" no longer found in music services`);
          continue;
        }

        const { artist: updatedArtist, albums: discography } = musicResult;
        
        let newReleases = 0;
        let skippedReleases = 0;

        for (const album of discography) {
          // Check if release already exists
          if (await releaseExists(album.id, artist.id, album.title, album.source)) {
            skippedReleases++;
            continue;
          }

          // Create new release
          await createReleaseFromAlbum(album, artist.id, album.source);
          newReleases++;

          console.log(`  ✅ Added: "${album.title}" (${album.albumType})`);
        }

        if (newReleases > 0) {
          stats.updatedArtists++;
        }

        stats.newReleases += newReleases;
        stats.skippedReleases += skippedReleases;

        console.log(`  📊 ${artist.name}: +${newReleases} новых, ~${skippedReleases} пропущено`);

        // Rate limiting between artists
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error updating artist "${artist.name}":`, error);
        stats.errors.push(`${artist.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Artist update completed. Updated: ${stats.updatedArtists}, New releases: ${stats.newReleases}`);
    return stats;

  } catch (error) {
    console.error('Error during artist update:', error);
    stats.errors.push(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}

// Import music from multiple Russian music playlists
export async function importFromMultipleRussianPlaylists(playlistUrls: string[]): Promise<ImportStats> {
  const totalStats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };
  
  console.log(`🎵 Starting batch import from ${playlistUrls.length} playlists...`);
  
  // Use the batch parser for efficiency
  const parseResult = await parseMultiplePlaylists(playlistUrls);
  
  console.log(`📊 Batch parsing completed:`);
  console.log(`   ✅ Успешно: ${parseResult.successful.length} плейлистов`);
  console.log(`   ❌ Неудачно: ${parseResult.failed.length} плейлистов`);
  
  // Collect all unique artists from all successful playlists
  const allUniqueArtists = new Set<string>();
  parseResult.successful.forEach(playlist => {
    playlist.uniqueArtists.forEach(artist => allUniqueArtists.add(artist));
  });
  
  console.log(`👨‍🎤 Total unique artists found: ${allUniqueArtists.size}`);
  
  // Process each unique artist
  for (const artistName of Array.from(allUniqueArtists)) {
    try {
      const stats = await processArtist(artistName);
      
      totalStats.newReleases += stats.newReleases;
      totalStats.skippedReleases += stats.skippedReleases;
      
      if (stats.error) {
        totalStats.errors.push(`${artistName}: ${stats.error}`);
      } else {
        if (stats.newReleases > 0) {
          totalStats.newArtists++;
        }
      }
      
      // Rate limiting between artists
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error processing artist ${artistName}:`, error);
      totalStats.errors.push(`${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Add failed playlists to errors
  parseResult.failed.forEach(url => {
    totalStats.errors.push(`Failed to parse playlist: ${url}`);
  });
  
  console.log(`✅ Batch import completed. New releases: ${totalStats.newReleases}, Artists: ${totalStats.newArtists}, Errors: ${totalStats.errors.length}`);
  
  return totalStats;
}

// Обратная совместимость
export async function importFromMultipleYandexPlaylists(playlistUrls: string[]): Promise<ImportStats> {
  console.log(`⚠️ importFromMultipleYandexPlaylists is deprecated, use importFromMultipleRussianPlaylists instead`);
  return importFromMultipleRussianPlaylists(playlistUrls);
}

// Update existing artists (check for new releases) - using combined API
export async function updateExistingArtists(): Promise<ImportStats> {
  const stats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };
  
  try {
    // Get all artists with external music service IDs that haven't been updated in the last 24 hours
    const existingArtists = await db.select()
      .from(artists)
      .where(
        and(
          sql`((deezer_id IS NOT NULL AND deezer_id != '') OR (itunes_id IS NOT NULL AND itunes_id != ''))`,
          sql`${artists.lastUpdated} < NOW() - INTERVAL '1 day'`
        )
      );
    
    console.log(`🔄 Updating ${existingArtists.length} existing artists...`);
    
    for (const artist of existingArtists) {
      try {
        console.log(`🔄 Updating artist: ${artist.name}`);
        
        // Re-search for artist to get latest discography
        const musicResult = await musicAPI.findArtist(artist.name);
        
        if (!musicResult) {
          console.log(`⚠️ Artist "${artist.name}" no longer found in music services`);
          continue;
        }

        const { albums: discography } = musicResult;
        
        let newReleases = 0;
        let skippedReleases = 0;
        
        for (const album of discography) {
          // Check if release already exists
          if (await releaseExists(album.id, artist.id, album.title, album.source)) {
            skippedReleases++;
            continue;
          }
          
          // Create new release
          await createReleaseFromAlbum(album, artist.id, album.source);
          newReleases++;
          
          console.log(`  ✅ Added new release: "${album.title}" by ${artist.name}`);
        }
        
        // Update last updated timestamp
        await db.update(artists)
          .set({ lastUpdated: new Date() })
          .where(eq(artists.id, artist.id));
        
        stats.newReleases += newReleases;
        stats.skippedReleases += skippedReleases;
        
        if (newReleases > 0) {
          stats.updatedArtists++;
        }
        
        console.log(`  📊 ${artist.name}: +${newReleases} новых, ~${skippedReleases} пропущено`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error updating artist ${artist.name}:`, error);
        stats.errors.push(`${artist.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`✅ Artist update completed. New releases: ${stats.newReleases}, Updated artists: ${stats.updatedArtists}`);
    
    return stats;
    
  } catch (error) {
    console.error('Error during artist update:', error);
    stats.errors.push(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}