import 'dotenv/config';
import { db } from '../server/db.js';
import { storage } from '../server/storage.js';
import { ServiceContainer } from '../server/services/index.js';
import { CacheService } from '../server/cache/CacheService.js';

async function testCacheInvalidation() {
  console.log('🧪 Тестирование инвалидации кэша коллекций...');
  
  try {
    const services = new ServiceContainer(storage);
    const cache = CacheService.getInstance();
    
    // Получаем все коллекции (должно закэшироваться)
    console.log('1. Получаем активные коллекции...');
    const activeCollections = await services.collections.getCollections(true);
    console.log(`   Найдено активных коллекций: ${activeCollections.length}`);
    
    // Получаем неактивные коллекции (должно закэшироваться)
    console.log('2. Получаем неактивные коллекции...');
    const inactiveCollections = await services.collections.getCollections(false);
    console.log(`   Найдено неактивных коллекций: ${inactiveCollections.length}`);
    
    // Проверяем кэш
    console.log('3. Проверяем кэш...');
    const cachedActive = await cache.get('collections:true');
    const cachedInactive = await cache.get('collections:false');
    console.log(`   Кэш активных коллекций: ${cachedActive ? 'есть' : 'нет'}`);
    console.log(`   Кэш неактивных коллекций: ${cachedInactive ? 'есть' : 'нет'}`);
    
    // Если есть коллекции, попробуем обновить одну
    if (activeCollections.length > 0) {
      const collectionId = activeCollections[0].id;
      console.log(`4. Обновляем коллекцию ${collectionId}...`);
      
      // Обновляем коллекцию (должно инвалидировать кэш)
      await services.collections.updateCollection(collectionId, {
        title: activeCollections[0].title + ' (обновлено)'
      });
      
      // Проверяем, что кэш инвалидирован
      console.log('5. Проверяем инвалидацию кэша...');
      const cachedActiveAfter = await cache.get('collections:true');
      const cachedInactiveAfter = await cache.get('collections:false');
      console.log(`   Кэш активных коллекций после обновления: ${cachedActiveAfter ? 'есть' : 'нет'}`);
      console.log(`   Кэш неактивных коллекций после обновления: ${cachedInactiveAfter ? 'есть' : 'нет'}`);
      
      // Возвращаем оригинальное название
      await services.collections.updateCollection(collectionId, {
        title: activeCollections[0].title
      });
    }
    
    console.log('✅ Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании кэша:', error);
  } finally {
    // Закрываем соединение с базой данных
    await db.end();
  }
}

testCacheInvalidation();
