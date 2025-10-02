// Универсальный парсер российских музыкальных сервисов
// Поддерживает MTS Music плейлисты и чарты
// Извлекает артистов для дальнейшего поиска через Deezer/iTunes API

import * as cheerio from 'cheerio';

// Интерфейс для результата парсинга
export interface ParsedTrack {
  artist: string;
  title: string;
  position?: number;
  artistMtsId?: string; // ID артиста в MTS Music
  artists?: Array<{ name: string; mtsId?: string }>; // Множественные артисты
}

export interface PlaylistParseResult {
  name: string;
  description?: string;
  tracks: ParsedTrack[];
  uniqueArtists: string[];
}

// Старый интерфейс для обратной совместимости
export interface RussianTrack {
  artist: string;
  title: string;
  duration?: string;
  album?: string;
  year?: string;
}

// Базовый парсер для российских сервисов
abstract class RussianMusicParser {
  abstract serviceName: string;
  abstract baseUrl: string;
  
  // Очистка имени артиста от лишних символов
  protected cleanArtistName(artist: string): string {
    return artist
      .trim()
      .replace(/^feat\.?\s*/i, '') // Убираем "feat" в начале
      .replace(/\s*feat\.?\s*.+$/i, '') // Убираем всё после "feat"
      .replace(/\s*\(.*\)$/, '') // Убираем скобки в конце
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .trim();
  }
  
  // Получение уникальных артистов из треков
  protected extractUniqueArtists(tracks: ParsedTrack[]): string[] {
    const artistSet = new Set<string>();
    
    for (const track of tracks) {
      // Если есть массив artists, используем его
      if (track.artists && track.artists.length > 0) {
        track.artists.forEach(artist => {
          if (artist.name && artist.name.length > 1) {
            artistSet.add(artist.name);
          }
        });
      } else {
        // Иначе используем старый способ
        const cleanedArtist = this.cleanArtistName(track.artist);
        
        if (cleanedArtist && cleanedArtist.length > 1) {
          artistSet.add(cleanedArtist);
          
          // Обрабатываем коллаборации (feat, &, ,)
          const collaborators = this.extractCollaborators(cleanedArtist);
          collaborators.forEach(collaborator => {
            if (collaborator.length > 1) {
              artistSet.add(collaborator);
            }
          });
        }
      }
    }
    
    return Array.from(artistSet).sort();
  }
  
  // Извлечение коллабораторов из имени артиста
  protected extractCollaborators(artistName: string): string[] {
    const separators = [' feat. ', ' feat ', ' ft. ', ' ft ', ' & ', ', ', ' x ', ' X '];
    let artists = [artistName];
    
    for (const separator of separators) {
      artists = artists.flatMap(artist => 
        artist.split(separator).map(a => this.cleanArtistName(a))
      );
    }
    
    return artists.filter(artist => artist && artist.length > 1);
  }
  
  // Извлечение MTS Music ID из URL
  protected extractMtsIdFromUrl(url: string): string {
    const match = url.match(/\/artist\/(\d+)/);
    return match ? match[1] : '';
  }
  
  // Сопоставление имен артистов с MTS ID из ссылок
  protected matchArtistsWithMtsIds(
    collaborators: string[], 
    artistElement: cheerio.Cheerio<any>, 
    $: cheerio.CheerioAPI
  ): Array<{ name: string; mtsId?: string }> {
    const artists: Array<{ name: string; mtsId?: string }> = [];
    
    // Ищем все ссылки в элементе артиста
    const artistLinks = artistElement.find('a');
    const linkData: Array<{ text: string; mtsId: string }> = [];
    
    artistLinks.each((_, link) => {
      const linkElement = $(link);
      const href = linkElement.attr('href');
      const text = linkElement.text().trim();
      
      if (href && text) {
        const mtsId = this.extractMtsIdFromUrl(href);
        if (mtsId) {
          linkData.push({ text: this.cleanArtistName(text), mtsId });
        }
      }
    });
    
    // Сопоставляем имена артистов с найденными ссылками
    for (const collaborator of collaborators) {
      const cleanName = this.cleanArtistName(collaborator);
      const matchingLink = linkData.find(link => 
        link.text.toLowerCase() === cleanName.toLowerCase() ||
        link.text.toLowerCase().includes(cleanName.toLowerCase()) ||
        cleanName.toLowerCase().includes(link.text.toLowerCase())
      );
      
      artists.push({
        name: cleanName,
        mtsId: matchingLink?.mtsId || ''
      });
    }
    
    return artists;
  }
  
