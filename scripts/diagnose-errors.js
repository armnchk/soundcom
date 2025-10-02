#!/usr/bin/env node

/**
 * Скрипт для быстрой диагностики ошибок базы данных
 * Анализирует логи и предлагает решения
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не найден в переменных окружения');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function diagnoseTable(tableName) {
  console.log(`\n🔍 Диагностика таблицы: ${tableName}`);
  
  try {
    // Проверяем существование таблицы
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`❌ Таблица ${tableName} не существует`);
      return;
    }
    
    // Получаем структуру таблицы
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position;
    `, [tableName]);
    
    console.log(`✅ Таблица ${tableName} существует`);
    console.log(`📊 Колонок: ${columns.rows.length}`);
    
    // Показываем все колонки
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   • ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
    });
    
    // Проверяем индексы
    const indexes = await pool.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = $1;
    `, [tableName]);
    
    if (indexes.rows.length > 0) {
      console.log(`📈 Индексы:`);
      indexes.rows.forEach(idx => {
        console.log(`   • ${idx.indexname}`);
      });
    }
    
    // Проверяем ограничения
    const constraints = await pool.query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = $1::regclass;
    `, [tableName]);
    
    if (constraints.rows.length > 0) {
      console.log(`🔒 Ограничения:`);
      constraints.rows.forEach(constraint => {
        console.log(`   • ${constraint.conname}: ${constraint.definition}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Ошибка при диагностике таблицы ${tableName}:`, error.message);
  }
}

async function checkCommonIssues() {
  console.log('🚀 Запуск диагностики общих проблем...\n');
  
  const commonTables = [
    'users',
    'artists', 
    'releases',
    'auto_import_playlists',
    'import_logs',
    'collections',
    'ratings',
    'comments'
  ];
  
  for (const table of commonTables) {
    await diagnoseTable(table);
  }
  
  // Проверяем подключение к БД
  try {
    const result = await pool.query('SELECT version();');
    console.log(`\n✅ Подключение к БД: ${result.rows[0].version.split(' ')[0]}`);
  } catch (error) {
    console.log(`\n❌ Ошибка подключения к БД:`, error.message);
  }
  
  await pool.end();
}

// Если передан аргумент, диагностируем конкретную таблицу
const tableName = process.argv[2];
if (tableName) {
  diagnoseTable(tableName).then(() => pool.end());
} else {
  checkCommonIssues();
}
