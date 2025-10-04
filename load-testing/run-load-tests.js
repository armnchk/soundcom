#!/usr/bin/env node

/**
 * Скрипт для запуска нагрузочного тестирования BudgetBuddy
 * Поддерживает различные сценарии и генерирует отчеты
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

// Конфигурации тестов
const testConfigs = {
  smoke: {
    name: 'Smoke Test',
    file: 'smoke-test.yml',
    description: 'Быстрый тест для проверки работоспособности'
  },
  load: {
    name: 'Load Test',
    file: 'artillery-config.yml',
    description: 'Стандартное нагрузочное тестирование'
  },
  stress: {
    name: 'Stress Test',
    file: 'stress-test.yml',
    description: 'Тест на максимальную нагрузку'
  },
  spike: {
    name: 'Spike Test',
    file: 'spike-test.yml',
    description: 'Тест на резкие скачки нагрузки'
  }
};

// Функция для логирования
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Функция для проверки доступности сервера
async function checkServerHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/releases/health`);
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

// Функция для запуска теста
function runTest(config, options = {}) {
  return new Promise((resolve, reject) => {
    const configPath = path.join(__dirname, config.file);
    
    if (!fs.existsSync(configPath)) {
      reject(new Error(`Конфигурационный файл не найден: ${configPath}`));
      return;
    }

    log(`\n🚀 Запуск ${config.name}...`, 'cyan');
    log(`📄 Конфигурация: ${config.file}`, 'blue');
    log(`📝 Описание: ${config.description}`, 'yellow');

    const args = ['run', configPath];
    
    // Добавляем опции
    if (options.output) {
      args.push('--output', options.output);
    }
    
    if (options.target) {
      args.push('--target', options.target);
    }

    const artillery = spawn('npx', ['artillery', ...args], {
      stdio: 'inherit',
      shell: true
    });

    artillery.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${config.name} завершен успешно`, 'green');
        resolve();
      } else {
        log(`❌ ${config.name} завершен с ошибкой (код: ${code})`, 'red');
        reject(new Error(`Тест завершен с кодом ${code}`));
      }
    });

    artillery.on('error', (error) => {
      log(`❌ Ошибка запуска Artillery: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Функция для генерации отчета
function generateReport(testName, results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, 'reports', `${testName}-${timestamp}.json`);
  
  // Создаем папку reports если её нет
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`📊 Отчет сохранен: ${reportPath}`, 'green');
}

// Главная функция
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'load';
  const target = args[1] || 'http://localhost:5000';
  const output = args[2] || `reports/${testType}-report.json`;

  log('🧪 BudgetBuddy Load Testing Suite', 'bright');
  log('================================', 'bright');

  // Проверяем доступность сервера
  log('\n🔍 Проверка доступности сервера...', 'yellow');
  const isHealthy = await checkServerHealth(target);
  
  if (!isHealthy) {
    log('\n❌ Сервер недоступен. Убедитесь, что приложение запущено на', 'red');
    log(`   ${target}`, 'red');
    process.exit(1);
  }

  // Проверяем наличие Artillery
  try {
    await new Promise((resolve, reject) => {
      const check = spawn('npx', ['artillery', '--version'], { stdio: 'pipe' });
      check.on('close', (code) => code === 0 ? resolve() : reject());
      check.on('error', reject);
    });
  } catch (error) {
    log('\n❌ Artillery.js не установлен. Устанавливаем...', 'yellow');
    try {
      await new Promise((resolve, reject) => {
        const install = spawn('npm', ['install', '-g', 'artillery'], { stdio: 'inherit' });
        install.on('close', (code) => code === 0 ? resolve() : reject());
        install.on('error', reject);
      });
      log('✅ Artillery.js установлен', 'green');
    } catch (installError) {
      log('❌ Не удалось установить Artillery.js', 'red');
      log('Попробуйте: npm install -g artillery', 'yellow');
      process.exit(1);
    }
  }

  // Запускаем тест
  const config = testConfigs[testType];
  if (!config) {
    log(`❌ Неизвестный тип теста: ${testType}`, 'red');
    log('Доступные типы:', 'yellow');
    Object.keys(testConfigs).forEach(key => {
      log(`  - ${key}: ${testConfigs[key].name}`, 'blue');
    });
    process.exit(1);
  }

  try {
    await runTest(config, { target, output });
    
    log('\n🎉 Тестирование завершено успешно!', 'green');
    log(`📊 Результаты сохранены в: ${output}`, 'blue');
    
    // Показываем краткую статистику
    if (fs.existsSync(output)) {
      const results = JSON.parse(fs.readFileSync(output, 'utf8'));
      log('\n📈 Краткая статистика:', 'cyan');
      log(`   Всего запросов: ${results.aggregate?.counters?.['http.requests'] || 'N/A'}`, 'blue');
      log(`   Успешных: ${results.aggregate?.counters?.['http.responses'] || 'N/A'}`, 'green');
      log(`   Ошибок: ${results.aggregate?.counters?.['http.response_time.p95'] || 'N/A'}`, 'red');
    }
    
  } catch (error) {
    log(`\n❌ Ошибка при выполнении теста: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  log('\n\n⏹️  Тестирование прервано пользователем', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n⏹️  Тестирование завершено', 'yellow');
  process.exit(0);
});

// Запуск
main().catch(error => {
  log(`\n💥 Критическая ошибка: ${error.message}`, 'red');
  process.exit(1);
});
