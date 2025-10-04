#!/usr/bin/env node

/**
 * Скрипт для мониторинга производительности во время нагрузочного тестирования
 * Собирает метрики системы и приложения
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация мониторинга
const config = {
  interval: 5000, // Интервал сбора метрик в мс
  duration: 600000, // Продолжительность мониторинга в мс (10 минут)
  outputFile: path.join(__dirname, 'reports', 'performance-metrics.json')
};

// Метрики для сбора
let metrics = {
  timestamp: [],
  cpu: [],
  memory: [],
  network: [],
  database: [],
  responseTime: []
};

// Функция для получения метрик системы
function getSystemMetrics() {
  return new Promise((resolve) => {
    const start = Date.now();
    
    // Получаем метрики через top (Linux/macOS)
    const top = spawn('top', ['-l', '1', '-n', '0'], { stdio: 'pipe' });
    let output = '';
    
    top.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    top.on('close', () => {
      const lines = output.split('\n');
      let cpuUsage = 0;
      let memoryUsage = 0;
      
      // Парсим вывод top
      for (const line of lines) {
        if (line.includes('CPU usage:')) {
          const match = line.match(/(\d+\.\d+)% user/);
          if (match) {
            cpuUsage = parseFloat(match[1]);
          }
        }
        if (line.includes('PhysMem:')) {
          const match = line.match(/(\d+)M used/);
          if (match) {
            memoryUsage = parseInt(match[1]);
          }
        }
      }
      
      resolve({
        cpu: cpuUsage,
        memory: memoryUsage,
        timestamp: new Date().toISOString()
      });
    });
    
    top.on('error', () => {
      // Fallback для Windows или если top недоступен
      resolve({
        cpu: 0,
        memory: 0,
        timestamp: new Date().toISOString()
      });
    });
  });
}

// Функция для тестирования времени отклика API
async function testApiResponseTime(baseUrl) {
  const start = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}/api/releases?limit=10`);
    const end = Date.now();
    
    return {
      responseTime: end - start,
      statusCode: response.status,
      success: response.ok
    };
  } catch (error) {
    return {
      responseTime: -1,
      statusCode: 0,
      success: false,
      error: error.message
    };
  }
}

// Функция для получения метрик базы данных (если доступно)
async function getDatabaseMetrics() {
  // Здесь можно добавить подключение к PostgreSQL
  // и получение метрик через pg_stat_* таблицы
  return {
    activeConnections: 0,
    queriesPerSecond: 0,
    cacheHitRatio: 0
  };
}

// Функция для сохранения метрик
function saveMetrics() {
  const reportsDir = path.dirname(config.outputFile);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const summary = {
    collectedAt: new Date().toISOString(),
    duration: config.duration,
    interval: config.interval,
    metrics: {
      system: {
        avgCpu: metrics.cpu.reduce((a, b) => a + b, 0) / metrics.cpu.length,
        maxCpu: Math.max(...metrics.cpu),
        avgMemory: metrics.memory.reduce((a, b) => a + b, 0) / metrics.memory.length,
        maxMemory: Math.max(...metrics.memory)
      },
      api: {
        avgResponseTime: metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length,
        maxResponseTime: Math.max(...metrics.responseTime),
        successRate: metrics.responseTime.filter(t => t > 0).length / metrics.responseTime.length
      }
    },
    rawData: metrics
  };
  
  fs.writeFileSync(config.outputFile, JSON.stringify(summary, null, 2));
  console.log(`📊 Метрики сохранены в: ${config.outputFile}`);
}

// Функция для отображения текущих метрик
function displayCurrentMetrics() {
  const latest = {
    cpu: metrics.cpu[metrics.cpu.length - 1] || 0,
    memory: metrics.memory[metrics.memory.length - 1] || 0,
    responseTime: metrics.responseTime[metrics.responseTime.length - 1] || 0
  };
  
  console.log(`\r🖥️  CPU: ${latest.cpu.toFixed(1)}% | ` +
              `💾 Memory: ${latest.memory}MB | ` +
              `⚡ Response: ${latest.responseTime}ms`, '');
}

// Главная функция мониторинга
async function startMonitoring(baseUrl = 'http://localhost:5000') {
  console.log('🔍 Запуск мониторинга производительности...');
  console.log(`📡 Целевой URL: ${baseUrl}`);
  console.log(`⏱️  Интервал: ${config.interval}ms`);
  console.log(`⏰ Продолжительность: ${config.duration / 1000}s`);
  console.log('Нажмите Ctrl+C для остановки\n');
  
  const startTime = Date.now();
  const interval = setInterval(async () => {
    try {
      // Собираем метрики системы
      const systemMetrics = await getSystemMetrics();
      metrics.cpu.push(systemMetrics.cpu);
      metrics.memory.push(systemMetrics.memory);
      metrics.timestamp.push(systemMetrics.timestamp);
      
      // Тестируем API
      const apiMetrics = await testApiResponseTime(baseUrl);
      metrics.responseTime.push(apiMetrics.responseTime);
      
      // Получаем метрики БД
      const dbMetrics = await getDatabaseMetrics();
      metrics.database.push(dbMetrics);
      
      // Отображаем текущие метрики
      displayCurrentMetrics();
      
      // Проверяем, не пора ли завершить
      if (Date.now() - startTime >= config.duration) {
        clearInterval(interval);
        console.log('\n✅ Мониторинг завершен');
        saveMetrics();
        process.exit(0);
      }
      
    } catch (error) {
      console.error(`\n❌ Ошибка сбора метрик: ${error.message}`);
    }
  }, config.interval);
  
  // Обработка сигналов завершения
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n⏹️  Мониторинг остановлен пользователем');
    saveMetrics();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    clearInterval(interval);
    console.log('\n⏹️  Мониторинг завершен');
    saveMetrics();
    process.exit(0);
  });
}

// Запуск
const baseUrl = process.argv[2] || 'http://localhost:5000';
startMonitoring(baseUrl).catch(error => {
  console.error(`💥 Ошибка запуска мониторинга: ${error.message}`);
  process.exit(1);
});
