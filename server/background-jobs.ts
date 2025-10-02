import { sql } from 'drizzle-orm';
import { db } from './db';
import { importJobs, InsertImportJob, releases, artists, autoImportPlaylists } from '@shared/schema';
import { importFromRussianPlaylist } from './music-importer';
import { musicAPI } from './combined-music-api';

// In-memory job processing queue
const activeJobs = new Map<number, { cancel: boolean }>();

export async function createImportJob(data: InsertImportJob): Promise<number> {
  const [job] = await db.insert(importJobs).values(data).returning();
  
  // Start processing in background (don't await)
  processImportJob(job.id).catch(error => {
    console.error(`❌ Background job ${job.id} failed:`, error);
    updateJobStatus(job.id, 'failed', error.message).catch(console.error);
  });
  
  return job.id;
}

export async function getImportJob(jobId: number) {
  const job = await db.select().from(importJobs).where(sql`id = ${jobId}`).limit(1);
  return job[0] || null;
}

export async function getAllImportJobs(userId?: string) {
  return await db.select().from(importJobs)
    .orderBy(sql`created_at DESC`)
    .limit(20);
}

export async function cancelImportJob(jobId: number): Promise<boolean> {
  const jobControl = activeJobs.get(jobId);
  if (jobControl) {
    jobControl.cancel = true;
    return true;
  }
  return false;
}

async function updateJobStatus(
  jobId: number, 
  status: string, 
  errorMessage?: string,
  updates?: Partial<{
    progress: number;
    totalArtists: number;
    processedArtists: number;
    newReleases: number;
    skippedReleases: number;
    errors: number;
  }>
) {
  const updateData: any = { status };
  
  if (errorMessage) updateData.errorMessage = errorMessage;
  if (status === 'processing' && !updates?.progress) updateData.startedAt = new Date();
  if (status === 'completed' || status === 'failed') updateData.completedAt = new Date();
  
  if (updates) {
    Object.assign(updateData, updates);
  }
  
  await db.update(importJobs)
    .set(updateData)
    .where(sql`id = ${jobId}`);
}

async function processImportJob(jobId: number) {
  console.log(`🎵 Starting background import job ${jobId}`);
  
  // Register job for cancellation
  const jobControl = { cancel: false };
  activeJobs.set(jobId, jobControl);
  
  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing');
    
    // Get job details
    const job = await getImportJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Check for cancellation
    if (jobControl.cancel) {
      await updateJobStatus(jobId, 'failed', 'Job was cancelled');
      return;
    }
    
    // Create progress callback
    const onProgress = async (stats: {
      totalArtists: number;
      processedArtists: number;
      newReleases: number;
      skippedReleases: number;
      errors: number;
    }) => {
      // Check for cancellation
      if (jobControl.cancel) {
        throw new Error('Job was cancelled');
      }
      
      const progress = Math.round((stats.processedArtists / stats.totalArtists) * 100);
      
      await updateJobStatus(jobId, 'processing', undefined, {
        progress,
        totalArtists: stats.totalArtists,
        processedArtists: stats.processedArtists,
        newReleases: stats.newReleases,
        skippedReleases: stats.skippedReleases,
        errors: stats.errors,
      });
      
      console.log(`📊 Job ${jobId} progress: ${progress}% (${stats.processedArtists}/${stats.totalArtists} artists)`);
    };
    
    // Get playlist URL by ID
    const playlist = await db.select().from(autoImportPlaylists).where(sql`id = ${job.playlist_id}`).limit(1);
    if (!playlist[0]) {
      throw new Error(`Playlist with ID ${job.playlist_id} not found`);
    }
    
    // Run the import with progress tracking
    console.log(`🎵 Processing playlist: ${playlist[0].url}`);
    const result = await importFromRussianPlaylist(playlist[0].url);
    
    // Final update
    await updateJobStatus(jobId, 'completed', undefined, {
      progress: 100,
      totalArtists: 0, // TODO: get this from playlist parsing
      processedArtists: 0, // TODO: get this from playlist parsing 
      newReleases: result.newReleases,
      skippedReleases: result.skippedReleases,
      errors: result.errors.length,
    });
    
    console.log(`✅ Background job ${jobId} completed: ${result.newReleases} new releases`);
    
  } catch (error) {
    console.error(`❌ Background job ${jobId} failed:`, error);
    await updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : String(error));
  } finally {
    // Clean up
    activeJobs.delete(jobId);
  }
}

// For now, we use the original import function without progress callbacks
// TODO: Modify importFromRussianPlaylist to support progress callbacks

// Background job для заполнения пропущенных дат релизов через iTunes API
export async function fillMissingReleaseDates(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  console.log('📅 Starting background job to fill missing release dates...');
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  try {
    // Получаем релизы без дат (лимит для обработки)
    const releasesWithoutDates = await db
      .select({
        releaseId: releases.id,
        releaseTitle: releases.title,
        artistName: artists.name,
      })
      .from(releases)
      .innerJoin(artists, sql`${releases.artistId} = ${artists.id}`)
      .where(sql`${releases.releaseDate} IS NULL`)
      .limit(50); // Ограничиваем, чтобы не перегружать iTunes API
    
    console.log(`📅 Найдено ${releasesWithoutDates.length} релизов без дат`);
    
    for (const release of releasesWithoutDates) {
      try {
        processed++;
        
        // Ищем дату через iTunes API
        const releaseDate = await musicAPI.findReleaseDate(
          release.artistName, 
          release.releaseTitle
        );
        
        if (releaseDate) {
          // Обновляем релиз с найденной датой
          await db
            .update(releases)
            .set({ releaseDate: new Date(releaseDate) })
            .where(sql`id = ${release.releaseId}`);
          
          updated++;
          console.log(`✅ Обновлен "${release.releaseTitle}" (${release.artistName}): ${releaseDate}`);
        } else {
          console.log(`❌ Дата не найдена для "${release.releaseTitle}" (${release.artistName})`);
        }
        
        // Пауза между запросами к iTunes API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errors++;
        console.error(`❌ Ошибка при обработке "${release.releaseTitle}":`, error);
      }
    }
    
    console.log(`📅 Завершено: обработано ${processed}, обновлено ${updated}, ошибок ${errors}`);
    return { processed, updated, errors };
    
  } catch (error) {
    console.error('❌ Ошибка в background job fillMissingReleaseDates:', error);
    throw error;
  }
}