  abstract parsePlaylist(url: string): Promise<PlaylistParseResult>;
}

// Парсер MTS Music
export class MTSMusicParser extends RussianMusicParser {
  serviceName = 'MTS Music';
  baseUrl = 'https://music.mts.ru';
  
  async parsePlaylist(url: string): Promise<PlaylistParseResult> {
    console.log(`🎵 MTS Music: Парсим плейлист ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Пытаемся определить тип страницы и извлечь данные
      let result: PlaylistParseResult;
      
      if (this.isChartPage(url)) {
        result = this.parseChart($, url);
      } else {
        result = this.parsePlaylistPage($, url);
      }
      
      console.log(`🎵 MTS Music: Найдено ${result.tracks.length} треков, ${result.uniqueArtists.length} уникальных артистов`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ MTS Music парсинг error для ${url}:`, error instanceof Error ? error.message : String(error));
      
      return {
        name: 'Ошибка парсинга',
        tracks: [],
        uniqueArtists: []
      };
    }
  }
  
  // Проверка, является ли URL чартом
  private isChartPage(url: string): boolean {
    return url.includes('/chart') || url.includes('/top') || url.includes('/hit');
  }
  
  // Парсинг страницы чарта
  private parseChart($: cheerio.CheerioAPI, url: string): PlaylistParseResult {
    console.log('📊 Парсим как чарт...');
    
    const tracks: ParsedTrack[] = [];
    
    // Возможные селекторы для треков в чарте
    const trackSelectors = [
      '.track-item', '.chart-item', '.song-item', '.music-item',
      '[class*="track"]', '[class*="song"]', '[class*="chart"]'
    ];
    
    let tracksFound = false;
    
    for (const selector of trackSelectors) {
      const trackElements = $(selector);
      
      if (trackElements.length > 0) {
        console.log(`📊 Найдены треки с селектором: ${selector} (${trackElements.length} элементов)`);
        
        trackElements.each((index, element) => {
          const track = this.extractTrackFromElement($, $(element), index + 1);
          if (track) {
            tracks.push(track);
          }
        });
        
        tracksFound = true;
        break;
      }
    }
    
    // Если не нашли треки стандартными селекторами, пробуем JSON-LD
    if (!tracksFound) {
      const jsonLdTracks = this.extractTracksFromJsonLd($);
      tracks.push(...jsonLdTracks);
    }
    
    const playlistName = this.extractChartName($) || 'Чарт MTS Music';
    
    return {
      name: playlistName,
      description: `Чарт с ${tracks.length} треками`,
      tracks,
      uniqueArtists: this.extractUniqueArtists(tracks)
    };
  }
  
  // Парсинг обычного плейлиста
  private parsePlaylistPage($: cheerio.CheerioAPI, url: string): PlaylistParseResult {
    console.log('🎵 Парсим как плейлист...');
    
    const tracks: ParsedTrack[] = [];
    
    // Селекторы для плейлистов
    const playlistSelectors = [
      '.playlist-track', '.track', '.song', '.music-track',
      '[class*="playlist"] [class*="track"]',
      '[class*="playlist"] [class*="song"]'
    ];
    
    let tracksFound = false;
    
    for (const selector of playlistSelectors) {
      const trackElements = $(selector);
      
      if (trackElements.length > 0) {
        console.log(`🎵 Найдены треки с селектором: ${selector} (${trackElements.length} элементов)`);
        
        trackElements.each((index, element) => {
          const track = this.extractTrackFromElement($, $(element), index + 1);
          if (track) {
            tracks.push(track);
          }
        });
        
        tracksFound = true;
        break;
      }
    }
    
    // Попытка через JSON-LD
    if (!tracksFound) {
      const jsonLdTracks = this.extractTracksFromJsonLd($);
      tracks.push(...jsonLdTracks);
    }
    
    const playlistName = this.extractPlaylistName($) || 'Плейлист MTS Music';
    const description = this.extractPlaylistDescription($);
    
    return {
      name: playlistName,
      description,
      tracks,
      uniqueArtists: this.extractUniqueArtists(tracks)
    };
  }
  
  // Извлечение информации о треке из DOM элемента
  private extractTrackFromElement($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, position: number): ParsedTrack | null {
    try {
      // Возможные селекторы для артиста
      const artistSelectors = [
        '.artist', '.track-artist', '.song-artist', '.performer',
        '[class*="artist"]', '[class*="performer"]',
        '.track-info .artist', '.song-info .artist'
      ];
      
      // Возможные селекторы для названия
      const titleSelectors = [
        '.title', '.track-title', '.song-title', '.track-name', '.song-name',
        '[class*="title"]', '[class*="name"]',
        '.track-info .title', '.song-info .title'
      ];
      
      let artist = '';
      let title = '';
      let artistMtsId = '';
      let artists: Array<{ name: string; mtsId?: string }> = [];
      
      // Ищем артиста с ссылками
      for (const selector of artistSelectors) {
        const artistElement = element.find(selector).first();
        if (artistElement.length > 0) {
          artist = artistElement.text().trim();
          
          // Ищем все ссылки на артистов в этом элементе
          const artistLinks = artistElement.find('a');
          const artistMtsIds: string[] = [];
          
          artistLinks.each((_, link) => {
            const href = $(link).attr('href');
            if (href) {
              const mtsId = this.extractMtsIdFromUrl(href);
              if (mtsId) {
                artistMtsIds.push(mtsId);
              }
            }
          });
          
          // Если есть ссылки, используем первую как основную
          if (artistMtsIds.length > 0) {
            artistMtsId = artistMtsIds[0];
          }
          
          break;
        }
      }
      
      // Ищем название
      for (const selector of titleSelectors) {
        const titleElement = element.find(selector).first();
        if (titleElement.length > 0) {
          title = titleElement.text().trim();
          break;
        }
      }
      
      // Альтернативный способ - ищем в атрибутах data-*
      if (!artist || !title) {
        const dataArtist = element.attr('data-artist') || element.find('[data-artist]').first().attr('data-artist');
        const dataTitle = element.attr('data-title') || element.find('[data-title]').first().attr('data-title');
        
        if (dataArtist) artist = dataArtist;
        if (dataTitle) title = dataTitle;
      }
      
      // Если все еще не нашли, пробуем распарсить из общего текста
      if (!artist || !title) {
        const fullText = element.text().trim();
        const match = fullText.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        
        if (match) {
          artist = match[1].trim();
          title = match[2].trim();
        }
      }
      
      if (artist && title) {
        // Обрабатываем множественных артистов
        const collaborators = this.extractCollaborators(artist);
        if (collaborators.length > 1) {
          // Пытаемся сопоставить имена артистов с MTS ID
          // Находим элемент артиста заново для сопоставления
          let artistElementForMatching: cheerio.Cheerio<any> | null = null;
          for (const selector of artistSelectors) {
            const foundElement = element.find(selector).first();
            if (foundElement.length > 0) {
              artistElementForMatching = foundElement;
              break;
            }
          }
          
          if (artistElementForMatching) {
            artists = this.matchArtistsWithMtsIds(collaborators, artistElementForMatching, $);
          } else {
            artists = collaborators.map(name => ({ name: this.cleanArtistName(name) }));
          }
        } else {
          artists = [{ name: this.cleanArtistName(artist), mtsId: artistMtsId }];
        }
        
        return {
          artist: this.cleanArtistName(artist),
          title: title.trim(),
          position,
          artistMtsId,
          artists
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Ошибка при извлечении трека:', error);
      return null;
    }
  }
  
  // Извлечение треков из JSON-LD разметки
  private extractTracksFromJsonLd($: cheerio.CheerioAPI): ParsedTrack[] {
    const tracks: ParsedTrack[] = [];
    
    try {
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonData = JSON.parse($(element).html() || '');
          
          // Ищем структуры, которые могут содержать треки
          if (jsonData['@type'] === 'MusicPlaylist' && jsonData.track) {
            jsonData.track.forEach((track: any, index: number) => {
              if (track.byArtist && track.name) {
                tracks.push({
                  artist: this.cleanArtistName(track.byArtist.name || track.byArtist),
                  title: track.name,
                  position: index + 1
                });
              }
            });
          }
          
        } catch (jsonError) {
          // Игнорируем невалидный JSON
        }
      });
      
    } catch (error) {
      console.error('Ошибка при парсинге JSON-LD:', error);
    }
    
    return tracks;
  }
  
  // Извлечение названия чарта
  private extractChartName($: cheerio.CheerioAPI): string {
    const titleSelectors = [
      'h1', '.chart-title', '.page-title', '.title',
      '[class*="chart"] [class*="title"]',
      'title'
    ];
    
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && !text.toLowerCase().includes('mts music')) {
          return text;
        }
      }
    }
    
    return 'Чарт MTS Music';
  }
  
  // Извлечение названия плейлиста
  private extractPlaylistName($: cheerio.CheerioAPI): string {
    const titleSelectors = [
      '.playlist-title', '.playlist-name', 'h1', '.page-title', '.title',
      '[class*="playlist"] [class*="title"]',
      'title'
    ];
    
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && !text.toLowerCase().includes('mts music')) {
          return text;
        }
      }
    }
    
    return 'Плейлист MTS Music';
  }
  
  // Извлечение описания плейлиста
  private extractPlaylistDescription($: cheerio.CheerioAPI): string | undefined {
    const descSelectors = [
      '.playlist-description', '.description', '.about',
      '[class*="playlist"] [class*="description"]',
      'meta[name="description"]'
    ];
    
    for (const selector of descSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = selector === 'meta[name="description"]' 
          ? element.attr('content') 
          : element.text().trim();
          
        if (text && text.length > 10) {
          return text;
        }
      }
    }
    
    return undefined;
  }
}

