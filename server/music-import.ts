import { storage } from "./storage";
import type { InsertArtist, InsertRelease } from "@shared/schema";

// Music Import System для RevYou
// Легальный импорт метаданных из открытых источников

interface ImportedRelease {
  artist: string;
  album: string;
  releaseDate: string;
  coverUrl?: string;
  spotifyUrl?: string;
  genres?: string[];
  trackCount?: number;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  country?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
  };
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  'cover-art-archive'?: {
    artwork: boolean;
    front: boolean;
  };
  'media'?: Array<{
    'track-count': number;
  }>;
}

/**
 * MusicBrainz API Client
 * Полностью бесплатный источник музыкальных метаданных
 */
export class MusicBrainzImporter {
  private readonly baseUrl = 'https://musicbrainz.org/ws/2';
  private readonly userAgent = 'RevYou/1.0 (music@revyou.app)';
  
  private async makeRequest(endpoint: string): Promise<any> {
    // Соблюдаем rate limit - 1 запрос в секунду
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`MusicBrainz API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Поиск исполнителя по имени
   */
  async searchArtist(artistName: string): Promise<MusicBrainzArtist | null> {
    try {
      const query = encodeURIComponent(`artist:"${artistName}"`);
      const data = await this.makeRequest(`/artist/?query=${query}&fmt=json&limit=1`);
      
      if (data.artists && data.artists.length > 0) {
        return data.artists[0];
      }
      return null;
    } catch (error) {
      console.error('Error searching artist:', error);
      return null;
    }
  }
  
  /**
   * Получение всех релизов исполнителя
   */
  async getArtistReleases(artistMbid: string): Promise<MusicBrainzRelease[]> {
    try {
      const data = await this.makeRequest(`/release-group/?artist=${artistMbid}&type=album&fmt=json&limit=100`);
      
      if (data['release-groups']) {
        // Получаем детали каждого релиза
        const releases: MusicBrainzRelease[] = [];
        
        for (const group of data['release-groups']) {
          const releaseData = await this.makeRequest(`/release?release-group=${group.id}&fmt=json&limit=1&inc=media`);
          if (releaseData.releases && releaseData.releases.length > 0) {
            releases.push(releaseData.releases[0]);
          }
        }
        
        return releases;
      }
      return [];
    } catch (error) {
      console.error('Error getting artist releases:', error);
      return [];
    }
  }
  
  /**
   * Получение URL обложки альбома
   */
  async getCoverArtUrl(releaseMbid: string): Promise<string | null> {
    try {
      // Cover Art Archive API - также бесплатный
      const response = await fetch(`https://coverartarchive.org/release/${releaseMbid}/front-500`);
      if (response.ok) {
        return response.url;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Импорт релизов исполнителя в нашу БД
   */
  async importArtistReleases(artistName: string): Promise<ImportedRelease[]> {
    console.log(`🎵 Импорт релизов: ${artistName}`);
    
    // 1. Найти исполнителя
    const artist = await this.searchArtist(artistName);
    if (!artist) {
      console.log(`❌ Исполнитель не найден: ${artistName}`);
      return [];
    }
    
    console.log(`✅ Найден исполнитель: ${artist.name} (${artist.id})`);
    
    // 2. Получить все релизы
    const releases = await this.getArtistReleases(artist.id);
    console.log(`📀 Найдено релизов: ${releases.length}`);
    
    // 3. Обработать каждый релиз
    const importedReleases: ImportedRelease[] = [];
    
    for (const release of releases) {
      try {
        // Получить обложку
        const coverUrl = await this.getCoverArtUrl(release.id);
        
        const importedRelease: ImportedRelease = {
          artist: artist.name,
          album: release.title,
          releaseDate: release.date || new Date().toISOString(),
          coverUrl: coverUrl || undefined,
          trackCount: release.media?.[0]?.['track-count']
        };
        
        importedReleases.push(importedRelease);
        console.log(`💽 Импортирован: ${release.title}`);
        
      } catch (error) {
        console.error(`❌ Ошибка импорта релиза ${release.title}:`, error);
      }
    }
    
    return importedReleases;
  }

  /**
   * Поиск релизов по году выпуска
   */
  async getReleasesByYear(year: number): Promise<MusicBrainzRelease[]> {
    try {
      console.log(`🔍 Поиск релизов за ${year} год...`);
      
      // Поиск популярных релизов за определенный год
      const query = `date:${year} AND type:album`;
      const data = await this.makeRequest(`/release/?query=${encodeURIComponent(query)}&fmt=json&limit=50`);
      
      if (data.releases && data.releases.length > 0) {
        console.log(`📀 Найдено ${data.releases.length} релизов за ${year} год`);
        return data.releases.filter((release: any) => 
          release.date && release.date.includes(year.toString())
        );
      }
      
      return [];
    } catch (error) {
      console.error(`Error getting releases by year ${year}:`, error);
      return [];
    }
  }

  /**
   * Получить информацию об исполнителе по ID релиза
   */
  async getArtistFromRelease(releaseMbid: string): Promise<MusicBrainzArtist | null> {
    try {
      const data = await this.makeRequest(`/release/${releaseMbid}?fmt=json&inc=artists`);
      
      if (data['artist-credit'] && data['artist-credit'].length > 0) {
        return data['artist-credit'][0].artist;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting artist from release:', error);
      return null;
    }
  }

  /**
   * Импорт релизов по году выпуска
   */
  async importReleasesByYear(year: number): Promise<ImportedRelease[]> {
    console.log(`📅 Импорт релизов ${year} года...`);
    
    // 1. Получить релизы за указанный год
    const releases = await this.getReleasesByYear(year);
    console.log(`📀 Найдено релизов: ${releases.length}`);
    
    if (releases.length === 0) {
      return [];
    }
    
    // 2. Обработать каждый релиз
    const importedReleases: ImportedRelease[] = [];
    
    for (const release of releases) {
      try {
        // Получить информацию об исполнителе
        const artist = await this.getArtistFromRelease(release.id);
        if (!artist) {
          console.log(`⚠️ Не найден исполнитель для релиза: ${release.title}`);
          continue;
        }
        
        // Получить обложку
        const coverUrl = await this.getCoverArtUrl(release.id);
        
        const importedRelease: ImportedRelease = {
          artist: artist.name,
          album: release.title,
          releaseDate: release.date || `${year}-01-01`,
          coverUrl: coverUrl || undefined,
          trackCount: release.media?.[0]?.['track-count']
        };
        
        importedReleases.push(importedRelease);
        console.log(`💽 Импортирован: ${artist.name} - ${release.title}`);
        
      } catch (error) {
        console.error(`❌ Ошибка импорта релиза ${release.title}:`, error);
      }
    }
    
    return importedReleases;
  }
}

/**
 * Сервис массового импорта
 */
export class MassImportService {
  private musicBrainz = new MusicBrainzImporter();
  
  /**
   * Импорт нескольких исполнителей
   */
  async importArtists(artistNames: string[]): Promise<{ success: number; errors: string[] }> {
    let successCount = 0;
    const errors: string[] = [];
    
    for (const artistName of artistNames) {
      try {
        // 1. Импортировать релизы из MusicBrainz
        const releases = await this.musicBrainz.importArtistReleases(artistName);
        
        // 2. Сохранить в нашу БД
        for (const release of releases) {
          await this.saveReleaseToDatabase(release);
        }
        
        successCount += releases.length;
        console.log(`✅ Успешно импортировано ${releases.length} релизов для ${artistName}`);
        
      } catch (error) {
        const errorMsg = `Ошибка импорта ${artistName}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    return { success: successCount, errors };
  }

  /**
   * Импорт релизов по годам выпуска
   */
  async importByYears(years: number[]): Promise<{ success: number; errors: string[] }> {
    let successCount = 0;
    const errors: string[] = [];
    
    for (const year of years) {
      try {
        console.log(`🗓️ Импорт релизов ${year} года...`);
        
        // 1. Получить релизы из MusicBrainz по году
        const releases = await this.musicBrainz.importReleasesByYear(year);
        
        // 2. Сохранить в нашу БД
        for (const release of releases) {
          await this.saveReleaseToDatabase(release);
        }
        
        successCount += releases.length;
        console.log(`✅ Успешно импортировано ${releases.length} релизов за ${year} год`);
        
      } catch (error) {
        const errorMsg = `Ошибка импорта за ${year} год: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    return { success: successCount, errors };
  }
  
  /**
   * Сохранение релиза в БД
   */
  private async saveReleaseToDatabase(release: ImportedRelease): Promise<void> {
    try {
      // Создать или найти исполнителя
      let artist = await storage.getArtistByName(release.artist);
      if (!artist) {
        const artistData: InsertArtist = {
          name: release.artist,
        };
        artist = await storage.createArtist(artistData);
      }
      
      // Проверить, есть ли уже такой релиз
      const existingRelease = await storage.getReleaseByTitleAndArtist(release.album, artist.id);
      if (existingRelease) {
        console.log(`⚠️ Релиз уже существует: ${release.album}`);
        return;
      }
      
      // Создать новый релиз
      const releaseData: InsertRelease = {
        artistId: artist.id,
        title: release.album,
        releaseDate: new Date(release.releaseDate),
        coverUrl: release.coverUrl || null,
        streamingLinks: release.spotifyUrl ? {
          spotify: release.spotifyUrl,
          appleMusic: null
        } : null,
        type: 'album'
      };
      
      await storage.createRelease(releaseData);
      console.log(`💾 Сохранен релиз: ${release.album}`);
      
    } catch (error) {
      console.error(`❌ Ошибка сохранения ${release.album}:`, error);
      throw error;
    }
  }
  
  /**
   * Получить статистику импорта
   */
  async getImportStats(): Promise<{ totalReleases: number; totalArtists: number }> {
    const releases = await storage.getReleases({});
    const artists = await storage.getArtists();
    
    return {
      totalReleases: releases.length,
      totalArtists: artists.length
    };
  }
}

// Экспорт для использования в роутах
export const massImportService = new MassImportService();