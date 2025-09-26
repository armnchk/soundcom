import { importFromYandexPlaylist, updateAllArtists } from './music-importer';
import { createImportJob } from './background-jobs';
import { storage } from './storage';
import * as cron from 'node-cron';

export async function runDailyMusicImport() {
  console.log('🎵 Запуск ежедневного импорта музыки...');
  
  const startTime = new Date();
  let totalStats = {
    updatedArtists: 0,
    newReleases: 0,
    skippedReleases: 0,
    errors: [] as string[]
  };

  // 1. Получаем активные плейлисты из БД
  console.log('📋 Получаем активные плейлисты для автоимпорта...');
  
  const activePlayLists = await storage.getAutoImportPlaylists();
  const enabledPlaylists = activePlayLists.filter(playlist => playlist.enabled);
  
  console.log(`📊 Найдено ${enabledPlaylists.length} активных плейлистов из ${activePlayLists.length} общих`);
  
  if (enabledPlaylists.length === 0) {
    console.log('⚠️ Нет активных плейлистов для импорта. Пропускаем этап импорта из плейлистов.');
  } else {
    console.log('🚀 Запускаем фоновые задания для активных плейлистов...');
  }
  
  const backgroundJobIds: number[] = [];
  
  for (const playlist of enabledPlaylists) {
    try {
      console.log(`🔄 Запускаем фоновое задание для плейлиста: ${playlist.name} (${playlist.url})`);
      
      const jobId = await createImportJob({
        playlistUrl: playlist.url,
        status: 'pending',
        createdBy: 'system', // Автоматический планировщик
      });
      backgroundJobIds.push(jobId);
      
      console.log(`✅ Фоновое задание #${jobId} запущено для плейлиста "${playlist.name}"`);
      
      // Небольшая пауза между запусками заданий
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Ошибка при запуске фонового задания для плейлиста ${playlist.name}:`, error);
      totalStats.errors.push(`Background job for ${playlist.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`🚀 Запущено ${backgroundJobIds.length} фоновых заданий для импорта плейлистов`);
  console.log('⏳ Фоновые задания будут выполняться асинхронно без таймаутов');

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
  console.log(`🚀 Запущено фоновых заданий для плейлистов: ${backgroundJobIds.length}`);
  console.log(`🔄 Обновлено артистов: ${totalStats.updatedArtists}`);
  console.log(`💿 Новых релизов (только от обновления артистов): ${totalStats.newReleases}`);
  console.log(`⏭️  Пропущено релизов: ${totalStats.skippedReleases}`);
  console.log(`❌ Ошибок: ${totalStats.errors.length}`);
  
  if (backgroundJobIds.length > 0) {
    console.log('\n🎯 ID фоновых заданий для мониторинга:');
    backgroundJobIds.forEach(jobId => console.log(`  - Задание #${jobId}`));
    console.log('💡 Следите за прогрессом фоновых заданий в админ-панели');
  }
  
  if (totalStats.errors.length > 0) {
    console.log('\n🔍 Детали ошибок:');
    totalStats.errors.forEach(error => console.log(`  - ${error}`));
  }

  return {
    ...totalStats,
    backgroundJobIds
  };
}

// Переменная для хранения активной задачи cron
let scheduledTask: cron.ScheduledTask | null = null;

// Запуск в 03:00 каждый день
export function scheduleDaily() {
  console.log('⏰ Настройка автоматического планировщика для ежедневного импорта в 03:00');
  
  // Если уже есть запланированная задача, остановим её
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('🛑 Предыдущая задача остановлена');
  }
  
  // Запланируем новую задачу на каждый день в 03:00
  scheduledTask = cron.schedule('0 3 * * *', async () => {
    console.log('🌅 Автоматический запуск ежедневного импорта музыки...');
    
    try {
      const stats = await runDailyMusicImport();
      console.log('✅ Автоматический импорт завершен успешно');
      console.log(`📊 Итого: +${stats.newReleases} релизов, ${stats.updatedArtists} обновленных артистов, ${stats.errors.length} ошибок`);
    } catch (error) {
      console.error('❌ Ошибка автоматического импорта:', error);
    }
  }, {
    timezone: "Europe/Moscow" // Московское время
  });
  
  const now = new Date();
  const nextRun = new Date();
  
  // Если сейчас уже после 03:00, то следующий запуск завтра
  if (now.getHours() >= 3) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  nextRun.setHours(3, 0, 0, 0);
  
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  const hoursUntilNextRun = Math.round(msUntilNextRun / (1000 * 60 * 60));
  
  console.log(`⏳ Следующий автоматический импорт через ${hoursUntilNextRun} часов (${nextRun.toLocaleString('ru')})`);
  console.log('🚀 Автоматический планировщик активен!');
  
  return {
    nextRun,
    hoursUntilNextRun,
    isActive: true
  };
}

// Остановка автоматического планировщика
export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Автоматический планировщик остановлен');
    return true;
  }
  return false;
}

// Получение статуса планировщика
export function getSchedulerStatus() {
  const isActive = scheduledTask ? scheduledTask.getStatus() === 'scheduled' : false;
  
  if (isActive) {
    const now = new Date();
    const nextRun = new Date();
    
    if (now.getHours() >= 3) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    nextRun.setHours(3, 0, 0, 0);
    
    const msUntilNextRun = nextRun.getTime() - now.getTime();
    const hoursUntilNextRun = Math.round(msUntilNextRun / (1000 * 60 * 60));
    
    return {
      isActive: true,
      nextRun,
      hoursUntilNextRun
    };
  }
  
  return {
    isActive: false,
    nextRun: null,
    hoursUntilNextRun: null
  };
}

// Функция для ручного запуска импорта через админку
export async function manualImportTrigger(playlistUrl?: string) {
  if (playlistUrl) {
    console.log(`🎯 Ручной импорт плейлиста: ${playlistUrl}`);
    // Для ручного запуска используем старый метод для совместимости
    return await importFromYandexPlaylist(playlistUrl);
  } else {
    console.log('🎯 Ручной запуск полного импорта');
    return await runDailyMusicImport();
  }
}