// Массовое обновление дат релизов через iTunes API
import { musicAPI } from './server/combined-music-api.ts';
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { releases } from './shared/schema.ts';

async function updateReleaseDates() {
    console.log('🚀 Начинаем массовое обновление дат релизов...\n');
    
    // Получаем все релизы без дат
    const result = await db.execute(sql.raw(`
        SELECT 
            r.id,
            r.title as release_title,
            a.name as artist_name
        FROM releases r
        JOIN artists a ON r.artist_id = a.id
        WHERE r.release_date IS NULL
        ORDER BY r.id
    `));
    
    const totalReleases = result.rows.length;
    console.log(`📊 Найдено релизов без дат: ${totalReleases}\n`);
    
    if (totalReleases === 0) {
        console.log('✅ Все релизы уже имеют даты!');
        return;
    }
    
    let processed = 0;
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    
    // Обработка батчами по 50 релизов для безопасности
    const batchSize = 50;
    const totalBatches = Math.ceil(totalReleases / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, totalReleases);
        const batch = result.rows.slice(startIndex, endIndex);
        
        console.log(`\n📦 Батч ${batchIndex + 1}/${totalBatches} (релизы ${startIndex + 1}-${endIndex})`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        for (const release of batch) {
            processed++;
            const artistName = String(release.artist_name);
            const releaseTitle = String(release.release_title);
            
            // Показываем прогресс
            const progressPercent = Math.round((processed / totalReleases) * 100);
            console.log(`[${processed}/${totalReleases}] (${progressPercent}%) ${artistName} - ${releaseTitle}`);
            
            try {
                const foundDate = await musicAPI.findReleaseDate(artistName, releaseTitle);
                
                if (foundDate) {
                    // Обновляем дату в базе данных
                    await db.update(releases)
                        .set({ releaseDate: foundDate })
                        .where(sql`id = ${release.id}`);
                    
                    updated++;
                    console.log(`  ✅ Обновлено: ${foundDate}`);
                } else {
                    notFound++;
                    console.log(`  ❌ Дата не найдена`);
                }
                
            } catch (error) {
                errors++;
                console.log(`  ⚠️ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            // Задержка между запросами (0.5 секунды)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Промежуточная статистика после каждого батча
        console.log(`\n📈 Статистика батча:`);
        console.log(`✅ Обновлено: ${updated}`);
        console.log(`❌ Не найдено: ${notFound}`);
        console.log(`⚠️ Ошибок: ${errors}`);
        console.log(`📊 Общий прогресс: ${processed}/${totalReleases}`);
        
        // Пауза между батчами (2 секунды)
        if (batchIndex < totalBatches - 1) {
            console.log('\n⏸️ Пауза между батчами...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Финальная статистика
    const successRate = Math.round((updated / totalReleases) * 100);
    
    console.log('\n🎯 ФИНАЛЬНЫЕ РЕЗУЛЬТАТЫ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Всего обработано: ${totalReleases} релизов`);
    console.log(`✅ Даты найдены и обновлены: ${updated}`);
    console.log(`❌ Даты не найдены: ${notFound}`);
    console.log(`⚠️ Ошибок обработки: ${errors}`);
    console.log(`📈 Эффективность: ${successRate}%`);
    console.log(`🎵 Релизов с датами стало больше на ${updated}!`);
    
    if (updated > 0) {
        console.log(`\n🚀 Успешно обновлены ${updated} релизов! Качество данных значительно улучшено.`);
    }
}

updateReleaseDates().catch(console.error);