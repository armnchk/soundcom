import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  // Check if we have valid cached tokens
  if (connectionSettings && 
      connectionSettings.settings && 
      connectionSettings.settings.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return {
      accessToken: connectionSettings.settings.access_token,
      clientId: connectionSettings.settings.oauth?.credentials?.client_id,
      refreshToken: connectionSettings.settings.oauth?.credentials?.refresh_token,
      expiresIn: connectionSettings.settings.oauth?.credentials?.expires_in
    };
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not found');
  }

  console.log('🔄 Fetching Spotify connection from Replit...');

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📋 Received connection data:', JSON.stringify(data, null, 2));

    connectionSettings = data.items?.[0];

    if (!connectionSettings) {
      throw new Error('No Spotify connection found in response');
    }

    if (!connectionSettings.settings) {
      throw new Error('No settings found in Spotify connection');
    }

    const refreshToken = connectionSettings.settings.oauth?.credentials?.refresh_token;
    const accessToken = connectionSettings.settings.access_token || connectionSettings.settings.oauth?.credentials?.access_token;
    const clientId = connectionSettings.settings.oauth?.credentials?.client_id;
    const expiresIn = connectionSettings.settings.oauth?.credentials?.expires_in;

    console.log('🔍 Extracted tokens:');
    console.log('  - Access token:', accessToken ? 'Present' : 'Missing');
    console.log('  - Client ID:', clientId ? 'Present' : 'Missing');
    console.log('  - Refresh token:', refreshToken ? 'Present' : 'Missing');

    if (!accessToken || !clientId || !refreshToken) {
      throw new Error(`Missing required Spotify credentials. Access token: ${!!accessToken}, Client ID: ${!!clientId}, Refresh token: ${!!refreshToken}`);
    }

    return {accessToken, clientId, refreshToken, expiresIn};

  } catch (error) {
    console.error('❌ Error fetching Spotify connection:', error);
    throw error;
  }
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableSpotifyClient() {
  const {accessToken, clientId, refreshToken, expiresIn} = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

// Helper functions for our music import system
export interface SpotifyArtistInfo {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  album_type: 'album' | 'single' | 'compilation';
  total_tracks: number;
  images: Array<{url: string, height: number, width: number}>;
  artists: Array<{id: string, name: string}>;
}

export async function searchSpotifyArtist(artistName: string): Promise<SpotifyArtistInfo | null> {
  try {
    const spotify = await getUncachableSpotifyClient();
    const searchResults = await spotify.search(artistName, ['artist'], undefined, 1);
    
    if (searchResults.artists.items.length === 0) {
      return null;
    }

    const artist = searchResults.artists.items[0];
    return {
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total
    };
  } catch (error) {
    console.error(`Error searching for artist ${artistName}:`, error);
    return null;
  }
}

export async function getArtistDiscography(artistId: string): Promise<SpotifyAlbum[]> {
  try {
    const spotify = await getUncachableSpotifyClient();
    const albums: SpotifyAlbum[] = [];
    
    // Get all albums, singles, and compilations
    const albumTypes: ('album' | 'single' | 'compilation')[] = ['album', 'single', 'compilation'];
    
    for (const albumType of albumTypes) {
      let offset = 0;
      const limit = 50;
      
      while (true) {
        const response = await spotify.artists.albums(artistId, albumType, undefined, limit, offset);
        
        if (response.items.length === 0) {
          break;
        }
        
        for (const album of response.items) {
          albums.push({
            id: album.id,
            name: album.name,
            release_date: album.release_date,
            album_type: album.album_type as 'album' | 'single' | 'compilation',
            total_tracks: album.total_tracks,
            images: album.images,
            artists: album.artists.map(artist => ({ id: artist.id, name: artist.name }))
          });
        }
        
        offset += limit;
        if (response.items.length < limit) {
          break;
        }
        
        // Rate limiting: small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return albums;
  } catch (error) {
    console.error(`Error fetching discography for artist ${artistId}:`, error);
    return [];
  }
}