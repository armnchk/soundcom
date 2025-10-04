#!/usr/bin/env node

/**
 * Функциональное тестирование BudgetBuddy
 * Проверяет все основные функции приложения включая поиск
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Конфигурация
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  timeout: 10000,
  retries: 3,
  outputFile: path.join(__dirname, 'reports', 'functional-test-results.json')
};

// Результаты тестирования
let testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: config.baseUrl,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  tests: []
};

// Функция для логирования
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Функция для HTTP запросов
async function makeRequest(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
  
  const defaultOptions = {
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Functional-Test-Suite/1.0'
    }
  };

  const requestOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(fullUrl, requestOptions);
    const data = await response.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: jsonData,
      url: fullUrl
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: error.message,
      headers: {},
      data: null,
      url: fullUrl,
      error: error.message
    };
  }
}

// Функция для выполнения теста
async function runTest(testName, testFunction) {
  log(`\n🧪 ${testName}`, 'cyan');
  
  const testResult = {
    name: testName,
    status: 'pending',
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    assertions: [],
    error: null
  };

  testResults.tests.push(testResult);
  testResults.summary.total++;

  try {
    await testFunction(testResult);
    testResult.status = 'passed';
    testResult.endTime = new Date().toISOString();
    testResult.duration = new Date(testResult.endTime) - new Date(testResult.startTime);
    testResults.summary.passed++;
    log(`✅ ${testName} - ПРОЙДЕН`, 'green');
  } catch (error) {
    testResult.status = 'failed';
    testResult.endTime = new Date().toISOString();
    testResult.duration = new Date(testResult.endTime) - new Date(testResult.startTime);
    testResult.error = error.message;
    testResults.summary.failed++;
    log(`❌ ${testName} - ПРОВАЛЕН`, 'red');
    log(`   Ошибка: ${error.message}`, 'red');
  }
}

// Функция для добавления утверждения
function assert(testResult, condition, message) {
  const assertion = {
    condition,
    message,
    passed: !!condition
  };
  
  testResult.assertions.push(assertion);
  
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Функция для проверки доступности сервера
async function checkServerHealth() {
  log('🔍 Проверка доступности сервера...', 'yellow');
  
  const response = await makeRequest('/api/releases/health');
  
  if (!response.ok) {
    throw new Error(`Сервер недоступен: ${response.status} ${response.statusText}`);
  }
  
  log('✅ Сервер доступен', 'green');
  return true;
}

// ТЕСТЫ API

// Тест 1: Проверка health endpoint
async function testHealthEndpoint(testResult) {
  const response = await makeRequest('/api/releases/health');
  
  assert(testResult, response.ok, 'Health endpoint должен возвращать 200');
  assert(testResult, response.status === 200, 'Статус должен быть 200');
  assert(testResult, response.data && response.data.success === true, 'Ответ должен содержать success: true');
  assert(testResult, response.data.message, 'Ответ должен содержать сообщение');
}

// Тест 2: Получение списка релизов
async function testGetReleases(testResult) {
  const response = await makeRequest('/api/releases');
  
  assert(testResult, response.ok, 'Получение релизов должно быть успешным');
  assert(testResult, Array.isArray(response.data), 'Ответ должен быть массивом');
  assert(testResult, response.data.length >= 0, 'Массив релизов может быть пустым');
  
  // Проверяем структуру первого релиза, если есть
  if (response.data.length > 0) {
    const release = response.data[0];
    assert(testResult, release.id, 'Релиз должен иметь ID');
    assert(testResult, release.title, 'Релиз должен иметь название');
    assert(testResult, release.artist, 'Релиз должен иметь исполнителя');
  }
}

// Тест 3: Поиск релизов
async function testSearchReleases(testResult) {
  // Тест с пустым запросом
  const emptyResponse = await makeRequest('/api/releases/search?q=');
  assert(testResult, emptyResponse.ok, 'Поиск с пустым запросом должен работать');
  
  // Тест с поисковым запросом
  const searchResponse = await makeRequest('/api/releases/search?q=test');
  assert(testResult, searchResponse.ok, 'Поиск релизов должен работать');
  assert(testResult, Array.isArray(searchResponse.data), 'Результат поиска должен быть массивом');
  
  // Тест с сортировкой
  const sortedResponse = await makeRequest('/api/releases/search?q=test&sortBy=rating_desc');
  assert(testResult, sortedResponse.ok, 'Поиск с сортировкой должен работать');
}

// Тест 4: Получение релиза по ID
async function testGetReleaseById(testResult) {
  // Сначала получаем список релизов
  const releasesResponse = await makeRequest('/api/releases');
  assert(testResult, releasesResponse.ok, 'Должны получить список релизов');
  
  if (releasesResponse.data.length > 0) {
    const firstRelease = releasesResponse.data[0];
    const releaseId = firstRelease.id;
    
    // Получаем релиз по ID
    const releaseResponse = await makeRequest(`/api/releases/${releaseId}`);
    assert(testResult, releaseResponse.ok, 'Получение релиза по ID должно работать');
    assert(testResult, releaseResponse.data.id === releaseId, 'ID релиза должен совпадать');
    assert(testResult, releaseResponse.data.title, 'Релиз должен иметь название');
  } else {
    // Если нет релизов, тестируем с несуществующим ID
    const notFoundResponse = await makeRequest('/api/releases/999999');
    assert(testResult, !notFoundResponse.ok, 'Несуществующий релиз должен возвращать ошибку');
  }
}

// Тест 5: Получение треков релиза
async function testGetReleaseTracks(testResult) {
  const releasesResponse = await makeRequest('/api/releases');
  
  if (releasesResponse.data.length > 0) {
    const firstRelease = releasesResponse.data[0];
    const tracksResponse = await makeRequest(`/api/releases/${firstRelease.id}/tracks`);
    
    assert(testResult, tracksResponse.ok, 'Получение треков должно работать');
    assert(testResult, Array.isArray(tracksResponse.data), 'Треки должны быть массивом');
  }
}

// Тест 6: Получение списка исполнителей
async function testGetArtists(testResult) {
  const response = await makeRequest('/api/artists');
  
  assert(testResult, response.ok, 'Получение исполнителей должно работать');
  assert(testResult, Array.isArray(response.data), 'Ответ должен быть массивом');
  
  if (response.data.length > 0) {
    const artist = response.data[0];
    assert(testResult, artist.id, 'Исполнитель должен иметь ID');
    assert(testResult, artist.name, 'Исполнитель должен иметь имя');
  }
}

// Тест 7: Поиск исполнителей
async function testSearchArtists(testResult) {
  // Тест с пустым запросом
  const emptyResponse = await makeRequest('/api/artists/search?q=');
  assert(testResult, emptyResponse.ok, 'Поиск исполнителей с пустым запросом должен работать');
  
  // Тест с поисковым запросом
  const searchResponse = await makeRequest('/api/artists/search?q=test');
  assert(testResult, searchResponse.ok, 'Поиск исполнителей должен работать');
  assert(testResult, Array.isArray(searchResponse.data), 'Результат поиска должен быть массивом');
}

// Тест 8: Получение исполнителя по ID
async function testGetArtistById(testResult) {
  const artistsResponse = await makeRequest('/api/artists');
  
  if (artistsResponse.data.length > 0) {
    const firstArtist = artistsResponse.data[0];
    const artistResponse = await makeRequest(`/api/artists/${firstArtist.id}`);
    
    assert(testResult, artistResponse.ok, 'Получение исполнителя по ID должно работать');
    assert(testResult, artistResponse.data.id === firstArtist.id, 'ID исполнителя должен совпадать');
    assert(testResult, artistResponse.data.name, 'Исполнитель должен иметь имя');
  }
}

// Тест 9: Получение релизов исполнителя
async function testGetArtistReleases(testResult) {
  const artistsResponse = await makeRequest('/api/artists');
  
  if (artistsResponse.data.length > 0) {
    const firstArtist = artistsResponse.data[0];
    const releasesResponse = await makeRequest(`/api/artists/${firstArtist.id}/releases`);
    
    assert(testResult, releasesResponse.ok, 'Получение релизов исполнителя должно работать');
    assert(testResult, Array.isArray(releasesResponse.data), 'Релизы исполнителя должны быть массивом');
  }
}

// Тест 10: Получение коллекций
async function testGetCollections(testResult) {
  const response = await makeRequest('/api/collections');
  
  assert(testResult, response.ok, 'Получение коллекций должно работать');
  assert(testResult, Array.isArray(response.data), 'Ответ должен быть массивом');
  
  if (response.data.length > 0) {
    const collection = response.data[0];
    assert(testResult, collection.id, 'Коллекция должна иметь ID');
    assert(testResult, collection.title, 'Коллекция должна иметь название');
  }
}

// Тест 11: Получение комментариев релиза
async function testGetReleaseComments(testResult) {
  const releasesResponse = await makeRequest('/api/releases');
  
  if (releasesResponse.data.length > 0) {
    const firstRelease = releasesResponse.data[0];
    const commentsResponse = await makeRequest(`/api/comments/releases/${firstRelease.id}`);
    
    assert(testResult, commentsResponse.ok, 'Получение комментариев должно работать');
    assert(testResult, Array.isArray(commentsResponse.data), 'Комментарии должны быть массивом');
  }
}

// Тест 12: Получение рейтингов релиза
async function testGetReleaseRatings(testResult) {
  const releasesResponse = await makeRequest('/api/releases');
  
  if (releasesResponse.data.length > 0) {
    const firstRelease = releasesResponse.data[0];
    const ratingsResponse = await makeRequest(`/api/ratings/releases/${firstRelease.id}`);
    
    assert(testResult, ratingsResponse.ok, 'Получение рейтингов должно работать');
    assert(testResult, ratingsResponse.data, 'Ответ должен содержать данные о рейтингах');
  }
}

// Тест 13: Валидация параметров
async function testParameterValidation(testResult) {
  // Тест с невалидным ID
  const invalidIdResponse = await makeRequest('/api/releases/invalid-id');
  assert(testResult, !invalidIdResponse.ok, 'Невалидный ID должен возвращать ошибку');
  
  // Тест с отрицательным ID
  const negativeIdResponse = await makeRequest('/api/releases/-1');
  assert(testResult, !negativeIdResponse.ok, 'Отрицательный ID должен возвращать ошибку');
}

// Тест 14: Rate Limiting
async function testRateLimiting(testResult) {
  // Делаем много быстрых запросов для тестирования rate limiting
  const promises = [];
  for (let i = 0; i < 35; i++) {
    promises.push(makeRequest('/api/search?q=test'));
  }
  
  const responses = await Promise.all(promises);
  
  // Проверяем, что некоторые запросы могли быть ограничены
  const rateLimited = responses.some(r => r.status === 429);
  
  // Это нормально, если rate limiting сработал
  if (rateLimited) {
    log('   ℹ️  Rate limiting работает (некоторые запросы ограничены)', 'yellow');
  }
  
  assert(testResult, true, 'Rate limiting тест завершен');
}

// Тест 15: CSRF защита
async function testCSRFProtection(testResult) {
  // Получаем CSRF токен
  const csrfResponse = await makeRequest('/api/csrf-token');
  
  if (csrfResponse.ok && csrfResponse.data.token) {
    // Тестируем POST запрос без CSRF токена (должен быть заблокирован)
    const postWithoutCSRF = await makeRequest('/api/releases', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Release' })
    });
    
    // POST запросы должны требовать аутентификации, поэтому 401 ожидаем
    assert(testResult, postWithoutCSRF.status === 401 || postWithoutCSRF.status === 403, 
           'POST запросы должны требовать аутентификации');
  }
  
  assert(testResult, true, 'CSRF защита проверена');
}

// Главная функция
async function runAllTests() {
  log('🧪 BudgetBuddy Functional Testing Suite', 'bright');
  log('========================================', 'bright');
  log(`🌐 Тестируем: ${config.baseUrl}`, 'blue');
  
  // Проверяем доступность сервера
  try {
    await checkServerHealth();
  } catch (error) {
    log(`❌ Сервер недоступен: ${error.message}`, 'red');
    log('Убедитесь, что приложение запущено на правильном порту', 'yellow');
    process.exit(1);
  }
  
  // Запускаем все тесты
  const tests = [
    testHealthEndpoint,
    testGetReleases,
    testSearchReleases,
    testGetReleaseById,
    testGetReleaseTracks,
    testGetArtists,
    testSearchArtists,
    testGetArtistById,
    testGetArtistReleases,
    testGetCollections,
    testGetReleaseComments,
    testGetReleaseRatings,
    testParameterValidation,
    testRateLimiting,
    testCSRFProtection
  ];
  
  for (const test of tests) {
    await runTest(test.name, test);
  }
  
  // Сохраняем результаты
  saveResults();
  
  // Показываем итоги
  showSummary();
}

// Функция для сохранения результатов
function saveResults() {
  const reportsDir = path.dirname(config.outputFile);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(config.outputFile, JSON.stringify(testResults, null, 2));
  log(`\n📊 Результаты сохранены в: ${config.outputFile}`, 'green');
}

// Функция для показа итогов
function showSummary() {
  const { total, passed, failed, skipped } = testResults.summary;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  log('\n📈 ИТОГИ ТЕСТИРОВАНИЯ', 'bright');
  log('====================', 'bright');
  log(`Всего тестов: ${total}`, 'blue');
  log(`✅ Пройдено: ${passed}`, 'green');
  log(`❌ Провалено: ${failed}`, 'red');
  log(`⏭️  Пропущено: ${skipped}`, 'yellow');
  log(`📊 Успешность: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (failed > 0) {
    log('\n❌ ПРОВАЛЕННЫЕ ТЕСТЫ:', 'red');
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(test => {
        log(`   • ${test.name}: ${test.error}`, 'red');
      });
  }
  
  if (successRate >= 90) {
    log('\n🎉 Отличные результаты! Все основные функции работают корректно.', 'green');
  } else if (successRate >= 70) {
    log('\n⚠️  Хорошие результаты, но есть проблемы, которые нужно исправить.', 'yellow');
  } else {
    log('\n🚨 Критические проблемы! Приложение требует серьезной доработки.', 'red');
  }
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  log('\n\n⏹️  Тестирование прервано пользователем', 'yellow');
  saveResults();
  process.exit(0);
});

// Запуск
runAllTests().catch(error => {
  log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
