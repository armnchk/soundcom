#!/usr/bin/env node

/**
 * Скрипт для очистки базы данных от релизов и артистов
 * Оставляет только пользователей и системные данные
 */

import 'dotenv/config';
import { db } from '../server/db.ts';
import { 
  releases, 
  artists, 
  ratings, 
  comments, 
  commentReactions, 
  reports, 
  collections, 
  collectionReleases,
  importJobs,
  autoImportPlaylists,
  importLogs,
  discographyCache
} from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

async function clearDatabase() {
  console.log('🧹 Очищаем базу данных...\n');
  
  try {
    // Показываем текущую статистику
    console.log('📊 ТЕКУЩЕЕ СОСТОЯНИЕ:');
    console.log('='.repeat(50));
    
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM releases) as releases_count,
        (SELECT COUNT(*) FROM artists) as artists_count,
        (SELECT COUNT(*) FROM ratings) as ratings_count,
        (SELECT COUNT(*) FROM comments) as comments_count,
        (SELECT COUNT(*) FROM reports) as reports_count,
        (SELECT COUNT(*) FROM collections) as collections_count,
        (SELECT COUNT(*) FROM import_jobs) as import_jobs_count,
        (SELECT COUNT(*) FROM discography_cache) as cache_count
    `);
    
    const currentStats = stats.rows[0];
    console.log(`Релизов: ${currentStats.releases_count}`);
    console.log(`Артистов: ${currentStats.artists_count}`);
    console.log(`Рейтингов: ${currentStats.ratings_count}`);
    console.log(`Комментариев: ${currentStats.comments_count}`);
    console.log(`Жалоб: ${currentStats.reports_count}`);
    console.log(`Коллекций: ${currentStats.collections_count}`);
    console.log(`Задач импорта: ${currentStats.import_jobs_count}`);
    console.log(`Кэш дискографий: ${currentStats.cache_count}`);
    
    console.log('\n🗑️ УДАЛЯЕМ ДАННЫЕ:');
    console.log('='.repeat(50));
    
    // Удаляем в правильном порядке (сначала зависимые таблицы)
    console.log('1. Удаляем рейтинги...');
    await db.delete(ratings);
    console.log('   ✅ Рейтинги удалены');
    
    console.log('2. Удаляем реакции на комментарии...');
    await db.delete(commentReactions);
    console.log('   ✅ Реакции удалены');
    
    console.log('3. Удаляем комментарии...');
    await db.delete(comments);
    console.log('   ✅ Комментарии удалены');
    
    console.log('4. Удаляем жалобы...');
    await db.delete(reports);
    console.log('   ✅ Жалобы удалены');
    
    console.log('5. Удаляем связи коллекций с релизами...');
    await db.delete(collectionReleases);
    console.log('   ✅ Связи коллекций удалены');
    
    console.log('6. Удаляем коллекции...');
    await db.delete(collections);
    console.log('   ✅ Коллекции удалены');
    
    console.log('7. Удаляем релизы...');
    await db.delete(releases);
    console.log('   ✅ Релизы удалены');
    
    console.log('8. Удаляем кэш дискографий...');
    await db.delete(discographyCache);
    console.log('   ✅ Кэш дискографий удален');
    
    console.log('9. Удаляем артистов...');
    await db.delete(artists);
    console.log('   ✅ Артисты удалены');
    
    console.log('10. Удаляем задачи импорта...');
    await db.delete(importJobs);
    console.log('   ✅ Задачи импорта удалены');
    
    console.log('11. Удаляем автоимпорт плейлисты...');
    await db.delete(autoImportPlaylists);
    console.log('   ✅ Автоимпорт плейлисты удалены');
    
    console.log('12. Удаляем логи импорта...');
    await db.delete(importLogs);
    console.log('   ✅ Логи импорта удалены');
    
    // Показываем финальную статистику
    console.log('\n📊 ФИНАЛЬНОЕ СОСТОЯНИЕ:');
    console.log('='.repeat(50));
    
    const finalStats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM releases) as releases_count,
        (SELECT COUNT(*) FROM artists) as artists_count,
        (SELECT COUNT(*) FROM ratings) as ratings_count,
        (SELECT COUNT(*) FROM comments) as comments_count,
        (SELECT COUNT(*) FROM reports) as reports_count,
        (SELECT COUNT(*) FROM collections) as collections_count,
        (SELECT COUNT(*) FROM import_jobs) as import_jobs_count,
        (SELECT COUNT(*) FROM discography_cache) as cache_count
    `);
    
    const final = finalStats.rows[0];
    console.log(`Релизов: ${final.releases_count}`);
    console.log(`Артистов: ${final.artists_count}`);
    console.log(`Рейтингов: ${final.ratings_count}`);
    console.log(`Комментариев: ${final.comments_count}`);
    console.log(`Жалоб: ${final.reports_count}`);
    console.log(`Коллекций: ${final.collections_count}`);
    console.log(`Задач импорта: ${final.import_jobs_count}`);
    console.log(`Кэш дискографий: ${final.cache_count}`);
    
    console.log('\n✅ База данных очищена!');
    console.log('🎵 Теперь можно запускать импорт через админ-панель');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
  } finally {
    process.exit(0);
  }
}

clearDatabase();