// Парсеры российских музыкальных сервисов
// Zvuk.com и MTS Music - доступны из Replit

import * as cheerio from 'cheerio';

export interface RussianTrack {
  artist: string;
  title: string;
  duration?: string;
  album?: string;
  year?: string;
}

// Парсер для Zvuk.com
export async function parseZvukPlaylist(url: string): Promise<RussianTrack[]> {
  try {
    console.log(`🎵 Парсим плейлист Zvuk.com: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log(`📄 Загружена страница: ${$('title').text()}`);
    
    const tracks: RussianTrack[] = [];
    
    // Попробуем разные селекторы для треков
    const trackSelectors = [
      '.track',
      '.track-item',
      '.playlist-track',
      '.song',
      '.music-track',
      '[data-track]',
      '.track-row',
      '.audio-track'
    ];
    
    let foundTracks = false;
    
    for (const selector of trackSelectors) {
      const trackElements = $(selector);
      
      if (trackElements.length > 0) {
        console.log(`🎯 Найдено ${trackElements.length} треков с селектором: ${selector}`);
        foundTracks = true;
        
        trackElements.each((index, element) => {
          const $track = $(element);
          
          // Ищем артиста и название разными способами
          let artist = '';
          let title = '';
          
          // Вариант 1: отдельные элементы для артиста и названия
          const artistElement = $track.find('.artist, .track-artist, .performer, .author').first();
          const titleElement = $track.find('.title, .track-title, .name, .song-name').first();
          
          if (artistElement.length && titleElement.length) {
            artist = artistElement.text().trim();
            title = titleElement.text().trim();
          } else {
            // Вариант 2: ищем в data-атрибутах
            artist = $track.attr('data-artist') || $track.attr('data-performer') || '';
            title = $track.attr('data-title') || $track.attr('data-name') || '';
            
            if (!artist || !title) {
              // Вариант 3: ищем в тексте элемента (формат "Артист - Название")
              const fullText = $track.text().trim();
              const dashMatch = fullText.match(/^(.+?)\\s*[-–—]\\s*(.+)$/);
              
              if (dashMatch) {
                artist = dashMatch[1].trim();
                title = dashMatch[2].trim();
              }
            }
          }
          
          // Ищем дополнительную информацию
          const duration = $track.find('.duration, .time, .length').first().text().trim() || 
                          $track.attr('data-duration') || '';
          
          const album = $track.find('.album, .album-name').first().text().trim() || 
                       $track.attr('data-album') || '';
          
          if (artist && title) {
            tracks.push({
              artist: cleanText(artist),
              title: cleanText(title),
              duration: duration || undefined,
              album: album || undefined
            });
            
            if (index < 5) { // Показываем первые 5 для отладки
              console.log(`  🎤 ${artist} - ${title}`);
            }
          }
        });
        
        break; // Если нашли треки, выходим из цикла
      }
    }
    
    if (!foundTracks) {
      console.log('⚠️ Не найдено треков со стандартными селекторами, пробуем JSON в скриптах...');
      
      // Ищем данные в JavaScript на странице
      const scripts = $('script[type="application/ld+json"], script[type="application/json"], script:contains("track")').toArray();
      
      for (const script of scripts) {
        const scriptContent = $(script).html();
        if (scriptContent && scriptContent.includes('track')) {
          try {
            const jsonData = JSON.parse(scriptContent);
            console.log('📋 Найдены JSON данные:', Object.keys(jsonData));
            // Здесь можно добавить обработку JSON данных о треках
          } catch (e) {
            // Не JSON, продолжаем
          }
        }
      }
    }
    
    console.log(`✅ Zvuk.com: Извлечено ${tracks.length} треков`);
    return tracks;
    
  } catch (error) {
    console.error(`❌ Ошибка парсинга Zvuk.com:`, error);
    return [];
  }
}

// Парсер для MTS Music
export async function parseMtsChart(url: string): Promise<RussianTrack[]> {
  try {
    console.log(`🎵 Парсим чарт MTS Music: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log(`📄 Загружена страница: ${$('title').text()}`);
    
    const tracks: RussianTrack[] = [];
    
    // Селекторы для MTS Music
    const trackSelectors = [
      '.track',
      '.track-item',
      '.chart-track',
      '.song',
      '.music-item',
      '[data-track]',
      '.playlist-item',
      '.audio-item'
    ];
    
    let foundTracks = false;
    
    for (const selector of trackSelectors) {
      const trackElements = $(selector);
      
      if (trackElements.length > 0) {
        console.log(`🎯 Найдено ${trackElements.length} треков с селектором: ${selector}`);
        foundTracks = true;
        
        trackElements.each((index, element) => {
          const $track = $(element);
          
          // Ищем артиста и название
          let artist = '';
          let title = '';
          
          // Попробуем найти артиста и название
          const artistSelectors = ['.artist', '.performer', '.author', '.track-artist'];
          const titleSelectors = ['.title', '.name', '.track-title', '.song-title'];
          
          for (const artistSel of artistSelectors) {
            const artistEl = $track.find(artistSel).first();
            if (artistEl.length && artistEl.text().trim()) {
              artist = artistEl.text().trim();
              break;
            }
          }
          
          for (const titleSel of titleSelectors) {
            const titleEl = $track.find(titleSel).first();
            if (titleEl.length && titleEl.text().trim()) {
              title = titleEl.text().trim();
              break;
            }
          }
          
          // Если не нашли, ищем в data-атрибутах
          if (!artist || !title) {
            artist = artist || $track.attr('data-artist') || $track.attr('data-performer') || '';
            title = title || $track.attr('data-title') || $track.attr('data-name') || '';
          }
          
          // Ищем в тексте (формат "Артист - Название")
          if (!artist || !title) {
            const fullText = $track.text().trim();
            const dashMatch = fullText.match(/^(.+?)\\s*[-–—]\\s*(.+)$/);
            
            if (dashMatch) {
              artist = dashMatch[1].trim();
              title = dashMatch[2].trim();
            }
          }
          
          if (artist && title) {
            tracks.push({
              artist: cleanText(artist),
              title: cleanText(title)
            });
            
            if (index < 5) { // Показываем первые 5 для отладки
              console.log(`  🎤 ${artist} - ${title}`);
            }
          }
        });
        
        break;
      }
    }
    
    if (!foundTracks) {
      console.log('⚠️ Стандартные селекторы не сработали, ищем альтернативные паттерны...');
      
      // Ищем любые элементы с текстом, похожим на "артист - песня"
      const allElements = $('*').filter((_, el) => {
        const text = $(el).text().trim();
        return text.length > 10 && text.length < 200 && text.includes(' - ');
      });
      
      console.log(`🔍 Найдено ${allElements.length} элементов с дефисами`);
      
      allElements.each((index, element) => {
        if (tracks.length >= 50) return; // Ограничиваем до 50 треков
        
        const text = $(element).text().trim();
        const dashMatch = text.match(/^(.+?)\\s*[-–—]\\s*(.+)$/);
        
        if (dashMatch) {
          const artist = cleanText(dashMatch[1]);
          const title = cleanText(dashMatch[2]);
          
          // Проверяем, что это похоже на музыкальный трек
          if (artist.length > 2 && title.length > 2 && 
              !artist.includes('©') && !title.includes('http')) {
            
            // Проверяем, что такого трека еще нет
            const isDuplicate = tracks.some(t => 
              t.artist.toLowerCase() === artist.toLowerCase() && 
              t.title.toLowerCase() === title.toLowerCase()
            );
            
            if (!isDuplicate) {
              tracks.push({ artist, title });
              
              if (tracks.length <= 5) {
                console.log(`  🎤 ${artist} - ${title}`);
              }
            }
          }
        }
      });
    }
    
    console.log(`✅ MTS Music: Извлечено ${tracks.length} треков`);
    return tracks;
    
  } catch (error) {
    console.error(`❌ Ошибка парсинга MTS Music:`, error);
    return [];
  }
}

// Очистка текста от лишних символов
function cleanText(text: string): string {
  return text
    .replace(/\\s+/g, ' ') // Множественные пробелы в один
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, '') // Невидимые символы
    .trim();
}

