// Комбинированный музыкальный API клиент
// Deezer API (основной) + iTunes API (fallback)
// Максимальное покрытие российских и международных артистов

// Интерфейсы для унифицированных данных
export interface UnifiedArtist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  popularity?: number;
  source: 'deezer' | 'itunes';
}

export interface UnifiedAlbum {
  id: string;
  title: string;
  releaseDate?: string;
  albumType: 'album' | 'single' | 'compilation';
  trackCount?: number;
  imageUrl?: string;
  coverSmall?: string;
  coverMedium?: string;
  coverBig?: string;
  coverXl?: string;
  duration?: number; // общая длительность в секундах
  explicitLyrics?: boolean;
  explicitContentLyrics?: number; // 0-4
  explicitContentCover?: number; // 0-4
  genres?: any[]; // массив жанров
  upc?: string; // UPC код
  label?: string; // лейбл звукозаписи
  contributors?: any[]; // участники
  source: 'deezer' | 'itunes';
}

// Deezer API клиент
class DeezerAPIClient {
  private readonly baseUrl = 'https://api.deezer.com';
  
  async searchArtist(artistName: string): Promise<UnifiedArtist | null> {
    try {
      console.log(`🟡 Deezer: Ищем артиста "${artistName}"`);
      
      const response = await fetch(`${this.baseUrl}/search/artist?q=${encodeURIComponent(artistName)}&limit=1`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        console.log(`🟡 Deezer: Артист "${artistName}" не найден`);
        return null;
      }
      
      const artist = data.data[0];
      
      console.log(`🟡 Deezer: Найден "${artist.name}" (ID: ${artist.id})`);
      
      return {
        id: artist.id.toString(),
        name: artist.name,
        imageUrl: artist.picture_medium || artist.picture,
        genres: artist.genres || [],
        popularity: artist.nb_fan || 0,
        followers: artist.nb_fan || 0,
        source: 'deezer'
      };
      
    } catch (error) {
      console.error(`🟡 Deezer error для "${artistName}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }
  
  async getArtistAlbums(artistId: string): Promise<UnifiedAlbum[]> {
    try {
      console.log(`🟡 Deezer: Получаем альбомы для артиста ${artistId}`);
      
      // Основной запрос альбомов с максимальным лимитом
      const response = await fetch(`${this.baseUrl}/artist/${artistId}/albums?limit=500`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const albums: UnifiedAlbum[] = [];
      
      if (data.data) {
        // Получаем детальную информацию для каждого альбома
        const albumPromises = data.data.map(async (album: any) => {
          try {
            const albumDetailResponse = await fetch(`${this.baseUrl}/album/${album.id}`);
            if (albumDetailResponse.ok) {
              const albumDetail = await albumDetailResponse.json();
              return {
                id: album.id.toString(),
                title: album.title,
                releaseDate: album.release_date,
                albumType: this.mapDeezerAlbumType(album.record_type),
                trackCount: album.nb_tracks,
                imageUrl: album.cover_medium || album.cover,
                coverSmall: album.cover_small,
                coverMedium: album.cover_medium,
                coverBig: album.cover_big,
                coverXl: album.cover_xl,
                duration: albumDetail.duration,
                explicitLyrics: albumDetail.explicit_lyrics || false,
                explicitContentLyrics: albumDetail.explicit_content_lyrics || 0,
                explicitContentCover: albumDetail.explicit_content_cover || 0,
                genres: albumDetail.genres?.data || [],
                upc: albumDetail.upc,
                label: albumDetail.label,
                contributors: albumDetail.contributors || [],
                tracks: albumDetail.tracks?.data || [],
                source: 'deezer' as const
              };
            }
          } catch (error) {
            console.log(`🟡 Deezer: Не удалось получить детали альбома ${album.id}`);
          }
          
          // Fallback к базовой информации
          return {
            id: album.id.toString(),
            title: album.title,
            releaseDate: album.release_date,
            albumType: this.mapDeezerAlbumType(album.record_type),
            trackCount: album.nb_tracks,
            imageUrl: album.cover_medium || album.cover,
            coverSmall: album.cover_small,
            coverMedium: album.cover_medium,
            coverBig: album.cover_big,
            coverXl: album.cover_xl,
            source: 'deezer' as const
          };
        });
        
        const albumResults = await Promise.all(albumPromises);
        albums.push(...albumResults.filter(Boolean));
      }
      
      // Дополнительный поиск последних релизов через search API
      try {
        const artistResponse = await fetch(`${this.baseUrl}/artist/${artistId}`);
        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          const artistName = artistData.name;
          
          // Поиск последних релизов через search API
          const searchResponse = await fetch(`${this.baseUrl}/search/album?q=artist:"${encodeURIComponent(artistName)}"&limit=50`);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.data) {
              const existingIds = new Set(albums.map(a => a.id));
              
              // Добавляем найденные альбомы, которых еще нет
              const additionalAlbums = searchData.data
                .filter((album: any) => album.artist && album.artist.id.toString() === artistId && !existingIds.has(album.id.toString()));
              
              // Получаем детальную информацию для дополнительных альбомов
              const additionalPromises = additionalAlbums.map(async (album: any) => {
                try {
                  const albumDetailResponse = await fetch(`${this.baseUrl}/album/${album.id}`);
                  if (albumDetailResponse.ok) {
                    const albumDetail = await albumDetailResponse.json();
                    return {
                      id: album.id.toString(),
                      title: album.title,
                      releaseDate: album.release_date,
                      albumType: this.mapDeezerAlbumType(album.record_type),
                      trackCount: album.nb_tracks,
                      imageUrl: album.cover_medium || album.cover,
                      coverSmall: album.cover_small,
                      coverMedium: album.cover_medium,
                      coverBig: album.cover_big,
                      coverXl: album.cover_xl,
                      duration: albumDetail.duration,
                      explicitLyrics: albumDetail.explicit_lyrics || false,
                      explicitContentLyrics: albumDetail.explicit_content_lyrics || 0,
                      explicitContentCover: albumDetail.explicit_content_cover || 0,
                      genres: albumDetail.genres?.data || [],
                      upc: albumDetail.upc,
                      label: albumDetail.label,
                      contributors: albumDetail.contributors || [],
                      source: 'deezer' as const
                    };
                  }
                } catch (error) {
                  console.log(`🟡 Deezer: Не удалось получить детали дополнительного альбома ${album.id}`);
                }
                
                // Fallback к базовой информации
                return {
                  id: album.id.toString(),
                  title: album.title,
                  releaseDate: album.release_date,
                  albumType: this.mapDeezerAlbumType(album.record_type),
                  trackCount: album.nb_tracks,
                  imageUrl: album.cover_medium || album.cover,
                  coverSmall: album.cover_small,
                  coverMedium: album.cover_medium,
                  coverBig: album.cover_big,
                  coverXl: album.cover_xl,
                  source: 'deezer' as const
                };
              });
              
              const additionalResults = await Promise.all(additionalPromises);
              albums.push(...additionalResults.filter(Boolean));
            }
          }
        }
      } catch (searchError) {
        console.log(`🟡 Deezer: Дополнительный поиск не удался для артиста ${artistId}`);
      }
      
      // Удаляем дубликаты и сортируем по дате выхода
      const uniqueAlbums = albums.filter((album, index, self) => 
        index === self.findIndex(a => a.id === album.id)
      ).sort((a, b) => new Date(b.releaseDate || '1900-01-01').getTime() - new Date(a.releaseDate || '1900-01-01').getTime());
      
      console.log(`🟡 Deezer: Найдено ${uniqueAlbums.length} уникальных альбомов`);
      return uniqueAlbums;
      
    } catch (error) {
      console.error(`🟡 Deezer error при получении альбомов для ${artistId}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }
  
  private mapDeezerAlbumType(recordType?: string): 'album' | 'single' | 'compilation' {
    if (!recordType) return 'album';
    
    const type = recordType.toLowerCase();
    if (type.includes('single') || type.includes('ep')) return 'single';
    if (type.includes('compilation') || type.includes('best')) return 'compilation';
    return 'album';
  }
}

// iTunes API клиент
class ITunesAPIClient {
  private readonly baseUrl = 'https://itunes.apple.com';
  
  async searchArtist(artistName: string): Promise<UnifiedArtist | null> {
    try {
      console.log(`🍎 iTunes: Ищем артиста "${artistName}"`);
      
      const response = await fetch(
        `${this.baseUrl}/search?term=${encodeURIComponent(artistName)}&entity=allArtist&attribute=allArtistTerm&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.log(`🍎 iTunes: Артист "${artistName}" не найден`);
        return null;
      }
      
      const artist = data.results[0];
      
      console.log(`🍎 iTunes: Найден "${artist.artistName}" (ID: ${artist.artistId})`);
      
      return {
        id: artist.artistId.toString(),
        name: artist.artistName,
        genres: artist.primaryGenreName ? [artist.primaryGenreName] : undefined,
        source: 'itunes'
      };
      
    } catch (error) {
      console.error(`🍎 iTunes error для "${artistName}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }
  
  async getArtistAlbums(artistId: string): Promise<UnifiedAlbum[]> {
    try {
      console.log(`🍎 iTunes: Получаем альбомы для артиста ${artistId}`);
      
      const response = await fetch(
        `${this.baseUrl}/lookup?id=${artistId}&entity=album&limit=200`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length <= 1) {
        return [];
      }
      
      // Первый результат - это информация об артисте, остальные - альбомы
      const albums: UnifiedAlbum[] = data.results.slice(1).map((album: any) => ({
        id: album.collectionId.toString(),
        title: album.collectionName,
        releaseDate: album.releaseDate ? album.releaseDate.split('T')[0] : undefined,
        albumType: this.mapItunesAlbumType(album.collectionType),
        trackCount: album.trackCount,
        imageUrl: album.artworkUrl100 || album.artworkUrl60,
        source: 'itunes' as const
      }));
      
      console.log(`🍎 iTunes: Найдено ${albums.length} альбомов`);
      return albums;
      
    } catch (error) {
      console.error(`🍎 iTunes error при получении альбомов для ${artistId}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }
  
  // Поиск конкретного релиза для получения даты выхода
  async searchReleaseDate(artistName: string, releaseTitle: string): Promise<string | null> {
    try {
      console.log(`🍎 iTunes: Ищем дату для "${releaseTitle}" от "${artistName}"`);
      
      const query = `${artistName} ${releaseTitle}`;
      const response = await fetch(
        `${this.baseUrl}/search?term=${encodeURIComponent(query)}&entity=album&limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.log(`🍎 iTunes: Релиз "${releaseTitle}" не найден`);
        return null;
      }
      
      // Ищем наиболее подходящий результат
      const bestMatch = data.results.find((album: any) => {
        const titleMatch = album.collectionName?.toLowerCase().includes(releaseTitle.toLowerCase()) ||
                          releaseTitle.toLowerCase().includes(album.collectionName?.toLowerCase());
        const artistMatch = album.artistName?.toLowerCase().includes(artistName.toLowerCase()) ||
                           artistName.toLowerCase().includes(album.artistName?.toLowerCase());
        return titleMatch && artistMatch;
      });
      
      if (bestMatch && bestMatch.releaseDate) {
        const releaseDate = bestMatch.releaseDate.split('T')[0];
        console.log(`🍎 iTunes: Найдена дата "${releaseDate}" для "${releaseTitle}"`);
        return releaseDate;
      }
      
      console.log(`🍎 iTunes: Подходящий релиз не найден`);
      return null;
      
    } catch (error) {
      console.error(`🍎 iTunes error при поиске даты для "${releaseTitle}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private mapItunesAlbumType(collectionType?: string): 'album' | 'single' | 'compilation' {
    if (!collectionType) return 'album';
    
    const type = collectionType.toLowerCase();
    if (type.includes('single') || type.includes('ep')) return 'single';
    if (type.includes('compilation')) return 'compilation';
    return 'album';
  }
}

// Основной комбинированный клиент
export class CombinedMusicAPI {
  private deezer = new DeezerAPIClient();
  private itunes = new ITunesAPIClient();
  
  // Поиск артиста с приоритетом Deezer
  async findArtist(artistName: string): Promise<{
    artist: UnifiedArtist;
    albums: UnifiedAlbum[];
  } | null> {
    console.log(`🎵 Комбинированный поиск: "${artistName}"`);
    
    // Сначала пробуем Deezer (основной источник)
    let artist = await this.deezer.searchArtist(artistName);
    let albums: UnifiedAlbum[] = [];
    
    if (artist) {
      console.log(`🔍 DEBUG: Deezer нашел артиста:`, JSON.stringify(artist, null, 2));
      albums = await this.deezer.getArtistAlbums(artist.id);
      
      if (albums.length > 0) {
        console.log(`✅ Deezer успешно: ${albums.length} альбомов для "${artist.name}"`);
        console.log(`🔍 DEBUG: Возвращаем результат:`, JSON.stringify({ artist, albums }, null, 2));
        return { artist, albums };
      } else {
        console.log(`⚠️ Deezer: найден артист, но нет альбомов. Пробуем iTunes...`);
      }
    }
    
    // Fallback к iTunes API только если Deezer не дал результатов
    artist = await this.itunes.searchArtist(artistName);
    
    if (artist) {
      albums = await this.itunes.getArtistAlbums(artist.id);
      
      if (albums.length > 0) {
        console.log(`✅ iTunes успешно: ${albums.length} альбомов для "${artist.name}"`);
        return { artist, albums };
      } else {
        console.log(`⚠️ iTunes: найден артист, но нет альбомов`);
        // Возвращаем артиста без альбомов
        return { artist, albums: [] };
      }
    }
    
    console.log(`❌ Артист "${artistName}" не найден ни в одном API`);
    return null;
  }

  // Поиск релизов в iTunes для уточнения дат (только для релизов без даты)
  async findReleasesForDateUpdate(artistName: string, releasesWithoutDate: UnifiedAlbum[]): Promise<UnifiedAlbum[]> {
    if (releasesWithoutDate.length === 0) {
      return [];
    }

    console.log(`🍎 iTunes: Ищем даты для ${releasesWithoutDate.length} релизов без даты`);
    
    try {
      // Ищем артиста в iTunes
      const artist = await this.itunes.searchArtist(artistName);
      if (!artist) {
        console.log(`🍎 iTunes: Артист "${artistName}" не найден для уточнения дат`);
        return [];
      }

      // Получаем все альбомы артиста из iTunes
      const itunesAlbums = await this.itunes.getArtistAlbums(artist.id);
      
      // Сопоставляем релизы по названию (нормализованному)
      const updatedReleases: UnifiedAlbum[] = [];
      
      for (const release of releasesWithoutDate) {
        const normalizedTitle = this.normalizeTitle(release.title);
        
        // Ищем соответствующий релиз в iTunes
        const matchingItunesAlbum = itunesAlbums.find(album => 
          this.normalizeTitle(album.title) === normalizedTitle
        );
        
        if (matchingItunesAlbum && matchingItunesAlbum.releaseDate) {
          console.log(`🍎 iTunes: Найдена дата для "${release.title}": ${matchingItunesAlbum.releaseDate}`);
          updatedReleases.push({
            ...release,
            releaseDate: matchingItunesAlbum.releaseDate
          });
        } else {
          console.log(`🍎 iTunes: Дата не найдена для "${release.title}"`);
          updatedReleases.push(release);
        }
      }
      
      return updatedReleases;
      
    } catch (error) {
      console.error(`🍎 iTunes error при поиске дат:`, error);
      return releasesWithoutDate;
    }
  }

  // Нормализация названия для сопоставления
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s*-\s*single\s*$/i, '')
      .replace(/\s*-\s*ep\s*$/i, '')
      .replace(/\s*-\s*album\s*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Пакетный поиск артистов
  async findMultipleArtists(artistNames: string[]): Promise<{
    successful: Array<{ artist: UnifiedArtist; albums: UnifiedAlbum[] }>;
    failed: string[];
  }> {
    console.log(`🎵 Пакетный поиск ${artistNames.length} артистов...`);
    
    const successful: Array<{ artist: UnifiedArtist; albums: UnifiedAlbum[] }> = [];
    const failed: string[] = [];
    
    for (const artistName of artistNames) {
      try {
        const result = await this.findArtist(artistName);
        
        if (result) {
          successful.push(result);
        } else {
          failed.push(artistName);
        }
        
        // Пауза между запросами для уважения к API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Ошибка при поиске "${artistName}":`, error);
        failed.push(artistName);
      }
    }
    
    console.log(`📊 Пакетный поиск завершен: ${successful.length} успешно, ${failed.length} неудачно`);
    
    return { successful, failed };
  }
  
  // Поиск даты релиза через iTunes (fallback для пропущенных дат)
  async findReleaseDate(artistName: string, releaseTitle: string): Promise<string | null> {
    return await this.itunes.searchReleaseDate(artistName, releaseTitle);
  }

  // Тест доступности API
  async testAPIs(): Promise<{ deezer: boolean; itunes: boolean }> {
    console.log('🧪 Тестируем доступность музыкальных API...');
    
    const testArtist = 'The Beatles';
    
    // Тест Deezer
    let deezerWorks = false;
    try {
      const deezerResult = await this.deezer.searchArtist(testArtist);
      deezerWorks = deezerResult !== null;
    } catch (error) {
      console.error('🟡 Deezer недоступен:', error instanceof Error ? error.message : String(error));
    }
    
    // Тест iTunes
    let itunesWorks = false;
    try {
      const itunesResult = await this.itunes.searchArtist(testArtist);
      itunesWorks = itunesResult !== null;
    } catch (error) {
      console.error('🍎 iTunes недоступен:', error instanceof Error ? error.message : String(error));
    }
    
    console.log(`🧪 Результаты тестов: Deezer: ${deezerWorks ? '✅' : '❌'}, iTunes: ${itunesWorks ? '✅' : '❌'}`);
    
    return { deezer: deezerWorks, itunes: itunesWorks };
  }
}

// Экспорт единственного экземпляра
export const musicAPI = new CombinedMusicAPI();

// Статистика для мониторинга
export interface APIStats {
  totalSearches: number;
  deezerSuccess: number;
  itunesSuccess: number;
  totalFailed: number;
  averageAlbumsPerArtist: number;
}

class APIStatsTracker {
  private stats: APIStats = {
    totalSearches: 0,
    deezerSuccess: 0,
    itunesSuccess: 0,
    totalFailed: 0,
    averageAlbumsPerArtist: 0
  };
  
  recordSearch(source: 'deezer' | 'itunes' | 'failed', albumCount: number = 0) {
    this.stats.totalSearches++;
    
    if (source === 'deezer') {
      this.stats.deezerSuccess++;
    } else if (source === 'itunes') {
      this.stats.itunesSuccess++;
    } else {
      this.stats.totalFailed++;
    }
    
    // Обновляем среднее количество альбомов
    const totalSuccessful = this.stats.deezerSuccess + this.stats.itunesSuccess;
    if (totalSuccessful > 0) {
      this.stats.averageAlbumsPerArtist = 
        (this.stats.averageAlbumsPerArtist * (totalSuccessful - 1) + albumCount) / totalSuccessful;
    }
  }
  
  getStats(): APIStats {
    return { ...this.stats };
  }
  
  reset() {
    this.stats = {
      totalSearches: 0,
      deezerSuccess: 0,
      itunesSuccess: 0,
      totalFailed: 0,
      averageAlbumsPerArtist: 0
    };
  }
}

export const apiStatsTracker = new APIStatsTracker();