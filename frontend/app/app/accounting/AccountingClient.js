'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalIcon } from '../../../components/app/AppIcons';
import { IconAction } from '../../../components/app/DocRows';
import { CURRENT_USER } from '../../../lib/appMock';
import { SITE_ID } from '../../../lib/docPackage';
import { Field } from '../start/_shared/AnketaChrome';
import { accountUser, loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { AccountSidebar } from '../site/_shared/SiteChrome';
import { accountSites, formatRub } from '../site/_shared/sites';
import { formatDate } from '../site/_shared/subscription';
import { BTN_OUTLINE, LINK, Panel, Row } from '../billing/BillingBits';

// «Бухгалтерия» (владелец 24.09): то, что нужно бухгалтеру, — отдельно, чтобы
// «Оплата» осталась про баланс и сайты. Появляется после первого пополнения,
// как раньше блок «Для бухгалтерии»; до него здесь пусто.
// Акт — на оплаченный год сайта (списание с баланса), не на пополнение.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIRST = 8;

export default function AccountingClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState(null);
  const [all, setAll] = useState(false);
  // «Посмотреть историю счетов» в «⋯» сайта в «Оплате» — история только его.
  const [siteFilter, setSiteFilter] = useState(null);

  useEffect(() => {
    const saved = loadAnketa();
    if (!saved.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(saved);
    setUser(accountUser(CURRENT_USER));
    setEmail(saved.billing?.actsEmail || '');
    setSiteFilter(new URLSearchParams(window.location.search).get('site'));
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const ops = b.ops || [];
  const started = Boolean(b.method || ops.length);
  const paidSites = accountSites(a).filter((s) => s.period && (s.kind === 'paid' || s.kind === 'off-soon'));
  const list = [...ops].reverse().filter((op) => !siteFilter || op.site === siteFilter);
  const shown = siteFilter || all ? list : list.slice(0, FIRST);

  function save() {
    if (!EMAIL_RE.test(email)) {
      setErr('Нужна почта вида name@site.ru — на неё придут чеки и акты.');
      return;
    }
    setErr(null);
    saveAnketa({ billing: { ...loadAnketa().billing, actsEmail: email } });
    setA(loadAnketa());
    setEditing(false);
  }

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <AccountSidebar active="Бухгалтерия" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px] lg:sr-only">Бухгалтерия</h1>

          {!started ? (
            <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7 lg:mt-0">
              <p className="text-sm text-ink/70">Чеки, счета и акты появятся здесь после первого пополнения баланса.</p>
              <Link href="/app/billing" className={`mt-3 inline-block ${LINK}`}>
                Перейти в «Оплату» →
              </Link>
            </section>
          ) : (
            <>
              <Panel title="Куда присылать документы">
                <Row
                  label="Чеки, счета, акты"
                  value={b.actsEmail || 'почта не указана'}
                  note="сюда приходят документы об оплате"
                  action="Изменить"
                  open={editing}
                  onAction={() => setEditing(!editing)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <Field
                        label="Почта для документов"
                        type="email"
                        placeholder={`buh@${a.domain}`}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErr(null);
                        }}
                        error={err}
                      />
                    </div>
                    <button type="button" onClick={save} className={`sm:mt-[30px] ${BTN_OUTLINE}`}>
                      Сохранить
                    </button>
                  </div>
                </Row>
              </Panel>

              {/* Однострочным списком: у агента операций десятки (владелец 23.09). */}
              {ops.length > 0 && (
                <Panel title={siteFilter ? `История операций · ${siteFilter}` : 'История операций'}>
                  {siteFilter && (
                    <button type="button" onClick={() => setSiteFilter(null)} className={`mb-1 ${LINK}`}>
                      Показать всю
                    </button>
                  )}
                  <ul className="divide-y divide-line">
                    {shown.map((op) => (
                      <li key={`${op.at}-${op.kind}-${op.site || ''}`} className="flex items-baseline gap-3 py-2 text-[13px]">
                        <span className="w-20 shrink-0 text-ink/60">{formatDate(op.at)}</span>
                        <span className="min-w-0 flex-1 break-words text-ink/80">
                          {op.kind === 'topup' ? `Пополнение ${op.method === 'Картой' ? 'картой' : 'по счёту'}` : `Оплата года · ${op.site}`}
                        </span>
                        <span className={`shrink-0 font-semibold ${op.kind === 'topup' ? 'text-ok' : 'text-ink'}`}>
                          {op.kind === 'topup' ? '+' : '−'}
                          {formatRub(op.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!siteFilter && list.length > FIRST && (
                    <button type="button" onClick={() => setAll(!all)} className={`mt-1 ${LINK}`}>
                      {all ? 'Свернуть' : `Вся история — ${list.length}`}
                    </button>
                  )}
                </Panel>
              )}

              <Panel title="Акты">
                {paidSites.length > 0 ? (
                  <ul className="divide-y divide-line">
                    {paidSites.map((s) => (
                      <li key={s.key} className="flex items-center gap-3 py-1.5 text-[13px]">
                        <span className="min-w-0 flex-1 truncate text-ink/80">
                          {s.domain} · {s.period.from} – {s.period.to}
                        </span>
                        <IconAction label={`Открыть акт ${s.domain}`} icon={ExternalIcon} href={`https://cdn.sleza.media/${SITE_ID}/act-${s.key}-${s.period.years}.pdf`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-[13px] text-ink/60">Акт появится, когда с баланса оплатится год сайта.</p>
                )}
              </Panel>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
