import { parseYandexPlaylist, extractUniqueArtists } from './yandex-music-parser';
import { searchSpotifyArtist, getArtistDiscography } from './spotify-client';
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

// Update artist with Spotify information
async function updateArtistWithSpotifyInfo(artistId: number, spotifyInfo: any) {
  await db.update(artists)
    .set({
      spotifyId: spotifyInfo.id,
      genres: spotifyInfo.genres,
      popularity: spotifyInfo.popularity,
      followers: spotifyInfo.followers,
      lastUpdated: new Date()
    })
    .where(eq(artists.id, artistId));
}

// Check if release already exists
async function releaseExists(spotifyId: string, artistId: number, title: string): Promise<boolean> {
  const existing = await db.select()
    .from(releases)
    .where(
      and(
        eq(releases.artistId, artistId),
        spotifyId ? eq(releases.spotifyId, spotifyId) : eq(releases.title, title)
      )
    )
    .limit(1);
    
  return existing.length > 0;
}

// Create release from Spotify album
async function createReleaseFromSpotifyAlbum(album: any, artistId: number) {
  const coverUrl = album.images && album.images.length > 0 ? album.images[0].url : null;
  
  await db.insert(releases).values({
    artistId,
    title: album.name,
    type: album.album_type, // 'album', 'single', or 'compilation'
    releaseDate: new Date(album.release_date),
    coverUrl,
    spotifyId: album.id,
    totalTracks: album.total_tracks,
    streamingLinks: {
      spotify: `https://open.spotify.com/album/${album.id}`
    }
  });
}

