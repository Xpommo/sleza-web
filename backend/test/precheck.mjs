// Точечный тест фикса pre-checked consent (галочка на странице регистрации + кастомные чекбоксы).
// Запуск из backend/: node test/precheck.mjs
import { scanSinglePage } from '../src/scanner.js';
import { closeBrowser } from '../src/pageContext.js';

const URLS = [
  ['ТАРГЕТ  puzzle-english.com', 'https://puzzle-english.com/'],
  ['КОНТРОЛЬ rbc.ru',            'https://www.rbc.ru/'],
  ['КОНТРОЛЬ vc.ru',            'https://vc.ru/'],
  ['КОНТРОЛЬ ozon.ru',          'https://www.ozon.ru/'],
  ['КОНТРОЛЬ sleza.media',      'https://sleza.media/'],
];

for (const [label, url] of URLS) {
  try {
    const r = await scanSinglePage({ url, useAI: false, siteType: 'auto' });
    const law152 = (r.aiData?.checks || []).find(c => c.id === 'law152');
    const preChecked = /заранее проставленной галочкой/.test(law152?.issue || '');
    console.log(`\n${label}`);
    console.log(`  law152: ${law152?.status}`);
    console.log(`  pre-checked consent detected: ${preChecked ? 'ДА ✅' : 'нет'}`);
    console.log(`  issue: ${(law152?.issue || '').slice(0, 180)}`);
  } catch (e) {
    console.log(`\n${label}\n  ОШИБКА: ${e.message}`);
  }
}
await closeBrowser();
