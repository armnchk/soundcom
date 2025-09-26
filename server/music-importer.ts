import { parsePlaylist, parseMultiplePlaylists } from './russian-music-parsers';
import { musicAPI } from './combined-music-api';
import { db } from './db';
import { artists, releases } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface ImportStats {
  newArtists: number;
  updatedArtists: number;
  newReleases: number;
  skippedReleases: number;
  errors: string[];
}

// Find or create artist in database
async function findOrCreateArtist(artistName: string, yandexMusicUrl?: string, yandexMusicId?: string) {
  // First try to find existing artist by name
  const existing = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
  
  if (existing.length > 0) {
    const artist = existing[0];
    
    // Update with Yandex Music info if we have it and it's missing
    if ((yandexMusicUrl || yandexMusicId) && (!artist.yandexMusicUrl || !artist.yandexMusicId)) {
      await db.update(artists)
        .set({
          yandexMusicUrl: yandexMusicUrl || artist.yandexMusicUrl,
          yandexMusicId: yandexMusicId || artist.yandexMusicId,
          lastUpdated: new Date()
        })
        .where(eq(artists.id, artist.id));
    }
    
    return artist.id;
  }
  
  // Create new artist
  const newArtist = await db.insert(artists)
    .values({
      name: artistName,
      yandexMusicUrl,
      yandexMusicId,
      lastUpdated: new Date()
    })
    .returning({ id: artists.id });
    
  return newArtist[0].id;
}

// Update artist with external music service information
async function updateArtistWithMusicInfo(artistId: number, artistInfo: any, source: 'deezer' | 'itunes') {
  const updateData: any = {
    lastUpdated: new Date()
  };
  
  if (source === 'deezer') {
    updateData.deezerId = artistInfo.id;
    updateData.genres = artistInfo.genres;
    updateData.popularity = artistInfo.popularity;
    updateData.imageUrl = artistInfo.imageUrl;
  } else if (source === 'itunes') {
    updateData.itunesId = artistInfo.id;
    updateData.genres = artistInfo.genres;
  }
  
  await db.update(artists)
    .set(updateData)
    .where(eq(artists.id, artistId));
}

// Check if release already exists
async function releaseExists(externalId: string, artistId: number, title: string, source: 'deezer' | 'itunes'): Promise<boolean> {
  const existing = await db.select()
    .from(releases)
    .where(
      and(
        eq(releases.artistId, artistId),
        externalId ? 
          (source === 'deezer' ? eq(releases.deezerId, externalId) : eq(releases.itunesId, externalId))
          : eq(releases.title, title)
      )
    )
    .limit(1);
    
  return existing.length > 0;
}

// Create release from external album data
async function createReleaseFromAlbum(album: any, artistId: number, source: 'deezer' | 'itunes') {
  const releaseData: any = {
    artistId,
    title: album.title,
    type: album.albumType,
    coverUrl: album.imageUrl,
    totalTracks: album.trackCount
  };
  
  if (album.releaseDate) {
    releaseData.releaseDate = new Date(album.releaseDate);
  }
  
  if (source === 'deezer') {
    releaseData.deezerId = album.id;
    releaseData.streamingLinks = {
      deezer: `https://www.deezer.com/album/${album.id}`
    };
  } else if (source === 'itunes') {
    releaseData.itunesId = album.id;
    releaseData.streamingLinks = {
      itunes: `https://music.apple.com/album/${album.id}`
    };
  }
  
  await db.insert(releases).values(releaseData);
}

// Process a single artist: find in combined music APIs and import discography
async function processArtist(artistName: string): Promise<{
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
    
    const { artist, albums } = musicResult;
    
    console.log(`✅ Found artist: ${artist.name} (${artist.source}, ID: ${artist.id})`);
    
    // Find or create artist in our database
    const artistId = await findOrCreateArtist(artist.name, artist.source, artist.id);
    
    // Update artist with external music service information
    await updateArtistWithMusicInfo(artistId, artist, artist.source);
    
    console.log(`📀 Found ${albums.length} releases for ${artist.name}`);
    
    let newReleases = 0;
    let skippedReleases = 0;
    
    for (const album of albums) {
      // Check if release already exists
      if (await releaseExists(album.id, artistId, album.title, album.source)) {
        skippedReleases++;
        continue;
      }
      
      // Create new release
      await createReleaseFromAlbum(album, artistId, album.source);
      newReleases++;
      
      console.log(`  ✅ Added release: "${album.title}" (${album.albumType})`);
    }
    
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
    
    // Process each unique artist (ограничиваем для тестирования)
    const artistsToProcess = playlistResult.uniqueArtists.slice(0, 5);
    console.log(`👨‍🎤 Processing first ${artistsToProcess.length} artists (из ${playlistResult.uniqueArtists.length} общих)`);
    
    for (const artistName of artistsToProcess) {
      const result = await processArtist(artistName);
      
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