// Извлечение уникальных артистов из треков
export function extractUniqueArtists(tracks: RussianTrack[]): string[] {
  const artists = new Set<string>();
  
  tracks.forEach(track => {
    // Добавляем основного артиста
    artists.add(track.artist);
    
    // Если есть фичеринг (feat., ft., при участии)
    const featMatch = track.artist.match(/^(.+?)\\s*(?:feat\\.|ft\\.|при участии|featuring)\\s*(.+)$/i);
    if (featMatch) {
      artists.add(featMatch[1].trim()); // Основной артист
      artists.add(featMatch[2].trim()); // Приглашенный артист
    }
    
    // Если есть коллаборация через &, и, x
    const collabMatch = track.artist.match(/^(.+?)\\s*(?:&|и|x|×)\\s*(.+)$/i);
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
  console.log('🧪 ТЕСТИРОВАНИЕ РОССИЙСКИХ ПАРСЕРОВ\\n');
  
  // Тест Zvuk.com
  console.log('📋 Тестируем Zvuk.com...');
  const zvukTracks = await parseZvukPlaylist('https://zvuk.com/playlist/1062105');
  const zvukArtists = extractUniqueArtists(zvukTracks);
  console.log(`🎤 Zvuk.com: ${zvukTracks.length} треков, ${zvukArtists.length} уникальных артистов\\n`);
  
  // Тест MTS Music
  console.log('📋 Тестируем MTS Music...');
  const mtsTracks = await parseMtsChart('https://music.mts.ru/chart');
  const mtsArtists = extractUniqueArtists(mtsTracks);
  console.log(`🎤 MTS Music: ${mtsTracks.length} треков, ${mtsArtists.length} уникальных артистов\\n`);
  
  // Общая статистика
  const allArtists = new Set([...zvukArtists, ...mtsArtists]);
  console.log(`📊 ИТОГО: ${allArtists.size} уникальных артистов из ${zvukTracks.length + mtsTracks.length} треков`);
  
  if (allArtists.size > 0) {
    console.log('\\n🎉 Российские парсеры работают!');
    console.log('Примеры артистов:', Array.from(allArtists).slice(0, 10).join(', '));
  } else {
    console.log('\\n😞 Парсеры не смогли извлечь артистов');
  }
}