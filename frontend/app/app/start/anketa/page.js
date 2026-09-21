'use client';

import { useState } from 'react';
import Link from 'next/link';
import StartFrame, { RING } from '../../../../components/start/StartFrame';
import { projectSummary } from '../../../../lib/appMock';
import { getProject } from '../../../../lib/projectMock';

const PURPOSES = [
  'Записать на занятие',
  'Ответить на обращение',
  'Рассказывать об акциях и наборах',
];

// 2 · Пара уточнений, которые со стороны не видно — раньше здесь был ещё
// чек-лист «подтвердите находки», убрали: находки не мнение клиента, а факт
// скана, он их уже видел на странице проекта. Галочки «подтвердите то, что мы
// и так знаем» только путали.
//
// Второй вопрос (для чего собираете данные) раньше жил в отдельном шаге
// «досбор» перед документами — перенесли сюда: это тот же характер вопроса,
// что и про рекламу, естественнее спросить оба разом, а не двумя разными
// заходами в разных частях пути.
export default function AnketaPage() {
  const project = getProject('p1');
  const summary = projectSummary(project);
  const [callsBase, setCallsBase] = useState(true);
  const [purposes, setPurposes] = useState(() => new Set(PURPOSES));

  const togglePurpose = (p) => setPurposes(prev => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });

  return (
    <StartFrame project={project} summary={summary} step={2} back={{ href: '/app/start/prepare', label: 'что подготовим' }}>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Пара уточнений, которые со стороны не видно</h1>
      <p className="mt-2 text-[15px] text-ink/65">Сканер видит сайт, но не видит, что вы делаете с собранными контактами.</p>

      <div className="mt-5 rounded-lg border border-line-2 bg-white p-4">
        <h3 className="text-[15px] font-bold">Звоните, пишете в мессенджеры или на почту по базе клиентов?</h3>
        <p className="mb-3.5 mt-1.5 text-[12.5px] text-ink/55">
          От этого зависит, нужно ли отдельное согласие на рекламные рассылки.
          Без него звонок или письмо по старой базе — уже нарушение.
        </p>
        <div className="inline-flex gap-0.5 rounded-lg border border-line-2 bg-white p-0.5">
          {[[true, 'Да'], [false, 'Нет']].map(([val, label]) => (
            <button key={label} type="button" onClick={() => setCallsBase(val)}
              className={`rounded-md px-4 py-2 text-[14px] font-bold transition-colors ${callsBase === val ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-line-2 bg-white p-4">
        <h3 className="text-[15px] font-bold">Для чего вы собираете контакты?</h3>
        <p className="mb-1 mt-1.5 text-[12.5px] text-ink/55">
          Это попадёт в политику — цели обработки должны совпадать с тем, что вы делаете на самом деле.
        </p>
        <div className="mt-2.5">
          {PURPOSES.map(p => (
            <label key={p} className="flex items-center gap-3 border-b border-line py-2.5 text-[14.5px] last:border-0">
              <input type="checkbox" checked={purposes.has(p)} onChange={() => togglePurpose(p)}
                className="h-[19px] w-[19px] accent-ink" />
              {p}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-line-2 pt-4">
        <Link href="/app/start/ready"
          className={`flex w-full items-center justify-center rounded-lg bg-ink px-5 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
          Далее
        </Link>
      </div>
    </StartFrame>
  );
}
