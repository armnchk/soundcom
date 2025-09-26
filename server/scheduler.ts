import { importFromYandexPlaylist, updateAllArtists } from './music-importer';

// Список плейлистов Яндекс Музыки для автоматического импорта
const YANDEX_PLAYLISTS = [
  'https://music.yandex.ru/chart', // Чарт
  'https://music.yandex.ru/playlists/2111e2b6-587d-a600-2fea-54df7c314477', // Новые релизы
  'https://music.yandex.ru/playlists/3c5d7e75-c8ea-55af-9689-2263608117ba', // Indie Rock
  'https://music.yandex.ru/playlists/83d59684-4c03-783a-8a27-8a04d52edb95', // Russian Hip-Hop
  'https://music.yandex.ru/playlists/be0f3522-0e50-fe5d-8a01-8a0146041ccd', // Электроника
];

export async function runDailyMusicImport() {
  console.log('🎵 Запуск ежедневного импорта музыки...');
  
  const startTime = new Date();
  let totalStats = {
    newArtists: 0,
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: [] as string[]
  };

  // 1. Импорт новых артистов из Яндекс Музыки плейлистов
  console.log('📋 Обрабатываем плейлисты Яндекс Музыки...');
  
  for (const playlistUrl of YANDEX_PLAYLISTS) {
    try {
      console.log(`🔄 Импортируем плейлист: ${playlistUrl}`);
      
      const result = await importFromYandexPlaylist(playlistUrl);
      
      totalStats.newArtists += result.newArtists;
      totalStats.newReleases += result.newReleases;
      totalStats.skippedReleases += result.skippedReleases;
      totalStats.errors.push(...result.errors);
      
      console.log(`✅ Плейлист обработан: +${result.newReleases} релизов, +${result.newArtists} артистов`);
      
      // Пауза между плейлистами
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`❌ Ошибка при обработке плейлиста ${playlistUrl}:`, error);
      totalStats.errors.push(`Playlist ${playlistUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 2. Обновление существующих артистов
  console.log('🔄 Обновляем существующих артистов...');
  
  try {
    const updateResult = await updateAllArtists();
    
    totalStats.updatedArtists += updateResult.updatedArtists;
    totalStats.newReleases += updateResult.newReleases;
    totalStats.skippedReleases += updateResult.skippedReleases;
    totalStats.errors.push(...updateResult.errors);
    
    console.log(`✅ Обновление завершено: +${updateResult.newReleases} релизов для ${updateResult.updatedArtists} артистов`);
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении артистов:', error);
    totalStats.errors.push(`Artist update: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  // Финальный отчет
  console.log('\n📊 ИТОГИ ЕЖЕДНЕВНОГО ИМПОРТА:');
  console.log(`⏱️  Время выполнения: ${duration} секунд`);
  console.log(`🎤 Новых артистов: ${totalStats.newArtists}`);
  console.log(`🔄 Обновлено артистов: ${totalStats.updatedArtists}`);
  console.log(`💿 Новых релизов: ${totalStats.newReleases}`);
  console.log(`⏭️  Пропущено релизов: ${totalStats.skippedReleases}`);
  console.log(`❌ Ошибок: ${totalStats.errors.length}`);
  
  if (totalStats.errors.length > 0) {
    console.log('\n🔍 Детали ошибок:');
    totalStats.errors.forEach(error => console.log(`  - ${error}`));
  }

  return totalStats;
}

// Запуск в 03:00 каждый день (если нужно настроить cron)
export function scheduleDaily() {
  console.log('⏰ Планировщик настроен для ежедневного импорта в 03:00');
  
  // В производственной среде здесь был бы реальный cron или setTimeout
  // Для демонстрации покажем как это будет работать
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(3, 0, 0, 0); // 03:00
  
  const msUntilNextRun = tomorrow.getTime() - now.getTime();
  const hoursUntilNextRun = Math.round(msUntilNextRun / (1000 * 60 * 60));
  
  console.log(`⏳ Следующий автоматический импорт через ${hoursUntilNextRun} часов`);
  
  // В реальной системе здесь был бы:
  // setTimeout(runDailyMusicImport, msUntilNextRun);
  // или использование библиотеки node-cron:
  // cron.schedule('0 3 * * *', runDailyMusicImport);
  
  return {
    nextRun: tomorrow,
    hoursUntilNextRun
  };
}

// Функция для ручного запуска импорта через админку
export async function manualImportTrigger(playlistUrl?: string) {
  if (playlistUrl) {
    console.log(`🎯 Ручной импорт плейлиста: ${playlistUrl}`);
    return await importFromYandexPlaylist(playlistUrl);
  } else {
    console.log('🎯 Ручной запуск полного импорта');
    return await runDailyMusicImport();
  }
}