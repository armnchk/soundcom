#!/usr/bin/env node

/**
 * Скрипт для проверки соответствия схемы Drizzle и реальной базы данных
 * Помогает быстро находить несоответствия в именах полей и типах данных
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не найден в переменных окружения');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Схема Drizzle (вручную, так как мы не можем импортировать TypeScript)
const DRIZZLE_SCHEMA = {
  users: {
    id: 'varchar',
    email: 'varchar',
    first_name: 'varchar',
    last_name: 'varchar',
    profile_image_url: 'varchar',
    nickname: 'varchar',
    is_admin: 'boolean',
    created_at: 'timestamp',
    updated_at: 'timestamp'
  },
  artists: {
    id: 'serial',
    name: 'varchar',
    deezer_id: 'varchar',
    itunes_id: 'varchar',
    yandex_music_id: 'varchar',
    yandex_music_url: 'text',
    image_url: 'text',
    genres: 'text',
    popularity: 'integer',
    followers: 'integer',
    last_updated: 'timestamp',
    total_tracks: 'integer',
    created_at: 'timestamp',
    updated_at: 'timestamp'
  },
  releases: {
    id: 'serial',
    title: 'varchar',
    artist_id: 'integer',
    release_date: 'timestamp',
    type: 'varchar',
    cover_url: 'text',
    streaming_links: 'jsonb',
    deezer_id: 'varchar',
    itunes_id: 'varchar',
    yandex_music_id: 'varchar',
    yandex_music_url: 'text',
    total_tracks: 'integer',
    is_test_data: 'boolean',
    created_at: 'timestamp',
    updated_at: 'timestamp'
  },
  auto_import_playlists: {
    id: 'serial',
    user_id: 'varchar',
    url: 'text',
    name: 'varchar',
    description: 'text',
    enabled: 'boolean',
    platform: 'varchar',
    is_active: 'boolean',
    last_imported_at: 'timestamp',
    sort_order: 'integer',
    created_at: 'timestamp',
    updated_at: 'timestamp'
  },
  import_logs: {
    id: 'serial',
    type: 'varchar',
    status: 'varchar',
    message: 'text',
    details: 'jsonb',
    created_at: 'timestamp'
  }
};

async function getTableSchema(tableName) {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position;
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

function normalizeType(drizzleType, dbType, maxLength) {
  // Нормализуем типы для сравнения
  const typeMap = {
    'character varying': 'varchar',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamp',
    'integer': 'integer',
    'serial': 'serial',
    'boolean': 'boolean',
    'text': 'text',
    'date': 'date',
    'jsonb': 'jsonb'
  };
  
  const normalizedDbType = typeMap[dbType] || dbType;
  
  // Для varchar учитываем длину
  if (drizzleType === 'varchar' && normalizedDbType === 'varchar') {
    return 'varchar';
  }
  
  return normalizedDbType;
}

async function checkTable(tableName, expectedSchema) {
  console.log(`\n🔍 Проверяем таблицу: ${tableName}`);
  
  try {
    const actualSchema = await getTableSchema(tableName);
    
    if (actualSchema.length === 0) {
      console.log(`❌ Таблица ${tableName} не найдена в базе данных`);
      return false;
    }
    
    const actualFields = {};
    actualSchema.forEach(field => {
      actualFields[field.column_name] = {
        type: normalizeType(null, field.data_type, field.character_maximum_length),
        nullable: field.is_nullable === 'YES',
        default: field.column_default
      };
    });
    
    let hasErrors = false;
    
    // Проверяем каждое ожидаемое поле
    for (const [fieldName, expectedField] of Object.entries(expectedSchema)) {
      if (!actualFields[fieldName]) {
        console.log(`❌ Поле ${fieldName} отсутствует в таблице ${tableName}`);
        hasErrors = true;
      } else {
        const actualField = actualFields[fieldName];
        if (actualField.type !== expectedField) {
          console.log(`⚠️  Поле ${fieldName}: ожидается ${expectedField}, найдено ${actualField.type}`);
        } else {
          console.log(`✅ Поле ${fieldName}: ${actualField.type}`);
        }
      }
    }
    
    // Проверяем лишние поля в БД
    for (const [fieldName, actualField] of Object.entries(actualFields)) {
      if (!expectedSchema[fieldName]) {
        console.log(`ℹ️  Дополнительное поле ${fieldName}: ${actualField.type} (не в схеме Drizzle)`);
      }
    }
    
    return !hasErrors;
    
  } catch (error) {
    console.log(`❌ Ошибка при проверке таблицы ${tableName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Запуск проверки схемы базы данных...\n');
  
  let allTablesValid = true;
  
  for (const [tableName, expectedSchema] of Object.entries(DRIZZLE_SCHEMA)) {
    const isValid = await checkTable(tableName, expectedSchema);
    if (!isValid) {
      allTablesValid = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allTablesValid) {
    console.log('✅ Все таблицы соответствуют схеме Drizzle!');
  } else {
    console.log('❌ Найдены несоответствия в схеме базы данных');
    console.log('💡 Рекомендации:');
    console.log('   1. Обновите схему в shared/schema.ts');
    console.log('   2. Выполните миграцию базы данных');
    console.log('   3. Перезапустите сервер');
  }
  
  await pool.end();
}

main().catch(console.error);
