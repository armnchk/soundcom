import axios from 'axios';
import * as cheerio from 'cheerio';

export interface YandexMusicTrack {
  title: string;
  artist: string;
  artistId?: string; // Yandex Music artist ID if available
  artistUrl?: string; // Link to artist page in Yandex Music
}

export interface YandexMusicPlaylist {
  title: string;
  url: string;
  tracks: YandexMusicTrack[];
}

// Extract artist ID from Yandex Music artist URL
function extractArtistId(url: string): string | undefined {
  const match = url.match(/\/artist\/(\d+)/);
  return match ? match[1] : undefined;
}

// Parse a single Yandex Music playlist
export async function parseYandexPlaylist(playlistUrl: string): Promise<YandexMusicPlaylist | null> {
  try {
    console.log(`Parsing Yandex Music playlist: ${playlistUrl}`);
    
    const response = await axios.get(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const tracks: YandexMusicTrack[] = [];
    
    // Try different selectors for track information
    const trackSelectors = [
      '.d-track',
      '.track',
      '[data-testid="track"]',
      '.playlist-track',
      '.track-item'
    ];
    
    let playlistTitle = '';
    
    // Extract playlist title
    const titleSelectors = [
      '.page-playlist__title',
      '.playlist__title',
      'h1',
      '.d-generic-page-head__title',
      '[data-testid="playlist-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = $(selector).first();
      if (titleElement.length && titleElement.text().trim()) {
        playlistTitle = titleElement.text().trim();
        break;
      }
    }
    
    // If no specific playlist title found, try to get it from page title
    if (!playlistTitle) {
      const pageTitle = $('title').text().trim();
      if (pageTitle && !pageTitle.includes('Яндекс.Музыка')) {
        playlistTitle = pageTitle.replace(' — Яндекс.Музыка', '').replace(' - Яндекс.Музыка', '');
      }
    }
    
    console.log(`Found playlist title: "${playlistTitle}"`);
    
    // Try each selector to find tracks
    for (const selector of trackSelectors) {
      const trackElements = $(selector);
      console.log(`Trying selector "${selector}": found ${trackElements.length} elements`);
      
      if (trackElements.length > 0) {
        trackElements.each((index, element) => {
          const $track = $(element);
          
          // Try different methods to extract track info
          let title = '';
          let artist = '';
          let artistUrl = '';
          
          // Method 1: Look for specific classes
          title = $track.find('.d-track__title, .track__title, .track-title, [data-testid="track-title"]').first().text().trim();
          artist = $track.find('.d-track__artists, .track__artists, .track-artist, [data-testid="track-artist"]').first().text().trim();
          
          // Method 2: Look for links to artists
          const artistLink = $track.find('a[href*="/artist/"]').first();
          if (artistLink.length) {
            if (!artist) {
              artist = artistLink.text().trim();
            }
            artistUrl = artistLink.attr('href') || '';
            if (artistUrl && !artistUrl.startsWith('http')) {
              artistUrl = 'https://music.yandex.ru' + artistUrl;
            }
          }
          
          // Method 3: Try to extract from text content
          if (!title || !artist) {
            const textContent = $track.text().trim();
            const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
            
            if (lines.length >= 2) {
              if (!title) title = lines[0];
              if (!artist) artist = lines[1];
            }
          }
          
          // Clean up extracted data
          title = title.replace(/^\d+\.\s*/, ''); // Remove track numbers
          artist = artist.split(',')[0].trim(); // Take first artist if multiple
          
          if (title && artist && title !== artist) {
            const track: YandexMusicTrack = {
              title,
              artist,
              artistUrl: artistUrl || undefined,
              artistId: artistUrl ? extractArtistId(artistUrl) : undefined
            };
            tracks.push(track);
          }
        });
        
        if (tracks.length > 0) {
          break; // Found tracks with this selector, no need to try others
        }
      }
    }
    
    console.log(`Extracted ${tracks.length} tracks from playlist`);
    
    // Log first few tracks for debugging
    tracks.slice(0, 3).forEach((track, index) => {
      console.log(`Track ${index + 1}: "${track.title}" by "${track.artist}" ${track.artistUrl ? `(${track.artistUrl})` : ''}`);
    });
    
    if (tracks.length === 0) {
      console.warn('No tracks found in playlist. The page structure might have changed.');
      return null;
    }
    
    return {
      title: playlistTitle || 'Unknown Playlist',
      url: playlistUrl,
      tracks
    };
    
  } catch (error) {
    console.error(`Error parsing Yandex Music playlist ${playlistUrl}:`, error);
    return null;
  }
}

// Get unique artists from multiple playlists
export function extractUniqueArtists(playlists: YandexMusicPlaylist[]): YandexMusicTrack[] {
  const artistMap = new Map<string, YandexMusicTrack>();
  
  for (const playlist of playlists) {
    for (const track of playlist.tracks) {
      const artistKey = track.artist.toLowerCase().trim();
      
      if (!artistMap.has(artistKey)) {
        // Store the first occurrence of each artist
        artistMap.set(artistKey, {
          title: '', // Not needed for artist info
          artist: track.artist,
          artistId: track.artistId,
          artistUrl: track.artistUrl
        });
      } else {
        // Update with more complete info if available
        const existing = artistMap.get(artistKey)!;
        if (!existing.artistId && track.artistId) {
          existing.artistId = track.artistId;
        }
        if (!existing.artistUrl && track.artistUrl) {
          existing.artistUrl = track.artistUrl;
        }
      }
    }
  }
  
  return Array.from(artistMap.values());
}

// Parse multiple playlists
export async function parseMultipleYandexPlaylists(playlistUrls: string[]): Promise<YandexMusicPlaylist[]> {
  const results: YandexMusicPlaylist[] = [];
  
  for (const url of playlistUrls) {
    try {
      const playlist = await parseYandexPlaylist(url);
      if (playlist) {
        results.push(playlist);
        console.log(`Successfully parsed playlist: "${playlist.title}" with ${playlist.tracks.length} tracks`);
      } else {
        console.warn(`Failed to parse playlist: ${url}`);
      }
      
      // Rate limiting: wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error parsing playlist ${url}:`, error);
    }
  }
  
  return results;
}