// Фабрика парсеров
export class RussianMusicParserFactory {
  static createParser(url: string): RussianMusicParser | null {
    if (url.includes('music.mts.ru')) {
      return new MTSMusicParser();
    }
    
    // Можно добавить другие парсеры:
    // if (url.includes('zvuk.com')) return new ZvukParser();
    // if (url.includes('yandex.ru/music')) return new YandexMusicParser();
    
    return null;
  }
  
  static async parseAnyPlaylist(url: string): Promise<PlaylistParseResult | null> {
    const parser = RussianMusicParserFactory.createParser(url);
    
    if (!parser) {
      console.error(`❌ Неподдерживаемый сервис для URL: ${url}`);
      return null;
    }
    
    console.log(`🎵 Используем парсер: ${parser.serviceName}`);
    return await parser.parsePlaylist(url);
  }
  
  // Пакетный парсинг нескольких плейлистов
  static async parseMultiplePlaylists(urls: string[]): Promise<{
    successful: PlaylistParseResult[];
    failed: string[];
  }> {
    console.log(`🎵 Пакетный парсинг ${urls.length} плейлистов...`);
    
    const successful: PlaylistParseResult[] = [];
    const failed: string[] = [];
    
    for (const url of urls) {
      try {
        const result = await RussianMusicParserFactory.parseAnyPlaylist(url);
        
        if (result && result.tracks.length > 0) {
          successful.push(result);
          console.log(`✅ Успешно: ${result.name} (${result.tracks.length} треков)`);
        } else {
          failed.push(url);
          console.log(`❌ Неудачно: ${url}`);
        }
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Ошибка парсинга ${url}:`, error);
        failed.push(url);
      }
    }
    
    const totalTracks = successful.reduce((sum, playlist) => sum + playlist.tracks.length, 0);
    const totalArtists = new Set(successful.flatMap(playlist => playlist.uniqueArtists)).size;
    
    console.log(`📊 Пакетный парсинг завершен:`);
    console.log(`   ✅ Успешно: ${successful.length} плейлистов`);
    console.log(`   ❌ Неудачно: ${failed.length} плейлистов`);
    console.log(`   🎵 Всего треков: ${totalTracks}`);
    console.log(`   👨‍🎤 Уникальных артистов: ${totalArtists}`);
    
    return { successful, failed };
  }
}

// Экспорт основных функций
export const mtsParser = new MTSMusicParser();
export const parsePlaylist = RussianMusicParserFactory.parseAnyPlaylist;
export const parseMultiplePlaylists = RussianMusicParserFactory.parseMultiplePlaylists;

// Старые функции для обратной совместимости
export async function parseMtsChart(url: string): Promise<RussianTrack[]> {
  const result = await mtsParser.parsePlaylist(url);
  
  // Конвертируем в старый формат
  return result.tracks.map(track => ({
    artist: track.artist,
    title: track.title
  }));
}

export function extractUniqueArtists(tracks: RussianTrack[]): string[] {
  const artists = new Set<string>();
  
  tracks.forEach(track => {
    // Добавляем основного артиста
    artists.add(track.artist);
    
    // Если есть фичеринг (feat., ft., при участии)
    const featMatch = track.artist.match(/^(.+?)\s*(?:feat\.|ft\.|при участии|featuring)\s*(.+)$/i);
    if (featMatch) {
      artists.add(featMatch[1].trim()); // Основной артист
      artists.add(featMatch[2].trim()); // Приглашенный артист
    }
    
    // Если есть коллаборация через &, и, x
    const collabMatch = track.artist.match(/^(.+?)\s*(?:&|и|x|×)\s*(.+)$/i);
    if (collabMatch) {
      artists.add(collabMatch[1].trim());
      artists.add(collabMatch[2].trim());
    }
  });
  
  return Array.from(artists)
    .filter(artist => artist.length > 1)
    .sort();
}

// Тестовая функция для проверки парсеров
export async function testRussianParsers(): Promise<void> {
  console.log('🧪 ТЕСТИРОВАНИЕ РОССИЙСКИХ ПАРСЕРОВ\n');
  
  // Тест MTS Music
  console.log('📋 Тестируем MTS Music...');
  const mtsTracks = await parseMtsChart('https://music.mts.ru/chart');
  const mtsArtists = extractUniqueArtists(mtsTracks);
  console.log(`🎤 MTS Music: ${mtsTracks.length} треков, ${mtsArtists.length} уникальных артистов\n`);
  
  // Тест нового универсального парсера
  console.log('📋 Тестируем универсальный парсер...');
  const newResult = await parsePlaylist('https://music.mts.ru/chart');
  console.log(`🎤 Универсальный: ${newResult?.tracks.length || 0} треков, ${newResult?.uniqueArtists.length || 0} уникальных артистов\n`);
  
  if (mtsArtists.length > 0) {
    console.log('\n🎉 Российские парсеры работают!');
    console.log('Примеры артистов:', mtsArtists.slice(0, 10).join(', '));
  } else {
    console.log('\n😞 Парсеры не смогли извлечь артистов');
  }
}