#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addPerformanceIndexes() {
  try {
    console.log('🚀 Adding performance indexes to database...\n');

    // Читаем SQL файл с индексами
    const sqlPath = join(__dirname, '..', 'migrations', '0003_add_performance_indexes.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Разбиваем на отдельные запросы
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`📋 Found ${queries.length} index creation queries\n`);

    let successCount = 0;
    let errorCount = 0;

    // Выполняем каждый запрос
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      try {
        console.log(`[${i + 1}/${queries.length}] Executing: ${query.substring(0, 60)}...`);
        await db.execute(query);
        successCount++;
        console.log('✅ Success\n');
      } catch (error) {
        // Игнорируем ошибки "already exists"
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log('⚠️  Index already exists, skipping\n');
          successCount++;
        } else {
          console.error('❌ Error:', error.message);
          errorCount++;
        }
      }
    }

    console.log('📊 Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All performance indexes added successfully!');
    } else {
      console.log('\n⚠️  Some indexes failed to create. Check the errors above.');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Запускаем скрипт
addPerformanceIndexes();
