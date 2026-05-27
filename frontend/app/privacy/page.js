import Link from 'next/link';

export const metadata = {
  title: 'Политика конфиденциальности — СЛЕЗА // СКАНЕР',
  description: 'Политика обработки персональных данных сервиса sleza-web.vercel.app',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-warm text-ink">

      {/* Header */}
      <header className="border-b border-line px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span
              className="w-3 h-3 bg-brand inline-block shrink-0"
              style={{ borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }}
            />
            <span className="font-mono text-[13px] font-semibold text-ink/70 group-hover:text-ink transition-colors">
              СЛЕЗА // СКАНЕР
            </span>
          </Link>
          <Link href="/" className="text-xs text-ink/45 hover:text-ink font-mono transition-colors">
            ← на главную
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 pb-16">

        <div className="mb-10">
          <p className="text-xs font-mono text-ink/35 uppercase tracking-widest mb-2">Правовая информация</p>
          <h1 className="text-2xl font-bold text-ink mb-2">Политика конфиденциальности</h1>
          <p className="text-sm text-ink/45 font-mono">Редакция от 27 мая 2026 г.</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-ink/80">

          <Section title="1. Оператор персональных данных">
            <p>
              Оператором персональных данных в соответствии с Федеральным законом № 152-ФЗ
              «О персональных данных» является:
            </p>
            <div className="mt-3 p-4 bg-paper border border-line rounded-lg font-mono text-sm space-y-1.5">
              <p><span className="text-ink/40">Оператор:</span> <span className="text-ink font-semibold">Кирилл Мащенко</span></p>
              <p>
                <span className="text-ink/40">Email:</span>{' '}
                <a href="mailto:kirillmash99@gmail.com" className="text-brand hover:underline">
                  kirillmash99@gmail.com
                </a>
              </p>
              <p><span className="text-ink/40">Сайт:</span> <span className="text-ink">sleza-web.vercel.app</span></p>
            </div>
          </Section>

          <Section title="2. Какие данные мы собираем">
            <p>Мы обрабатываем персональные данные только тогда, когда вы явно их передаёте:</p>
            <ul className="mt-3 space-y-2">
              <DataItem label="Email-адрес" text="при запросе PDF-отчёта или ссылки через форму «Скачать PDF / Поделиться»" />
              <DataItem label="Название компании" text="передаётся вместе с email в той же форме" />
            </ul>
            <p className="mt-3 text-sm text-ink/50">
              URL сканируемого сайта — адрес стороннего ресурса, который вы просите проверить.
              Персональными данными не является.
            </p>
            <p className="mt-2 text-sm text-ink/50">
              Мы не запрашиваем номер телефона, паспортные данные и платёжную информацию.
            </p>
          </Section>

          <Section title="3. Цели обработки">
            <ul className="space-y-2">
              <DataItem label="Формирование PDF-отчёта" text="email нужен для идентификации запроса" />
              <DataItem label="Обратная связь" text="можем ответить на вопросы по результатам проверки" />
              <DataItem label="Улучшение сервиса" text="агрегированная статистика запросов без привязки к личности" />
            </ul>
            <p className="mt-3 text-sm text-ink/50">
              Мы не передаём ваши данные третьим лицам, не используем в рекламных целях и не продаём.
            </p>
          </Section>

          <Section title="4. Сроки хранения">
            <div className="divide-y divide-line/60 text-sm">
              <StorageRow label="Результаты скана" value="7 дней, затем автоматически удаляются" />
              <StorageRow label="Email и компания" value="до момента отзыва согласия или запроса на удаление" />
              <StorageRow label="Статус согласия (localStorage)" value="в вашем браузере до очистки данных сайта" />
            </div>
          </Section>

          <Section title="5. API-ключи">
            <p>
              Сервис работает на собственных ключах. Мы <strong className="font-semibold text-ink">не запрашиваем</strong>{' '}
              ваши личные API-ключи и <strong className="font-semibold text-ink">не храним</strong> их на сервере.
            </p>
          </Section>

          <Section title="6. Cookies и localStorage">
            <p>Мы не устанавливаем отслеживающие cookie-файлы и не подключаем рекламные трекеры.</p>
            <p className="mt-2">В localStorage вашего браузера сохраняется единственная запись:</p>
            <div className="mt-2 p-3 bg-paper border border-line rounded-lg font-mono text-sm">
              <span className="text-brand">consent_v1</span>
              <span className="text-ink/45 ml-2">— ваш выбор по cookie-уведомлению</span>
            </div>
            <p className="mt-3 text-sm text-ink/50">
              Удалить запись: настройки браузера → «Данные сайтов» → sleza-web.vercel.app.
            </p>
          </Section>

          <Section title="7. Ваши права">
            <p>Как субъект персональных данных (ст. 14–17 152-ФЗ) вы вправе:</p>
            <ul className="mt-3 space-y-1 list-disc list-inside text-sm">
              <li>получить подтверждение факта обработки ваших данных</li>
              <li>потребовать уточнения, блокировки или удаления</li>
              <li>отозвать ранее данное согласие</li>
              <li>обратиться с жалобой в Роскомнадзор (rkn.gov.ru)</li>
            </ul>
            <p className="mt-3">
              Для реализации прав направьте запрос на{' '}
              <a href="mailto:kirillmash99@gmail.com" className="text-brand hover:underline">
                kirillmash99@gmail.com
              </a>
              . Ответим в течение 30 дней.
            </p>
          </Section>

          <Section title="8. Изменения политики">
            <p>
              При существенных изменениях обновим дату редакции вверху страницы.
              Продолжение использования сервиса после изменений означает согласие с новой редакцией.
            </p>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-5 px-4">
        <div className="max-w-3xl mx-auto text-[11px] font-mono text-ink/35 text-center">
          © 2024–2026 СЛЕЗА // СКАНЕР · не является юридической консультацией
        </div>
      </footer>

    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-[11px] font-mono font-semibold text-ink/35 uppercase tracking-widest mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DataItem({ label, text }) {
  return (
    <li className="flex gap-2 text-sm list-none">
      <span className="text-brand font-mono mt-0.5 shrink-0">→</span>
      <span>
        <span className="font-semibold text-ink">{label}</span>
        {' '}— {text}
      </span>
    </li>
  );
}

function StorageRow({ label, value }) {
  return (
    <div className="flex gap-4 py-2.5">
      <span className="text-ink/50 w-52 shrink-0">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
