#!/usr/bin/env node

/**
 * Скрипт для проверки качества импортированных данных
 * Показывает статистику по заполненности полей в базе данных
 */

import 'dotenv/config';
import { db } from '../server/db.ts';
import { artists, releases } from '../shared/schema.ts';
import { sql } from 'drizzle-orm';

async function checkImportQuality() {
  console.log('🔍 Проверяем качество импортированных данных...\n');
  
  try {
    // Статистика по артистам
    console.log('📊 СТАТИСТИКА АРТИСТОВ:');
    console.log('='.repeat(50));
    
    const artistStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_artists,
        COUNT(deezer_id) as with_deezer_id,
        COUNT(itunes_id) as with_itunes_id,
        COUNT(mts_music_id) as with_mts_id,
        COUNT(yandex_music_id) as with_yandex_id,
        COUNT(image_url) as with_image,
        COUNT(genres) as with_genres,
        COUNT(popularity) as with_popularity,
        COUNT(followers) as with_followers
      FROM artists
    `);
    
    const artistData = artistStats.rows[0];
    console.log(`Всего артистов: ${artistData.total_artists}`);
    console.log(`С Deezer ID: ${artistData.with_deezer_id} (${Math.round(artistData.with_deezer_id / artistData.total_artists * 100)}%)`);
    console.log(`С iTunes ID: ${artistData.with_itunes_id} (${Math.round(artistData.with_itunes_id / artistData.total_artists * 100)}%)`);
    console.log(`С MTS ID: ${artistData.with_mts_id} (${Math.round(artistData.with_mts_id / artistData.total_artists * 100)}%)`);
    console.log(`С Яндекс ID: ${artistData.with_yandex_id} (${Math.round(artistData.with_yandex_id / artistData.total_artists * 100)}%)`);
    console.log(`С изображением: ${artistData.with_image} (${Math.round(artistData.with_image / artistData.total_artists * 100)}%)`);
    console.log(`С жанрами: ${artistData.with_genres} (${Math.round(artistData.with_genres / artistData.total_artists * 100)}%)`);
    console.log(`С популярностью: ${artistData.with_popularity} (${Math.round(artistData.with_popularity / artistData.total_artists * 100)}%)`);
    console.log(`С подписчиками: ${artistData.with_followers} (${Math.round(artistData.with_followers / artistData.total_artists * 100)}%)`);
    
    console.log('\n📊 СТАТИСТИКА РЕЛИЗОВ:');
    console.log('='.repeat(50));
    
    const releaseStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_releases,
        COUNT(deezer_id) as with_deezer_id,
        COUNT(itunes_id) as with_itunes_id,
        COUNT(yandex_music_id) as with_yandex_id,
        COUNT(cover_url) as with_cover,
        COUNT(cover_small) as with_cover_small,
        COUNT(cover_medium) as with_cover_medium,
        COUNT(cover_big) as with_cover_big,
        COUNT(cover_xl) as with_cover_xl,
        COUNT(duration) as with_duration,
        COUNT(genres) as with_genres,
        COUNT(upc) as with_upc,
        COUNT(label) as with_label,
        COUNT(contributors) as with_contributors,
        COUNT(explicit_lyrics) as with_explicit_info,
        COUNT(streaming_links) as with_streaming_links
      FROM releases
    `);
    
    const releaseData = releaseStats.rows[0];
    console.log(`Всего релизов: ${releaseData.total_releases}`);
    console.log(`С Deezer ID: ${releaseData.with_deezer_id} (${Math.round(releaseData.with_deezer_id / releaseData.total_releases * 100)}%)`);
    console.log(`С iTunes ID: ${releaseData.with_itunes_id} (${Math.round(releaseData.with_itunes_id / releaseData.total_releases * 100)}%)`);
    console.log(`С Яндекс ID: ${releaseData.with_yandex_id} (${Math.round(releaseData.with_yandex_id / releaseData.total_releases * 100)}%)`);
    console.log(`С обложкой: ${releaseData.with_cover} (${Math.round(releaseData.with_cover / releaseData.total_releases * 100)}%)`);
    console.log(`С маленькой обложкой: ${releaseData.with_cover_small} (${Math.round(releaseData.with_cover_small / releaseData.total_releases * 100)}%)`);
    console.log(`С средней обложкой: ${releaseData.with_cover_medium} (${Math.round(releaseData.with_cover_medium / releaseData.total_releases * 100)}%)`);
    console.log(`С большой обложкой: ${releaseData.with_cover_big} (${Math.round(releaseData.with_cover_big / releaseData.total_releases * 100)}%)`);
    console.log(`С XL обложкой: ${releaseData.with_cover_xl} (${Math.round(releaseData.with_cover_xl / releaseData.total_releases * 100)}%)`);
    console.log(`С длительностью: ${releaseData.with_duration} (${Math.round(releaseData.with_duration / releaseData.total_releases * 100)}%)`);
    console.log(`С жанрами: ${releaseData.with_genres} (${Math.round(releaseData.with_genres / releaseData.total_releases * 100)}%)`);
    console.log(`С UPC: ${releaseData.with_upc} (${Math.round(releaseData.with_upc / releaseData.total_releases * 100)}%)`);
    console.log(`С лейблом: ${releaseData.with_label} (${Math.round(releaseData.with_label / releaseData.total_releases * 100)}%)`);
    console.log(`С участниками: ${releaseData.with_contributors} (${Math.round(releaseData.with_contributors / releaseData.total_releases * 100)}%)`);
    console.log(`С explicit info: ${releaseData.with_explicit_info} (${Math.round(releaseData.with_explicit_info / releaseData.total_releases * 100)}%)`);
    console.log(`Со streaming links: ${releaseData.with_streaming_links} (${Math.round(releaseData.with_streaming_links / releaseData.total_releases * 100)}%)`);
    
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(50));
    
    // Анализируем проблемы
    const issues = [];
    
    if (artistData.with_deezer_id / artistData.total_artists < 0.8) {
      issues.push('❌ Мало артистов с Deezer ID - проверьте поиск в Deezer API');
    }
    
    if (releaseData.with_cover / releaseData.total_releases < 0.9) {
      issues.push('❌ Мало релизов с обложками - проверьте получение cover URLs');
    }
    
    if (releaseData.with_duration / releaseData.total_releases < 0.5) {
      issues.push('❌ Мало релизов с длительностью - проверьте получение duration от API');
    }
    
    if (releaseData.with_genres / releaseData.total_releases < 0.7) {
      issues.push('❌ Мало релизов с жанрами - проверьте обработку genres');
    }
    
    if (releaseData.with_streaming_links / releaseData.total_releases < 0.8) {
      issues.push('❌ Мало релизов со streaming links - проверьте создание ссылок');
    }
    
    if (issues.length === 0) {
      console.log('✅ Качество данных хорошее! Все основные поля заполнены.');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    console.log('\n📈 ТОП АРТИСТОВ ПО КОЛИЧЕСТВУ РЕЛИЗОВ:');
    console.log('='.repeat(50));
    
    const topArtists = await db.execute(sql`
      SELECT 
        a.name,
        COUNT(r.id) as release_count,
        a.deezer_id,
        a.itunes_id,
        a.image_url
      FROM artists a
      LEFT JOIN releases r ON a.id = r.artist_id
      GROUP BY a.id, a.name, a.deezer_id, a.itunes_id, a.image_url
      ORDER BY release_count DESC
      LIMIT 10
    `);
    
    topArtists.rows.forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name} - ${artist.release_count} релизов (Deezer: ${artist.deezer_id ? '✅' : '❌'}, iTunes: ${artist.itunes_id ? '✅' : '❌'}, Image: ${artist.image_url ? '✅' : '❌'})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    process.exit(0);
  }
}

checkImportQuality();