// Process a single artist: find in Spotify and import discography
async function processArtist(artistName: string, yandexMusicUrl?: string, yandexMusicId?: string): Promise<{
  newReleases: number;
  skippedReleases: number;
  error?: string;
}> {
  try {
    console.log(`Processing artist: ${artistName}`);
    
    // Find or create artist in our database
    const artistId = await findOrCreateArtist(artistName, yandexMusicUrl, yandexMusicId);
    
    // Search for artist in Spotify
    const spotifyArtist = await searchSpotifyArtist(artistName);
    
    if (!spotifyArtist) {
      console.log(`Artist "${artistName}" not found in Spotify`);
      return { newReleases: 0, skippedReleases: 0, error: `Not found in Spotify` };
    }
    
    console.log(`Found Spotify artist: ${spotifyArtist.name} (ID: ${spotifyArtist.id})`);
    
    // Update artist with Spotify information
    await updateArtistWithSpotifyInfo(artistId, spotifyArtist);
    
    // Get artist's discography from Spotify
    const discography = await getArtistDiscography(spotifyArtist.id);
    
    console.log(`Found ${discography.length} releases for ${artistName}`);
    
    let newReleases = 0;
    let skippedReleases = 0;
    
    for (const album of discography) {
      // Check if release already exists
      if (await releaseExists(album.id, artistId, album.name)) {
        skippedReleases++;
        continue;
      }
      
      // Create new release
      await createReleaseFromSpotifyAlbum(album, artistId);
      newReleases++;
      
      console.log(`Added release: "${album.name}" (${album.album_type})`);
    }
    
    return { newReleases, skippedReleases };
    
  } catch (error) {
    console.error(`Error processing artist "${artistName}":`, error);
    return { 
      newReleases: 0, 
      skippedReleases: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Import music from a single Yandex playlist
export async function importFromYandexPlaylist(playlistUrl: string): Promise<ImportStats> {
  const stats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };
  
  try {
    console.log(`Starting import from playlist: ${playlistUrl}`);
    
    // Parse Yandex Music playlist
    const playlist = await parseYandexPlaylist(playlistUrl);
    
    if (!playlist) {
      stats.errors.push(`Failed to parse playlist: ${playlistUrl}`);
      return stats;
    }
    
    console.log(`Parsed playlist "${playlist.title}" with ${playlist.tracks.length} tracks`);
    
    // Extract unique artists
    const uniqueArtists = extractUniqueArtists([playlist]);
    
    console.log(`Found ${uniqueArtists.length} unique artists`);
    
    // Process each artist
    for (const artistInfo of uniqueArtists) {
      const result = await processArtist(
        artistInfo.artist, 
        artistInfo.artistUrl, 
        artistInfo.artistId
      );
      
      stats.newReleases += result.newReleases;
      stats.skippedReleases += result.skippedReleases;
      
      if (result.error) {
        stats.errors.push(`${artistInfo.artist}: ${result.error}`);
      } else {
        if (result.newReleases > 0) {
          stats.newArtists++;
        }
      }
      
      // Rate limiting between artists
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Import completed. New releases: ${stats.newReleases}, Skipped: ${stats.skippedReleases}, Errors: ${stats.errors.length}`);
    
    return stats;
    
  } catch (error) {
    console.error('Error during playlist import:', error);
    stats.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}

// Update all existing artists with new releases
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

    // Get all artists with Spotify IDs
    const artistsWithSpotify = await db
      .select()
      .from(artists)
      .where(sql`spotify_id IS NOT NULL AND spotify_id != ''`);

    console.log(`Found ${artistsWithSpotify.length} artists with Spotify IDs`);

    for (const artist of artistsWithSpotify) {
      try {
        console.log(`🔄 Updating artist: ${artist.name}`);

        // Get latest discography from Spotify
        const discography = await getArtistDiscography(artist.spotifyId!);
        
        let newReleases = 0;
        let skippedReleases = 0;

        for (const album of discography) {
          // Check if release already exists
          if (await releaseExists(album.id, artist.id, album.name)) {
            skippedReleases++;
            continue;
          }

          // Create new release
          await createReleaseFromSpotifyAlbum(album, artist.id);
          newReleases++;

          console.log(`  ✅ Added: "${album.name}" (${album.album_type})`);
        }

        if (newReleases > 0) {
          stats.updatedArtists++;
        }

        stats.newReleases += newReleases;
        stats.skippedReleases += skippedReleases;

        console.log(`  📊 ${artist.name}: +${newReleases} новых, ~${skippedReleases} пропущено`);

        // Rate limiting between artists
        await new Promise(resolve => setTimeout(resolve, 1000));

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

// Import music from multiple Yandex playlists
export async function importFromMultipleYandexPlaylists(playlistUrls: string[]): Promise<ImportStats> {
  const totalStats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };
  
  for (const url of playlistUrls) {
    try {
      const stats = await importFromYandexPlaylist(url);
      
      totalStats.newArtists += stats.newArtists;
      totalStats.updatedArtists += stats.updatedArtists;
      totalStats.newReleases += stats.newReleases;
      totalStats.skippedReleases += stats.skippedReleases;
      totalStats.errors.push(...stats.errors);
      
      // Longer delay between playlists
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`Error importing from playlist ${url}:`, error);
      totalStats.errors.push(`${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return totalStats;
}

// Update existing artists (check for new releases)
export async function updateExistingArtists(): Promise<ImportStats> {
  const stats: ImportStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: []
  };
  
  try {
    // Get all artists with Spotify IDs that haven't been updated in the last 24 hours
    const existingArtists = await db.select()
      .from(artists)
      .where(
        and(
          sql`${artists.spotifyId} IS NOT NULL`,
          sql`${artists.lastUpdated} < NOW() - INTERVAL '1 day'`
        )
      );
    
    console.log(`Updating ${existingArtists.length} existing artists`);
    
    for (const artist of existingArtists) {
      if (!artist.spotifyId) continue;
      
      try {
        console.log(`Updating artist: ${artist.name}`);
        
        // Get updated discography from Spotify
        const discography = await getArtistDiscography(artist.spotifyId);
        
        let newReleases = 0;
        let skippedReleases = 0;
        
        for (const album of discography) {
          // Check if release already exists
          if (await releaseExists(album.id, artist.id, album.name)) {
            skippedReleases++;
            continue;
          }
          
          // Create new release
          await createReleaseFromSpotifyAlbum(album, artist.id);
          newReleases++;
          
          console.log(`Added new release: "${album.name}" by ${artist.name}`);
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
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error updating artist ${artist.name}:`, error);
        stats.errors.push(`${artist.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`Artist update completed. New releases: ${stats.newReleases}, Updated artists: ${stats.updatedArtists}`);
    
    return stats;
    
  } catch (error) {
    console.error('Error during artist update:', error);
    stats.errors.push(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return stats;
  }
}