#!/usr/bin/env node

/**
 * Специализированные тесты поиска для BudgetBuddy
 * Проверяет все аспекты поисковой функциональности
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

// Тестовые данные для поиска
const searchTestCases = [
  // Базовые тесты
  { query: '', description: 'Пустой поисковый запрос' },
  { query: 'a', description: 'Однобуквенный запрос' },
  { query: 'test', description: 'Стандартный тестовый запрос' },
  { query: 'rock', description: 'Поиск по жанру' },
  { query: '2023', description: 'Поиск по году' },
  
  // Специальные символы
  { query: 'test & rock', description: 'Запрос с амперсандом' },
  { query: 'test-rock', description: 'Запрос с дефисом' },
  { query: 'test_rock', description: 'Запрос с подчеркиванием' },
  { query: 'test+rock', description: 'Запрос с плюсом' },
  
  // Длинные запросы
  { query: 'very long search query that might test the limits', description: 'Длинный поисковый запрос' },
  
  // Unicode символы
  { query: 'тест', description: 'Кириллический запрос' },
  { query: 'café', description: 'Запрос с диакритическими знаками' },
  { query: '🎵', description: 'Запрос с эмодзи' },
  
  // SQL injection попытки
  { query: "'; DROP TABLE releases; --", description: 'SQL injection попытка' },
  { query: "' OR '1'='1", description: 'SQL injection попытка 2' },
  
  // XSS попытки
  { query: '<script>alert("xss")</script>', description: 'XSS попытка' },
  { query: '"><script>alert("xss")</script>', description: 'XSS попытка 2' },
  
  // Пробелы и специальные символы
  { query: '   ', description: 'Только пробелы' },
  { query: '\t\n', description: 'Только whitespace символы' },
  { query: '!@#$%^&*()', description: 'Специальные символы' }
];

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
      'User-Agent': 'Search-Test-Suite/1.0'
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

// Функция для выполнения теста поиска
async function runSearchTest(testCase, endpoint) {
  const encodedQuery = encodeURIComponent(testCase.query);
  const url = `${endpoint}?q=${encodedQuery}`;
  
  log(`\n🔍 ${testCase.description}`, 'cyan');
  log(`   Запрос: "${testCase.query}"`, 'blue');
  log(`   URL: ${url}`, 'blue');
  
  const response = await makeRequest(url);
  
  const result = {
    testCase,
    endpoint,
    url,
    response,
    passed: false,
    issues: []
  };
  
  // Проверки
  if (!response.ok) {
    result.issues.push(`HTTP ошибка: ${response.status} ${response.statusText}`);
  }
  
  if (response.data === null) {
    result.issues.push('Пустой ответ от сервера');
  }
  
  if (response.data && !Array.isArray(response.data)) {
    result.issues.push('Ответ должен быть массивом');
  }
  
  if (response.data && Array.isArray(response.data)) {
    // Проверяем, что результаты не содержат опасный контент
    const results = response.data;
    for (const item of results) {
      if (typeof item === 'object' && item !== null) {
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string') {
            if (value.includes('<script>') || value.includes('javascript:')) {
              result.issues.push(`Обнаружен потенциально опасный контент в поле ${key}`);
            }
          }
        }
      }
    }
  }
  
  result.passed = result.issues.length === 0;
  
  if (result.passed) {
    log(`   ✅ Успешно (${response.data?.length || 0} результатов)`, 'green');
  } else {
    log(`   ❌ Провален`, 'red');
    result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
  }
  
  return result;
}

// Тест поиска релизов
async function testReleaseSearch() {
  log('\n🎵 ТЕСТИРОВАНИЕ ПОИСКА РЕЛИЗОВ', 'bright');
  log('================================', 'bright');
  
  const results = [];
  
  for (const testCase of searchTestCases) {
    const result = await runSearchTest(testCase, '/api/releases/search');
    results.push(result);
  }
  
  // Дополнительные тесты с сортировкой
  log('\n📊 Тестирование сортировки', 'yellow');
  
  const sortOptions = ['rating_desc', 'rating_asc', 'date_desc', 'date_asc'];
  for (const sortBy of sortOptions) {
    const testCase = { query: 'test', description: `Поиск с сортировкой: ${sortBy}` };
    const result = await runSearchTest(testCase, `/api/releases/search?sortBy=${sortBy}`);
    results.push(result);
  }
  
  return results;
}

// Тест поиска исполнителей
async function testArtistSearch() {
  log('\n👤 ТЕСТИРОВАНИЕ ПОИСКА ИСПОЛНИТЕЛЕЙ', 'bright');
  log('====================================', 'bright');
  
  const results = [];
  
  for (const testCase of searchTestCases) {
    const result = await runSearchTest(testCase, '/api/artists/search');
    results.push(result);
  }
  
  return results;
}

// Тест общего поиска (редирект)
async function testGeneralSearch() {
  log('\n🔍 ТЕСТИРОВАНИЕ ОБЩЕГО ПОИСКА', 'bright');
  log('==============================', 'bright');
  
  const results = [];
  
  for (const testCase of searchTestCases.slice(0, 5)) { // Тестируем только базовые случаи
    const result = await runSearchTest(testCase, '/api/search');
    results.push(result);
  }
  
  return results;
}

// Тест производительности поиска
async function testSearchPerformance() {
  log('\n⚡ ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ ПОИСКА', 'bright');
  log('==========================================', 'bright');
  
  const testQueries = ['test', 'rock', '2023', 'a', 'very long query'];
  const results = [];
  
  for (const query of testQueries) {
    const startTime = Date.now();
    const response = await makeRequest(`/api/releases/search?q=${encodeURIComponent(query)}`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = {
      query,
      duration,
      success: response.ok,
      resultsCount: response.data?.length || 0
    };
    
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const color = duration < 1000 ? 'green' : duration < 3000 ? 'yellow' : 'red';
    
    log(`   ${status} "${query}": ${duration}ms (${result.resultsCount} результатов)`, color);
  }
  
  return results;
}

// Тест безопасности поиска
async function testSearchSecurity() {
  log('\n🛡️ ТЕСТИРОВАНИЕ БЕЗОПАСНОСТИ ПОИСКА', 'bright');
  log('====================================', 'bright');
  
  const securityTests = [
    { query: "'; DROP TABLE releases; --", description: 'SQL injection' },
    { query: '<script>alert("xss")</script>', description: 'XSS попытка' },
    { query: '"><img src=x onerror=alert(1)>', description: 'XSS попытка 2' },
    { query: '${7*7}', description: 'Template injection' },
    { query: '{{7*7}}', description: 'Template injection 2' },
    { query: 'javascript:alert(1)', description: 'JavaScript injection' },
    { query: 'data:text/html,<script>alert(1)</script>', description: 'Data URI injection' }
  ];
  
  const results = [];
  
  for (const test of securityTests) {
    const response = await makeRequest(`/api/releases/search?q=${encodeURIComponent(test.query)}`);
    
    const result = {
      test,
      response,
      secure: true,
      issues: []
    };
    
    // Проверяем, что ответ не содержит исполняемый код
    if (response.data && typeof response.data === 'string') {
      if (response.data.includes('<script>') || response.data.includes('javascript:')) {
        result.secure = false;
        result.issues.push('Обнаружен потенциально опасный код в ответе');
      }
    }
    
    // Проверяем, что ответ не содержит SQL ошибок
    if (response.data && typeof response.data === 'string') {
      if (response.data.toLowerCase().includes('sql') || 
          response.data.toLowerCase().includes('syntax error') ||
          response.data.toLowerCase().includes('database')) {
        result.secure = false;
        result.issues.push('Обнаружены SQL ошибки в ответе');
      }
    }
    
    results.push(result);
    
    const status = result.secure ? '✅' : '❌';
    const color = result.secure ? 'green' : 'red';
    
    log(`   ${status} ${test.description}: ${result.secure ? 'Безопасно' : 'Обнаружены проблемы'}`, color);
    
    if (!result.secure) {
      result.issues.forEach(issue => log(`      • ${issue}`, 'red'));
    }
  }
  
  return results;
}

// Главная функция
async function runAllSearchTests() {
  log('🔍 BudgetBuddy Search Testing Suite', 'bright');
  log('===================================', 'bright');
  log(`🌐 Тестируем: ${config.baseUrl}`, 'blue');
  
  const allResults = {
    timestamp: new Date().toISOString(),
    baseUrl: config.baseUrl,
    tests: {
      releaseSearch: [],
      artistSearch: [],
      generalSearch: [],
      performance: [],
      security: []
    }
  };
  
  try {
    // Тестируем поиск релизов
    allResults.tests.releaseSearch = await testReleaseSearch();
    
    // Тестируем поиск исполнителей
    allResults.tests.artistSearch = await testArtistSearch();
    
    // Тестируем общий поиск
    allResults.tests.generalSearch = await testGeneralSearch();
    
    // Тестируем производительность
    allResults.tests.performance = await testSearchPerformance();
    
    // Тестируем безопасность
    allResults.tests.security = await testSearchSecurity();
    
    // Сохраняем результаты
    const outputFile = path.join(__dirname, 'reports', 'search-test-results.json');
    const reportsDir = path.dirname(outputFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
    log(`\n📊 Результаты сохранены в: ${outputFile}`, 'green');
    
    // Показываем итоги
    showSearchSummary(allResults);
    
  } catch (error) {
    log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Функция для показа итогов
function showSearchSummary(results) {
  const { releaseSearch, artistSearch, generalSearch, performance, security } = results.tests;
  
  const totalTests = releaseSearch.length + artistSearch.length + generalSearch.length + security.length;
  const passedTests = [
    ...releaseSearch,
    ...artistSearch,
    ...generalSearch,
    ...security
  ].filter(r => r.passed).length;
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  log('\n📈 ИТОГИ ТЕСТИРОВАНИЯ ПОИСКА', 'bright');
  log('=============================', 'bright');
  log(`Всего тестов: ${totalTests}`, 'blue');
  log(`✅ Пройдено: ${passedTests}`, 'green');
  log(`❌ Провалено: ${totalTests - passedTests}`, 'red');
  log(`📊 Успешность: ${successRate}%`, successRate >= 90 ? 'green' : 'red');
  
  // Производительность
  if (performance.length > 0) {
    const avgDuration = performance.reduce((sum, p) => sum + p.duration, 0) / performance.length;
    const maxDuration = Math.max(...performance.map(p => p.duration));
    
    log(`\n⚡ ПРОИЗВОДИТЕЛЬНОСТЬ:`, 'yellow');
    log(`   Среднее время: ${avgDuration.toFixed(0)}ms`, avgDuration < 1000 ? 'green' : 'yellow');
    log(`   Максимальное время: ${maxDuration}ms`, maxDuration < 3000 ? 'green' : 'red');
  }
  
  // Безопасность
  const securityIssues = security.filter(s => !s.secure).length;
  if (securityIssues > 0) {
    log(`\n🛡️ БЕЗОПАСНОСТЬ:`, 'red');
    log(`   Обнаружено проблем: ${securityIssues}`, 'red');
  } else {
    log(`\n🛡️ БЕЗОПАСНОСТЬ: Все тесты пройдены`, 'green');
  }
  
  if (successRate >= 95) {
    log('\n🎉 Отличные результаты! Поиск работает корректно и безопасно.', 'green');
  } else if (successRate >= 80) {
    log('\n⚠️  Хорошие результаты, но есть проблемы, которые нужно исправить.', 'yellow');
  } else {
    log('\n🚨 Критические проблемы! Поиск требует серьезной доработки.', 'red');
  }
}

// Запуск
runAllSearchTests().catch(error => {
  log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
