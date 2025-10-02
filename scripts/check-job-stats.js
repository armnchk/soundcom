#!/usr/bin/env node

import 'dotenv/config';
import { db } from '../server/db.ts';
import { importJobs } from '../shared/schema.ts';
import { sql, eq } from 'drizzle-orm';

async function checkJobStats() {
  try {
    console.log('📊 СТАТИСТИКА ЗАДАЧ ИМПОРТА:');
    console.log('==================================================');

    const completed = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'completed'
    `);
    
    const processing = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'processing'
    `);
    
    const failed = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'failed'
    `);
    
    const pending = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'pending'
    `);
    
    const completedCount = parseInt(completed.rows[0].count);
    const processingCount = parseInt(processing.rows[0].count);
    const failedCount = parseInt(failed.rows[0].count);
    const pendingCount = parseInt(pending.rows[0].count);
    const totalCount = completedCount + processingCount + failedCount + pendingCount;
    
    console.log(`✅ Завершено: ${completedCount}`);
    console.log(`🔄 Обрабатывается: ${processingCount}`);
    console.log(`❌ Неудачно: ${failedCount}`);
    console.log(`⏳ Ожидает: ${pendingCount}`);
    console.log(`📋 Всего задач: ${totalCount}`);
    
    const totalPlaylists = 24;
    const progress = Math.round((completedCount / totalPlaylists) * 100);
    console.log(`\n🎯 ПРОГРЕСС: ${completedCount}/${totalPlaylists} плейлистов (${progress}%)`);
    
    if (completedCount > 0) {
      console.log(`\n⏱️ ВРЕМЯ РАБОТЫ:`);
      const firstJob = await db.execute(sql`
        SELECT created_at FROM import_jobs 
        WHERE status = 'completed' 
        ORDER BY created_at ASC 
        LIMIT 1
      `);
      
      const lastJob = await db.execute(sql`
        SELECT completed_at FROM import_jobs 
        WHERE status = 'completed' 
        ORDER BY completed_at DESC 
        LIMIT 1
      `);
      
      if (firstJob.rows[0] && lastJob.rows[0]) {
        const startTime = new Date(firstJob.rows[0].created_at);
        const endTime = new Date(lastJob.rows[0].completed_at);
        const totalTime = Math.round((endTime - startTime) / (1000 * 60)); // минуты
        const avgTime = Math.round(totalTime / completedCount);
        
        console.log(`   Первая задача: ${startTime.toLocaleTimeString()}`);
        console.log(`   Последняя завершенная: ${endTime.toLocaleTimeString()}`);
        console.log(`   Общее время: ${totalTime} минут`);
        console.log(`   Среднее время на плейлист: ${avgTime} минут`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

checkJobStats();
