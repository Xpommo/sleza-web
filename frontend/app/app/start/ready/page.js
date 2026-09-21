import Link from 'next/link';
import StartFrame, { RING } from '../../../../components/start/StartFrame';
import { OwnerBadge } from '../../../../components/app/StatusBits';
import { projectSummary } from '../../../../lib/appMock';
import { projectChecks, splitByOwner, STATUS_WORD, getProject, PRICE } from '../../../../lib/projectMock';

const DOCS = [
  { name: 'Политика конфиденциальности', href: '/legal/privacy' },
  { name: 'Согласие на обработку ПДн', href: '/legal/consent' },
  { name: 'Политика в отношении cookie', href: '/legal/cookies' },
];

// 3 · Документы готовы — платим за то, что уже видно, а не за обещание.
// Раньше цена и оффер стояли раньше в пути, до сборки документов («оффер» →
// оплата → «готово»), и экран оплаты продавал обещание: «соберём сразу после
// оплаты». Перевернули: сначала показываем готовый результат (этот экран),
// оплата — следующим шагом, установка — только после неё. «Оффер» как
// отдельный экран убрали, его макет подвала переехал сюда же.
//
// Реквизиты теперь проверяются модалкой на первом шаге («Готовим документы
// для вас»), цели сбора — вопрос в анкете. Полноценная страница реквизитов
// с выбором ИП/ООО/самозанятый/физлицо, доступная в любой момент — отдельная
// задача следующим заходом.
export default function ReadyPage() {
  const project = getProject('p1');
  const summary = projectSummary(project);
  const checks = projectChecks(project);
  const { weClose, youClose } = splitByOwner(checks);

  return (
    <StartFrame project={project} summary={summary} step={3} back={{ href: '/app/start/anketa', label: 'уточнения' }}>
      <div className="inline-flex items-center gap-1.5 text-[15px] font-bold text-ok">✓ Документы готовы</div>
      <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">Осталось поставить на сайт</h1>
      <p className="mt-2 text-[15px] text-ink/65">
        Собрали пакет под {project.domain} — можно посмотреть, что получилось. Дальше один шаг: оплата,
        и виджет сам всё расставит.
      </p>

      <h2 className="mb-3 mt-6 text-[15px] font-bold tracking-[-0.02em]">Что изменится</h2>
      <div className="overflow-hidden rounded-lg border border-line-2 bg-white">
        {weClose.map(c => (
          <div key={c.name} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-[13.5px] last:border-0">
            <span>{c.title}</span>
            <span className="shrink-0"><span className="text-ink/40 line-through">{STATUS_WORD[c.status]}</span> → <span className="font-semibold text-ok">закрыто</span></span>
          </div>
        ))}
        {youClose.map(c => (
          <div key={c.name} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-[13.5px] last:border-0">
            <span>{c.title}</span>
            <OwnerBadge byUs={false} />
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[12px] text-ink/55">
        {weClose.length} {weClose.length === 1 ? 'пункт закроется' : 'пункта закроются'}, как только виджет встанет на сайт.
        {youClose.length > 0 && ' По остальному пришлём инструкцию отдельно.'}
      </p>

      <h2 className="mb-3 mt-6 text-[15px] font-bold tracking-[-0.02em]">Документы</h2>
      <div className="overflow-hidden rounded-lg border border-line-2 bg-white">
        {DOCS.map(d => (
          <div key={d.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-0">
            <div className="min-w-[200px] flex-1">
              <div className="text-[14px] font-semibold">{d.name}</div>
              <div className="font-mono text-[11px] text-ink/50">{project.domain}{d.href}</div>
            </div>
            <button type="button" className={`rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:border-ink/40 ${RING}`}>
              Открыть
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-ink/50">Ссылки постоянные: обновим документ — адрес не изменится.</p>

      <h2 className="mb-3 mt-6 text-[15px] font-bold tracking-[-0.02em]">Вот что появится на сайте</h2>
      <div className="overflow-hidden rounded-lg border border-line-2">
        <div className="border-b border-line-2 bg-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink/45">
          подвал сайта после установки
        </div>
        <div className="bg-ink px-5 py-5">
          <div className="text-[12.5px] font-semibold text-white">{project.org.name} · ИНН {project.org.inn}</div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-white/70">
            <span className="underline decoration-white/30 underline-offset-2">Политика конфиденциальности</span>
            <span className="underline decoration-white/30 underline-offset-2">Согласие на обработку ПДн</span>
            <span className="underline decoration-white/30 underline-offset-2">Cookie</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line-2 bg-white p-4">
        <h3 className="text-[14px] font-bold">Документы и алерты — в Telegram</h3>
        <p className="mb-3 mt-1 text-[13px] text-ink/65">
          Бот пришлёт ссылки, а если на сайте что-то изменится — предупредит первым.
        </p>
        <button type="button" className={`rounded-lg border border-line-2 bg-white px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-ink/40 ${RING}`}>
          Подключить бота
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-line-2 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-[14.5px] text-ink/70">Подписка</span>
          <span className="text-[19px] font-extrabold tracking-[-0.02em]">{PRICE}</span>
        </div>
        <p className="mt-1 text-[12.5px] text-ink/55">Спишем при оплате, дальше — раз в месяц. Отменить можно в любой момент.</p>
      </div>

      <div className="mt-6 border-t border-line-2 pt-4">
        <Link href="/app/start/install"
          className={`flex w-full items-center justify-center rounded-lg bg-ink px-5 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
          Установить и оплатить за {PRICE.split('/')[0].trim()}
        </Link>
        <p className="mt-2.5 text-center text-[12px] text-ink/55">Без оплаты и установки баннер и реквизиты на сайте не появятся</p>
      </div>
    </StartFrame>
  );
}
