'use client';

// Ответы анкеты работающего сайта (владелец 29.09): правятся внутри кабинета
// сайта, «Документы → Ответы анкеты», а не на шаге анкеты с «ШАГ 5 ИЗ 6» и
// списком шагов в сайдбаре — у живого сайта это читалось как анкета заново
// (критика 28.09, P2). Пакет и окна «Изменить ответ» — те же, что на шаге 5;
// правка ответа выпускает новую версию документов (AnswerModal, 26.09).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '../../../../../components/app/AppIcons';
import { DOCUMENTS } from '../../../../../lib/docPackage';
import { NO_USER, accountUser, loadAnketa } from '../../../start/_shared/anketaState';
import AnswerModal from '../../../start/documents/AnswerModal';
import DocViewer from '../../../start/documents/DocViewer';
import RequisitesModal from '../../_shared/RequisitesModal';
import { settleRenewals, siteAnketa } from '../../_shared/sites';
import { RING, SiteSidebar } from '../../_shared/SiteChrome';

export default function SiteAnswersClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(NO_USER);
  const [openDoc, setOpenDoc] = useState(DOCUMENTS[0].id);
  // Какой ответ правят сейчас — окно с одним этим вопросом.
  const [editing, setEditing] = useState(null);
  const reload = () => setA(siteAnketa(loadAnketa()));

  useEffect(() => {
    settleRenewals(); // списание в дату продления — до чтения состояния
    const s = siteAnketa(loadAnketa());
    if (!s.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(s);
    setUser(accountUser());
  }, [router]);

  if (!a) return null;

  return (
    <div className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={a.domain} active="Документы" user={user} />

      <main id="content" tabIndex={-1} className="outline-none min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <Link href="/app/site/documents" className={`tap inline-flex items-center gap-2 rounded text-sm font-semibold text-ink/60 transition hover:text-ink ${RING}`}>
            <ArrowLeftIcon size={16} /> Документы
          </Link>
          {/* Заголовок виден и на компьютере: это не раздел из сайдбара, а
              страница внутри «Документов». */}
          <header className="mb-7 mt-4">
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Ответы анкеты</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60">Проверьте ответы, любой можно изменить: документы на сайте обновятся сами.</p>
          </header>

          <DocViewer domain={a.domain} answers={a} current={openDoc} onPick={setOpenDoc} onEdit={setEditing} />

          <button
            type="button"
            onClick={() => router.push('/app/site/documents')}
            className={`inline-flex h-12 items-center justify-center rounded-xl bg-brand px-7 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
          >
            Готово
          </button>
        </div>
      </main>

      {editing === 'requisites' && <RequisitesModal onClose={() => setEditing(null)} onSaved={reload} />}
      {editing && editing !== 'requisites' && <AnswerModal kind={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}
