'use client';

import { useState } from 'react';
import Link from 'next/link';
import StartFrame, { RING } from '../../../../components/start/StartFrame';
import RequisitesModal from '../../../../components/start/RequisitesModal';
import { OwnerBadge } from '../../../../components/app/StatusBits';
import { projectSummary } from '../../../../lib/appMock';
import { projectChecks, splitByOwner, getProject } from '../../../../lib/projectMock';

// 1 · «Готовим документы для вас» — первый экран после «Подключить» на странице
// проекта. Раньше пакет, макет подвала, цена и кнопка оплаты стояли на одном
// экране («оффер») — на тесте с людьми, не знакомыми с сервисом, это было
// слишком плотно, никто не понял, что вообще происходит. Разносим по смыслу:
// здесь — что готовим и по каким находкам, дальше отдельным шагом — пара
// уточняющих вопросов, и только потом — цена и оплата.
//
// Реквизиты — единственный ввод на этом шаге — вынесены в модалку
// (RequisitesModal), а не в общий скролл: закрыл и вернулся туда же.
export default function PreparePage() {
  const project = getProject('p1');
  const summary = projectSummary(project);
  const checks = projectChecks(project);
  const { weClose, youClose } = splitByOwner(checks);

  const [org, setOrg] = useState(project.org);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqSaved, setReqSaved] = useState(false);

  return (
    <StartFrame project={project} summary={summary} step={1} back={{ href: '/app/project/p1', label: 'результат проверки' }}>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Готовим документы для вас</h1>
      <p className="mt-2 text-[15px] text-ink/65">
        По находкам на {project.domain} подготовим {weClose.length} {weClose.length === 1 ? 'документ' : 'документа'} —
        каждый закрывает конкретную проблему из отчёта.
      </p>

      <div className="mt-5 overflow-hidden rounded-lg border border-line-2 bg-white">
        {weClose.map(c => (
          <div key={c.name} className="flex gap-3 border-b border-line px-4 py-3.5 last:border-0">
            <span className="mt-0.5 shrink-0 text-ok">✓</span>
            <div>
              <div className="text-[14.5px] font-bold">{c.title}</div>
              <div className="mt-0.5 text-[13px] text-ink/60">{c.weDo}</div>
            </div>
          </div>
        ))}
      </div>

      {youClose.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-line-2 bg-paper p-4">
          {youClose.map(c => (
            <div key={c.name} className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
              <OwnerBadge byUs={false} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-bold">{c.title}</div>
                <div className="mt-0.5 text-[13px] text-ink/60">{c.youDo}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-6 text-[15px] font-bold tracking-[-0.02em]">Реквизиты</h2>
      <div className="flex items-center gap-3 rounded-lg border border-line-2 bg-white p-4">
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold">{org.name}</div>
          <div className="mt-0.5 font-mono text-[12.5px] text-ink/60">ИНН {org.inn}</div>
        </div>
        {reqSaved && <span className="shrink-0 text-[12.5px] font-semibold text-ok">✓ проверено</span>}
        <button type="button" onClick={() => setReqOpen(true)}
          className={`shrink-0 rounded-lg border border-line-2 px-3.5 py-2 text-[12.5px] font-semibold transition-colors hover:border-ink/40 ${RING}`}>
          {reqSaved ? 'Изменить' : 'Проверить и изменить'}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-ink/60">Подставили из ЕГРЮЛ — станет первым документом в «Документах».</p>

      <div className="mt-6 border-t border-line-2 pt-4">
        <Link href="/app/start/anketa"
          className={`flex w-full items-center justify-center rounded-lg bg-ink px-5 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
          Далее
        </Link>
      </div>

      <RequisitesModal
        open={reqOpen}
        org={org}
        onClose={() => setReqOpen(false)}
        onSave={(next) => { setOrg(next); setReqSaved(true); setReqOpen(false); }}
      />
    </StartFrame>
  );
}
