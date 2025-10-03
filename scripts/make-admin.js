#!/usr/bin/env node

import 'dotenv/config';
import { db } from '../server/db.ts';
import { users } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function makeAdmin() {
  try {
    console.log('🔧 Назначаем администратора...\n');
    
    const email = 'armenb777@gmail.com';
    
    // Проверяем, существует ли пользователь
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length === 0) {
      console.log('❌ Пользователь не найден в базе данных');
      console.log('💡 Сначала войдите на сайт через Google OAuth');
      return;
    }
    
    const user = existingUser[0];
    console.log(`👤 Найден пользователь: ${user.name} (${user.email})`);
    console.log(`🔑 Текущий статус админа: ${user.is_admin ? 'Да' : 'Нет'}`);
    
    if (user.is_admin) {
      console.log('✅ Пользователь уже является администратором!');
      return;
    }
    
    // Назначаем администратором
    await db.update(users)
      .set({ is_admin: true })
      .where(eq(users.email, email));
    
    console.log('🎉 Успешно! Вы стали администратором!');
    console.log('🔄 Теперь перезайдите на сайт, чтобы увидеть админку');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

makeAdmin();


