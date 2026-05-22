# Sleza Scanner — UI Migration

Эта папка содержит **8 файлов**, готовых к копированию в репозиторий `sleza-web`. Они переодевают фронтенд в новый дизайн (audit-report стиль), не трогая ни единого endpoint бэкенда.

## Что меняется

| Файл | Действие |
|---|---|
| `frontend/tailwind.config.js` | **заменить** — добавлены fontFamily, цвета (ink, paper, brand, danger, ok, warn, line), keyframes, animations |
| `frontend/app/globals.css` | **заменить** — Onest base, `.label-micro` утилита, `prefers-reduced-motion` |
| `frontend/app/layout.js` | **заменить** — подключение Google Fonts (Onest + JetBrains Mono), обновлённые мета-теги |
| `frontend/app/page.js` | **заменить** — новый layout, нав-бар, шапка отчёта; вся логика (SSE, UUID, saveResult, scan handler) на месте |
| `frontend/components/ScanForm.js` | **заменить** — новый стиль формы (URL inputs, site-type chips, dual CTA) |
| `frontend/components/ScanProgress.js` | **новый файл** — тёмный лог сканирования + прогресс-бар (вынес из `page.js`) |
| `frontend/components/Results.js` | **заменить** — report-frame: meta header, verdict, риск-скор, findings table, sleza, egrul, CTA |
| `frontend/components/Landing.js` | **новый файл** — вынес `LandingSection` из `page.js` + рестайл (что проверяем, для кого, FAQ) |

## Что НЕ трогали

- `frontend/components/ShareModal.js` — не меняется, продолжает работать как раньше
- `frontend/app/print/page.js` — печать-страница не трогается (отдельный шаблон для PDF)
- весь `backend/` — не трогается
- API endpoints, data shapes, env-переменные

## Сохранённая функциональность

- ✅ POST `/api/scan/single` и `/api/scan/full/stream` (SSE)
- ✅ UUID-отчёты через `/api/results` (POST/GET)
- ✅ ShareModal вызывается тем же `onShare(mode)`
- ✅ FeedbackButton — POST `/api/feedback`
- ✅ `?report=<uuid>` — открытие сохранённого отчёта
- ✅ Stop scan через `reader.cancel()`
- ✅ Diff highlighting, Confidence badge, EGRUL display, Sleza items, Fallback warning
- ✅ Stats (scanned/total/found)
- ✅ Поведение «новый скан» (newScan)

## Что добавилось

- 🆕 **Тёмный live-log сканирования** — отображает текущую фазу (sitemap → crawl → render → sleza → policy → ai) как терминальный лог с тиками времени
- 🆕 **Риск-скор 0–10** — вычисляется из (violations × 2 + risks) / (checks × 2) × 10; анимированный gradient-бар
- 🆕 **Document-style meta header** — домен, режим, дата, параметров + цветной штамп (требует действий / есть риски / в норме)
- 🆕 **Summary dots** — N нарушений · N рисков · N в норме под verdict
- 🆕 **Стили Onest + JetBrains Mono** — Google Fonts через `<link>` в layout.js
- 🆕 **prefers-reduced-motion** — анимации отключаются для пользователей с настройкой

## Как накатывать

### Вариант 1 — через PR (рекомендую)

```bash
cd ~/sleza-web
git checkout -b design/audit-report-v2

# скопируйте 8 файлов в соответствующие пути
cp migration/frontend/tailwind.config.js          frontend/
cp migration/frontend/app/globals.css             frontend/app/
cp migration/frontend/app/layout.js               frontend/app/
cp migration/frontend/app/page.js                 frontend/app/
cp migration/frontend/components/ScanForm.js      frontend/components/
cp migration/frontend/components/ScanProgress.js  frontend/components/
cp migration/frontend/components/Results.js       frontend/components/
cp migration/frontend/components/Landing.js       frontend/components/

cd frontend
npm run dev
# открыть http://localhost:3000, проверить визуально
```

Если ОК — `git add -A`, `git commit -m "design: audit-report ui v2"`, `git push origin design/audit-report-v2`, открыть PR в master.

### Вариант 2 — напрямую в master

```bash
# просто скопируйте файлы и push в master — Vercel автодеплоит.
```

## Что проверить после деплоя

1. Главная страница — landing с шапкой «сколько штрафов прячется на вашем сайте?»
2. Запустить скан реального сайта в режиме «текущая страница» — увидеть тёмный лог
3. Запустить full-scan — увидеть лог с прогресс-баром и фазами от бэкенда (`sitemap`, `crawl X/Y`, `render`, `sleza`, `policy`, `ai`)
4. Дождаться результатов — увидеть report-frame с штампом, риск-скором, списком findings
5. Скачать PDF (если есть violations) — `print/page.js` отдельный, не должен сломаться
6. Поделиться ссылкой → открыть `?report=<uuid>` — должен загрузить тот же отчёт
7. Feedback-кнопки в нарушениях — отправка работает
8. Diff-показ (если повторный скан того же сайта) — отображается

## Возможные доработки

- **Open Graph image** — генерация превью для шеринга (сейчас текстовое)
- **Email-capture** — гейт после результатов «получить отчёт юристу» (если решите вернуть)
- **Лид-форма** для платного сервиса — отдельная страница `/pricing` с продолжением воронки
- **Tracking event** — `scan_started`, `scan_completed`, `pdf_downloaded` через что-то типа Plausible/PostHog
