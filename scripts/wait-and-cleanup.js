#!/usr/bin/env node

import 'dotenv/config';
import { db } from '../server/db.ts';
import { importJobs } from '../shared/schema.ts';
import { sql, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔄 Мониторинг импорта и автоматическая очистка...\n');

// Функция для проверки статуса импорта
async function checkImportStatus() {
  try {
    const processing = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'processing'
    `);
    
    const completed = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'completed'
    `);
    
    const failed = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_jobs WHERE status = 'failed'
    `);
    
    const processingCount = parseInt(processing.rows[0].count);
    const completedCount = parseInt(completed.rows[0].count);
    const failedCount = parseInt(failed.rows[0].count);
    const totalCount = processingCount + completedCount + failedCount;
    
    console.log(`📊 Статус: ${completedCount} завершено, ${processingCount} обрабатывается, ${failedCount} неудачно`);
    
    return {
      processing: processingCount,
      completed: completedCount,
      failed: failedCount,
      total: totalCount,
      isComplete: processingCount === 0
    };
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error.message);
    return null;
  }
}

// Функция для безопасного удаления файла/папки
function safeRemove(filePath) {
  try {
    const fullPath = path.join(projectRoot, filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   ✅ Удалена папка: ${filePath}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`   ✅ Удален файл: ${filePath}`);
      }
      return true;
    } else {
      console.log(`   ⚠️  Файл не найден: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Ошибка удаления ${filePath}:`, error.message);
    return false;
  }
}

// Функция очистки кода
function cleanupCode() {
  console.log('\n🧹 Начинаем очистку кода...\n');
  
  console.log('📁 Удаляем временные файлы в корне:');
  console.log('==================================================');

  // 1. Удаляем тестовые файлы
  const testFiles = [
    'test-artist-search.js',
    'test-artist-with-releases.js', 
    'test-create-playlist.js',
    'test-deezer.js',
    'test-find-artist.mjs',
    'test-full-import.js',
    'test-import-chart.js',
    'test-import-detailed.js',
    'test-mass-import.js',
    'test-parser.js',
    'test-second-artist.js',
    'test-single-artist-full.js',
    'test-single-artist-vanya.js',
    'test-single-playlist-import.js',
    'test-vanya-full-discography.js',
    'test-vanya-only.js'
  ];

  testFiles.forEach(file => safeRemove(file));

  // 2. Удаляем check-vanya файлы
  const checkFiles = [
    'check-vanya-final.js',
    'check-vanya-results.js', 
    'check-vanya-simple.js'
  ];

  checkFiles.forEach(file => safeRemove(file));

  // 3. Удаляем другие временные файлы
  const tempFiles = [
    'clean-releases.mjs',
    'clear-releases.mjs',
    'clear-releases.sql',
    'fix-storage-casing.js',
    'monitor-import.mjs',
    'run-migration.js',
    'cookies.txt'
  ];

  tempFiles.forEach(file => safeRemove(file));

  // 4. Удаляем attached_assets
  safeRemove('attached_assets');

  console.log('\n📁 Удаляем backup файлы:');
  console.log('==================================================');
  safeRemove('client/src/components/CommentForm.tsx.backup');

  console.log('\n📁 Удаляем дублирующиеся файлы:');
  console.log('==================================================');
  safeRemove('server/optimized-music-importer.ts');

  console.log('\n📁 Очищаем папку scripts:');
  console.log('==================================================');

  // Удаляем ненужные скрипты, оставляем только основные
  const scriptsToRemove = [
    'check-import-jobs.js',
    'check-import-status.js', 
    'check-playlists.js',
    'debug-import.js',
    'force-reset-jobs.js',
    'reset-stuck-jobs.js',
    'test-manual-import.js',
    'test-single-artist-import.js',
    'fix-imported-data.js'
  ];

  scriptsToRemove.forEach(script => safeRemove(`scripts/${script}`));

  console.log('\n✅ Очистка кода завершена!');
}

// Функция для выполнения Git команд
function gitCommit() {
  try {
    console.log('\n📝 Выполняем Git операции...');
    console.log('==================================================');
    
    // Проверяем статус
    console.log('🔍 Проверяем статус Git...');
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) {
      console.log('   ℹ️  Нет изменений для коммита');
      return;
    }
    
    console.log('📦 Добавляем файлы...');
    execSync('git add .', { stdio: 'inherit' });
    
    console.log('💾 Создаем коммит...');
    execSync('git commit -m "Clean up codebase: remove test files and temporary scripts"', { stdio: 'inherit' });
    
    console.log('🚀 Пушим изменения...');
    execSync('git push', { stdio: 'inherit' });
    
    console.log('✅ Git операции завершены!');
  } catch (error) {
    console.error('❌ Ошибка Git операций:', error.message);
  }
}

// Основная функция мониторинга
async function monitorAndCleanup() {
  let checkCount = 0;
  const maxChecks = 120; // Максимум 2 часа (120 * 1 минута)
  
  while (checkCount < maxChecks) {
    checkCount++;
    
    console.log(`\n🔍 Проверка #${checkCount} (${new Date().toLocaleTimeString()})`);
    console.log('==================================================');
    
    const status = await checkImportStatus();
    
    if (!status) {
      console.log('❌ Не удалось получить статус импорта');
      await new Promise(resolve => setTimeout(resolve, 60000)); // Ждем 1 минуту
      continue;
    }
    
    if (status.isComplete) {
      console.log('\n🎉 Импорт завершен!');
      console.log(`📊 Итого: ${status.completed} завершено, ${status.failed} неудачно`);
      
      // Очищаем код
      cleanupCode();
      
      // Выполняем Git операции
      gitCommit();
      
      console.log('\n🎯 Все готово! Код очищен и запушен в Git.');
      break;
    }
    
    // Ждем 1 минуту перед следующей проверкой
    console.log('⏳ Ждем 1 минуту...');
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
  
  if (checkCount >= maxChecks) {
    console.log('\n⏰ Превышено максимальное время ожидания (2 часа)');
    console.log('🔄 Импорт может быть еще не завершен');
  }
}

// Запускаем мониторинг
monitorAndCleanup().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
