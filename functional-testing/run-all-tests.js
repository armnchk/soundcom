#!/usr/bin/env node

/**
 * Главный скрипт для запуска всех функциональных тестов BudgetBuddy
 * Запускает все виды тестирования: API, поиск, UI
 */

import { spawn } from 'child_process';
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

// Конфигурация тестов
const testSuites = [
  {
    name: 'API Tests',
    file: 'run-functional-tests.js',
    description: 'Тестирование API endpoints и базовой функциональности'
  },
  {
    name: 'Search Tests',
    file: 'search-tests.js',
    description: 'Тестирование поисковой функциональности и безопасности'
  },
  {
    name: 'UI Tests',
    file: 'ui-tests.js',
    description: 'Тестирование пользовательского интерфейса и производительности'
  }
];

// Результаты всех тестов
let allResults = {
  timestamp: new Date().toISOString(),
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  suites: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    duration: 0
  }
};

// Функция для логирования
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Функция для запуска тестового набора
function runTestSuite(suite) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    log(`\n🚀 Запуск ${suite.name}...`, 'cyan');
    log(`📝 ${suite.description}`, 'blue');
    
    const testProcess = spawn('node', [suite.file], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, TEST_BASE_URL: allResults.baseUrl }
    });
    
    const suiteResult = {
      name: suite.name,
      file: suite.file,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      passed: false,
      error: null
    };
    
    testProcess.on('close', (code) => {
      const endTime = Date.now();
      suiteResult.endTime = new Date().toISOString();
      suiteResult.duration = endTime - startTime;
      
      if (code === 0) {
        suiteResult.status = 'completed';
        suiteResult.passed = true;
        log(`✅ ${suite.name} завершен успешно (${suiteResult.duration}ms)`, 'green');
      } else {
        suiteResult.status = 'failed';
        suiteResult.passed = false;
        suiteResult.error = `Процесс завершен с кодом ${code}`;
        log(`❌ ${suite.name} завершен с ошибкой (код: ${code})`, 'red');
      }
      
      allResults.suites.push(suiteResult);
      allResults.summary.total++;
      
      if (suiteResult.passed) {
        allResults.summary.passed++;
      } else {
        allResults.summary.failed++;
      }
      
      allResults.summary.duration += suiteResult.duration;
      
      resolve(suiteResult);
    });
    
    testProcess.on('error', (error) => {
      suiteResult.status = 'error';
      suiteResult.passed = false;
      suiteResult.error = error.message;
      suiteResult.endTime = new Date().toISOString();
      suiteResult.duration = Date.now() - startTime;
      
      allResults.suites.push(suiteResult);
      allResults.summary.total++;
      allResults.summary.failed++;
      allResults.summary.duration += suiteResult.duration;
      
      log(`💥 Ошибка запуска ${suite.name}: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Функция для проверки доступности сервера
async function checkServerHealth() {
  try {
    const response = await fetch(`${allResults.baseUrl}/api/releases/health`);
    if (response.ok) {
      log('✅ Сервер доступен', 'green');
      return true;
    }
  } catch (error) {
    log('❌ Сервер недоступен', 'red');
    log(`Ошибка: ${error.message}`, 'red');
    return false;
  }
  return false;
}

// Функция для сохранения результатов
function saveResults() {
  const outputFile = path.join(__dirname, 'reports', 'all-tests-results.json');
  const reportsDir = path.dirname(outputFile);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
  log(`\n📊 Все результаты сохранены в: ${outputFile}`, 'green');
}

// Функция для показа итогов
function showFinalSummary() {
  const { total, passed, failed, duration } = allResults.summary;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  const avgDuration = total > 0 ? (duration / total / 1000).toFixed(1) : 0;
  
  log('\n🎯 ФИНАЛЬНЫЕ ИТОГИ ТЕСТИРОВАНИЯ', 'bright');
  log('================================', 'bright');
  log(`🌐 Тестируемый URL: ${allResults.baseUrl}`, 'blue');
  log(`⏱️  Общее время: ${(duration / 1000).toFixed(1)}s`, 'blue');
  log(`📊 Тестовых наборов: ${total}`, 'blue');
  log(`✅ Успешно: ${passed}`, 'green');
  log(`❌ Провалено: ${failed}`, 'red');
  log(`📈 Успешность: ${successRate}%`, successRate >= 90 ? 'green' : 'red');
  log(`⚡ Среднее время на набор: ${avgDuration}s`, 'yellow');
  
  // Детали по каждому набору
  log('\n📋 ДЕТАЛИ ПО НАБОРАМ:', 'bright');
  allResults.suites.forEach(suite => {
    const status = suite.passed ? '✅' : '❌';
    const color = suite.passed ? 'green' : 'red';
    const duration = (suite.duration / 1000).toFixed(1);
    
    log(`   ${status} ${suite.name}: ${duration}s`, color);
    
    if (!suite.passed && suite.error) {
      log(`      Ошибка: ${suite.error}`, 'red');
    }
  });
  
  // Рекомендации
  log('\n💡 РЕКОМЕНДАЦИИ:', 'bright');
  
  if (successRate >= 95) {
    log('🎉 Отличные результаты! Приложение готово к продакшену.', 'green');
    log('   • Все основные функции работают корректно', 'green');
    log('   • Поиск работает безопасно и эффективно', 'green');
    log('   • UI отзывчив и производителен', 'green');
  } else if (successRate >= 80) {
    log('⚠️  Хорошие результаты, но есть проблемы для исправления:', 'yellow');
    log('   • Проверьте проваленные тесты выше', 'yellow');
    log('   • Исправьте найденные проблемы', 'yellow');
    log('   • Повторите тестирование после исправлений', 'yellow');
  } else {
    log('🚨 Критические проблемы! Требуется серьезная доработка:', 'red');
    log('   • Многие тесты провалены', 'red');
    log('   • Приложение не готово к продакшену', 'red');
    log('   • Необходимо исправить критические ошибки', 'red');
  }
  
  // Следующие шаги
  log('\n🔄 СЛЕДУЮЩИЕ ШАГИ:', 'bright');
  log('   1. Изучите детальные отчеты в папке reports/', 'blue');
  log('   2. Исправьте найденные проблемы', 'blue');
  log('   3. Запустите тесты повторно: npm run test:functional', 'blue');
  log('   4. При необходимости запустите отдельные наборы:', 'blue');
  log('      • npm run test:api', 'blue');
  log('      • npm run test:search', 'blue');
  log('      • npm run test:ui', 'blue');
}

// Главная функция
async function runAllTests() {
  log('🧪 BudgetBuddy Complete Functional Testing Suite', 'bright');
  log('================================================', 'bright');
  log(`🌐 Тестируем: ${allResults.baseUrl}`, 'blue');
  
  const startTime = Date.now();
  
  // Проверяем доступность сервера
  log('\n🔍 Проверка доступности сервера...', 'yellow');
  const isHealthy = await checkServerHealth();
  
  if (!isHealthy) {
    log('\n❌ Сервер недоступен. Убедитесь, что приложение запущено:', 'red');
    log(`   ${allResults.baseUrl}`, 'red');
    log('\nЗапустите приложение командой: npm run dev', 'yellow');
    process.exit(1);
  }
  
  // Запускаем все тестовые наборы
  log('\n🚀 Запуск всех тестовых наборов...', 'cyan');
  
  for (const suite of testSuites) {
    try {
      await runTestSuite(suite);
    } catch (error) {
      log(`💥 Критическая ошибка в ${suite.name}: ${error.message}`, 'red');
      // Продолжаем с другими наборами
    }
  }
  
  const totalDuration = Date.now() - startTime;
  allResults.summary.duration = totalDuration;
  
  // Сохраняем результаты
  saveResults();
  
  // Показываем итоги
  showFinalSummary();
  
  // Возвращаем код выхода
  const exitCode = allResults.summary.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  log('\n\n⏹️  Тестирование прервано пользователем', 'yellow');
  saveResults();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n⏹️  Тестирование завершено', 'yellow');
  saveResults();
  process.exit(0);
});

// Запуск
runAllTests().catch(error => {
  log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
