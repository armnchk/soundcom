// MusicBrainz API Client - Free music metadata API
// No API key required, just rate limiting compliance
// Docs: https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2

const MUSICBRAINZ_API_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'MusicReviewPlatform/1.0.0 (https://music-review-platform.replit.app)';

// Rate limiting: 1 request per second per IP
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1000; // 1 second

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
}

async function musicBrainzRequest(endpoint: string, params: Record<string, string>) {
  await rateLimit();
  
  const url = new URL(`${MUSICBRAINZ_API_URL}/${endpoint}`);
  url.searchParams.set('fmt', 'json');
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name': string;
  disambiguation?: string;
  'type-id'?: string;
  type?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
  };
  area?: {
    id: string;
    name: string;
  };
  tags?: Array<{
    count: number;
    name: string;
  }>;
  score: number;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  'release-date'?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'track-count'?: number;
  'cover-art-archive'?: {
    artwork: boolean;
    count: number;
    front: boolean;
    back: boolean;
  };
  'text-representation'?: {
    language: string;
    script: string;
  };
  packaging?: string;
  status?: string;
  'status-id'?: string;
  score?: number;
}

export interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  disambiguation?: string;
  tags?: Array<{
    count: number;
    name: string;
  }>;
  score: number;
}

export async function searchArtists(artistName: string, limit: number = 10): Promise<MusicBrainzArtist[]> {
  try {
    console.log(`🔍 Searching MusicBrainz for artist: ${artistName}`);
    
    const data = await musicBrainzRequest('artist', {
      'query': artistName,
      'limit': limit.toString()
    });
    
    return data.artists || [];
  } catch (error) {
    console.error(`Error searching for artist ${artistName}:`, error);
    return [];
  }
}

export async function getArtistReleaseGroups(artistId: string, limit: number = 100): Promise<MusicBrainzReleaseGroup[]> {
  try {
    console.log(`📀 Getting release groups for artist: ${artistId}`);
    
    const data = await musicBrainzRequest('release-group', {
      'artist': artistId,
      'limit': limit.toString(),
      'inc': 'tags'
    });
    
    return data['release-groups'] || [];
  } catch (error) {
    console.error(`Error getting release groups for artist ${artistId}:`, error);
    return [];
  }
}

export async function getReleaseGroupReleases(releaseGroupId: string): Promise<MusicBrainzRelease[]> {
  try {
    console.log(`💿 Getting releases for release group: ${releaseGroupId}`);
    
    const data = await musicBrainzRequest('release', {
      'release-group': releaseGroupId,
      'inc': 'release-events+labels+discids+recordings',
      'limit': '25'
    });
    
    return data.releases || [];
  } catch (error) {
    console.error(`Error getting releases for release group ${releaseGroupId}:`, error);
    return [];
  }
}

export async function getArtistById(artistId: string): Promise<MusicBrainzArtist | null> {
  try {
    console.log(`👤 Getting artist details: ${artistId}`);
    
    const data = await musicBrainzRequest(`artist/${artistId}`, {
      'inc': 'tags+genres+area+life-span'
    });
    
    return data;
  } catch (error) {
    console.error(`Error getting artist ${artistId}:`, error);
    return null;
  }
}

// Helper function to find the best match artist by name
export async function findBestArtistMatch(artistName: string): Promise<MusicBrainzArtist | null> {
  const artists = await searchArtists(artistName, 5);
  
  if (artists.length === 0) {
    return null;
  }
  
  // Sort by score (MusicBrainz provides relevance score)
  artists.sort((a, b) => b.score - a.score);
  
  // Prefer exact name matches
  const exactMatch = artists.find(artist => 
    artist.name.toLowerCase().trim() === artistName.toLowerCase().trim()
  );
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Return highest scored result
  return artists[0];
}

// Get artist's complete discography with release groups
export async function getArtistDiscography(artistId: string): Promise<{
  releaseGroups: MusicBrainzReleaseGroup[];
  releases: MusicBrainzRelease[];
}> {
  try {
    console.log(`📚 Getting complete discography for artist: ${artistId}`);
    
    const releaseGroups = await getArtistReleaseGroups(artistId);
    const releases: MusicBrainzRelease[] = [];
    
    // For each release group, get the actual releases
    for (const releaseGroup of releaseGroups) {
      const groupReleases = await getReleaseGroupReleases(releaseGroup.id);
      releases.push(...groupReleases);
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`📊 Found ${releaseGroups.length} release groups and ${releases.length} releases`);
    
    return {
      releaseGroups,
      releases
    };
  } catch (error) {
    console.error(`Error getting discography for artist ${artistId}:`, error);
    return {
      releaseGroups: [],
      releases: []
    };
  }
}

// Extract genres from MusicBrainz tags
export function extractGenresFromTags(tags?: Array<{ count: number; name: string }>): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }
  
  // Sort by count (popularity) and take most popular tags
  return tags
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5 tags
    .map(tag => tag.name);
}

// Format release date consistently
export function formatReleaseDate(date?: string): string {
  if (!date) {
    return new Date().toISOString().split('T')[0]; // Default to today
  }
  
  // MusicBrainz dates can be YYYY, YYYY-MM, or YYYY-MM-DD
  const parts = date.split('-');
  
  if (parts.length === 1) {
    // Only year
    return `${parts[0]}-01-01`;
  } else if (parts.length === 2) {
    // Year and month
    return `${parts[0]}-${parts[1]}-01`;
  } else {
    // Full date
    return date;
  }
}

// Test function to verify MusicBrainz connection
export async function testMusicBrainzConnection(): Promise<boolean> {
  try {
    console.log('🔐 Testing MusicBrainz API connection...');
    
    const artists = await searchArtists('The Beatles', 1);
    
    if (artists.length > 0) {
      console.log(`✅ MusicBrainz connected! Found: ${artists[0].name}`);
      return true;
    } else {
      console.log('❌ No results from MusicBrainz');
      return false;
    }
  } catch (error) {
    console.error('❌ MusicBrainz connection failed:', error);
    return false;
  }
}