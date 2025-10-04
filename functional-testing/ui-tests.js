#!/usr/bin/env node

/**
 * Тесты пользовательского интерфейса для BudgetBuddy
 * Проверяет фронтенд функциональность через API
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
  timeout: 10000
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
      'User-Agent': 'UI-Test-Suite/1.0'
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

// Тест главной страницы
async function testHomePage() {
  log('\n🏠 ТЕСТИРОВАНИЕ ГЛАВНОЙ СТРАНИЦЫ', 'bright');
  log('=================================', 'bright');
  
  const response = await makeRequest('/');
  
  const result = {
    name: 'Главная страница',
    passed: false,
    issues: []
  };
  
  if (!response.ok) {
    result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
  }
  
  if (response.data && typeof response.data === 'string') {
    // Проверяем, что это HTML страница
    if (!response.data.includes('<html') && !response.data.includes('<!DOCTYPE')) {
      result.issues.push('Ответ не является HTML страницей');
    }
    
    // Проверяем наличие основных элементов
    if (!response.data.includes('BudgetBuddy') && !response.data.includes('музык')) {
      result.issues.push('Страница не содержит ожидаемого контента');
    }
  }
  
  result.passed = result.issues.length === 0;
  
  if (result.passed) {
    log('   ✅ Главная страница загружается корректно', 'green');
  } else {
    log('   ❌ Проблемы с главной страницей', 'red');
    result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
  }
  
  return result;
}

// Тест API endpoints для UI
async function testUIAPIEndpoints() {
  log('\n🔌 ТЕСТИРОВАНИЕ API ДЛЯ UI', 'bright');
  log('============================', 'bright');
  
  const endpoints = [
    { url: '/api/releases', name: 'Получение релизов' },
    { url: '/api/artists', name: 'Получение исполнителей' },
    { url: '/api/collections', name: 'Получение коллекций' },
    { url: '/api/releases/search?q=test', name: 'Поиск релизов' },
    { url: '/api/artists/search?q=test', name: 'Поиск исполнителей' },
    { url: '/api/csrf-token', name: 'Получение CSRF токена' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const response = await makeRequest(endpoint.url);
    
    const result = {
      name: endpoint.name,
      url: endpoint.url,
      passed: false,
      issues: []
    };
    
    if (!response.ok) {
      result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
    }
    
    if (response.data === null) {
      result.issues.push('Пустой ответ от сервера');
    }
    
    // Проверяем CORS заголовки
    if (!response.headers['access-control-allow-origin']) {
      result.issues.push('Отсутствуют CORS заголовки');
    }
    
    result.passed = result.issues.length === 0;
    results.push(result);
    
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    
    log(`   ${status} ${endpoint.name}`, color);
    
    if (!result.passed) {
      result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
    }
  }
  
  return results;
}

// Тест пагинации
async function testPagination() {
  log('\n📄 ТЕСТИРОВАНИЕ ПАГИНАЦИИ', 'bright');
  log('==========================', 'bright');
  
  const results = [];
  
  // Тест пагинации релизов
  const paginationTests = [
    { url: '/api/releases?limit=5', name: 'Релизы с лимитом 5' },
    { url: '/api/releases?limit=10', name: 'Релизы с лимитом 10' },
    { url: '/api/releases?limit=50', name: 'Релизы с лимитом 50' },
    { url: '/api/artists?limit=5', name: 'Исполнители с лимитом 5' }
  ];
  
  for (const test of paginationTests) {
    const response = await makeRequest(test.url);
    
    const result = {
      name: test.name,
      passed: false,
      issues: []
    };
    
    if (!response.ok) {
      result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
    }
    
    if (response.data && Array.isArray(response.data)) {
      const limit = parseInt(test.url.split('limit=')[1]);
      if (response.data.length > limit) {
        result.issues.push(`Получено ${response.data.length} элементов, ожидалось максимум ${limit}`);
      }
    }
    
    result.passed = result.issues.length === 0;
    results.push(result);
    
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    
    log(`   ${status} ${test.name}`, color);
    
    if (!result.passed) {
      result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
    }
  }
  
  return results;
}

// Тест фильтрации
async function testFiltering() {
  log('\n🔍 ТЕСТИРОВАНИЕ ФИЛЬТРАЦИИ', 'bright');
  log('===========================', 'bright');
  
  const results = [];
  
  // Тест фильтрации релизов
  const filterTests = [
    { url: '/api/releases?genre=rock', name: 'Фильтр по жанру: rock' },
    { url: '/api/releases?year=2023', name: 'Фильтр по году: 2023' },
    { url: '/api/releases?genre=pop&year=2022', name: 'Комбинированный фильтр' }
  ];
  
  for (const test of filterTests) {
    const response = await makeRequest(test.url);
    
    const result = {
      name: test.name,
      passed: false,
      issues: []
    };
    
    if (!response.ok) {
      result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
    }
    
    if (response.data && Array.isArray(response.data)) {
      // Проверяем, что фильтрация работает
      if (test.url.includes('genre=rock') && response.data.length > 0) {
        const hasRockGenre = response.data.some(release => 
          release.genres && release.genres.includes('rock')
        );
        if (!hasRockGenre) {
          result.issues.push('Фильтр по жанру не работает корректно');
        }
      }
    }
    
    result.passed = result.issues.length === 0;
    results.push(result);
    
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    
    log(`   ${status} ${test.name}`, color);
    
    if (!result.passed) {
      result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
    }
  }
  
  return results;
}

// Тест сортировки
async function testSorting() {
  log('\n📊 ТЕСТИРОВАНИЕ СОРТИРОВКИ', 'bright');
  log('===========================', 'bright');
  
  const results = [];
  
  // Тест сортировки релизов
  const sortTests = [
    { url: '/api/releases/search?q=test&sortBy=rating_desc', name: 'Сортировка по рейтингу (убывание)' },
    { url: '/api/releases/search?q=test&sortBy=rating_asc', name: 'Сортировка по рейтингу (возрастание)' },
    { url: '/api/releases/search?q=test&sortBy=date_desc', name: 'Сортировка по дате (убывание)' },
    { url: '/api/releases/search?q=test&sortBy=date_asc', name: 'Сортировка по дате (возрастание)' }
  ];
  
  for (const test of sortTests) {
    const response = await makeRequest(test.url);
    
    const result = {
      name: test.name,
      passed: false,
      issues: []
    };
    
    if (!response.ok) {
      result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
    }
    
    if (response.data && Array.isArray(response.data) && response.data.length > 1) {
      // Проверяем правильность сортировки
      const isDesc = test.url.includes('_desc');
      const isRating = test.url.includes('rating');
      
      if (isRating) {
        const ratings = response.data.map(r => r.averageRating || 0);
        const isSorted = isDesc ? 
          ratings.every((val, i) => i === 0 || val <= ratings[i-1]) :
          ratings.every((val, i) => i === 0 || val >= ratings[i-1]);
        
        if (!isSorted) {
          result.issues.push('Сортировка работает некорректно');
        }
      }
    }
    
    result.passed = result.issues.length === 0;
    results.push(result);
    
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    
    log(`   ${status} ${test.name}`, color);
    
    if (!result.passed) {
      result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
    }
  }
  
  return results;
}

// Тест производительности UI
async function testUIPerformance() {
  log('\n⚡ ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ UI', 'bright');
  log('======================================', 'bright');
  
  const results = [];
  
  // Тестируем время загрузки основных страниц
  const performanceTests = [
    { url: '/', name: 'Главная страница' },
    { url: '/api/releases', name: 'API релизов' },
    { url: '/api/artists', name: 'API исполнителей' },
    { url: '/api/collections', name: 'API коллекций' },
    { url: '/api/releases/search?q=test', name: 'Поиск релизов' }
  ];
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    const response = await makeRequest(test.url);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = {
      name: test.name,
      duration,
      success: response.ok,
      passed: false,
      issues: []
    };
    
    if (!response.ok) {
      result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
    }
    
    // Проверяем время отклика
    if (duration > 5000) {
      result.issues.push(`Медленный отклик: ${duration}ms`);
    } else if (duration > 2000) {
      result.issues.push(`Замедленный отклик: ${duration}ms`);
    }
    
    result.passed = result.issues.length === 0;
    results.push(result);
    
    const status = result.passed ? '✅' : '⚠️';
    const color = duration < 1000 ? 'green' : duration < 3000 ? 'yellow' : 'red';
    
    log(`   ${status} ${test.name}: ${duration}ms`, color);
    
    if (!result.passed) {
      result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
    }
  }
  
  return results;
}

// Главная функция
async function runAllUITests() {
  log('🖥️  BudgetBuddy UI Testing Suite', 'bright');
  log('=================================', 'bright');
  log(`🌐 Тестируем: ${config.baseUrl}`, 'blue');
  
  const allResults = {
    timestamp: new Date().toISOString(),
    baseUrl: config.baseUrl,
    tests: {
      homePage: null,
      apiEndpoints: [],
      pagination: [],
      filtering: [],
      sorting: [],
      performance: []
    }
  };
  
  try {
    // Тестируем главную страницу
    allResults.tests.homePage = await testHomePage();
    
    // Тестируем API endpoints
    allResults.tests.apiEndpoints = await testUIAPIEndpoints();
    
    // Тестируем пагинацию
    allResults.tests.pagination = await testPagination();
    
    // Тестируем фильтрацию
    allResults.tests.filtering = await testFiltering();
    
    // Тестируем сортировку
    allResults.tests.sorting = await testSorting();
    
    // Тестируем производительность
    allResults.tests.performance = await testUIPerformance();
    
    // Сохраняем результаты
    const outputFile = path.join(__dirname, 'reports', 'ui-test-results.json');
    const reportsDir = path.dirname(outputFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
    log(`\n📊 Результаты сохранены в: ${outputFile}`, 'green');
    
    // Показываем итоги
    showUISummary(allResults);
    
  } catch (error) {
    log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Функция для показа итогов
function showUISummary(results) {
  const allTests = [
    results.tests.homePage,
    ...results.tests.apiEndpoints,
    ...results.tests.pagination,
    ...results.tests.filtering,
    ...results.tests.sorting,
    ...results.tests.performance
  ].filter(t => t !== null);
  
  const totalTests = allTests.length;
  const passedTests = allTests.filter(t => t.passed).length;
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  log('\n📈 ИТОГИ ТЕСТИРОВАНИЯ UI', 'bright');
  log('========================', 'bright');
  log(`Всего тестов: ${totalTests}`, 'blue');
  log(`✅ Пройдено: ${passedTests}`, 'green');
  log(`❌ Провалено: ${totalTests - passedTests}`, 'red');
  log(`📊 Успешность: ${successRate}%`, successRate >= 90 ? 'green' : 'red');
  
  // Производительность
  if (results.tests.performance.length > 0) {
    const avgDuration = results.tests.performance.reduce((sum, p) => sum + p.duration, 0) / results.tests.performance.length;
    const maxDuration = Math.max(...results.tests.performance.map(p => p.duration));
    
    log(`\n⚡ ПРОИЗВОДИТЕЛЬНОСТЬ:`, 'yellow');
    log(`   Среднее время: ${avgDuration.toFixed(0)}ms`, avgDuration < 1000 ? 'green' : 'yellow');
    log(`   Максимальное время: ${maxDuration}ms`, maxDuration < 3000 ? 'green' : 'red');
  }
  
  if (successRate >= 95) {
    log('\n🎉 Отличные результаты! UI работает корректно.', 'green');
  } else if (successRate >= 80) {
    log('\n⚠️  Хорошие результаты, но есть проблемы, которые нужно исправить.', 'yellow');
  } else {
    log('\n🚨 Критические проблемы! UI требует серьезной доработки.', 'red');
  }
}

// Запуск
runAllUITests().catch(error => {
  log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
