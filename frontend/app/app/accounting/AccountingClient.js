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
import { accountSites } from '../site/_shared/sites';
import { BTN_OUTLINE, LINK, MONEY_TITLE, MoneyHeader, Panel, Row } from '../billing/BillingBits';

// «Баланс и платежи» → вкладка «Документы» (владелец 24.09; до того — раздел
// «Бухгалтерия»): куда присылать чеки, счета и акты, и сами акты. История
// операций — на вкладке «Платежи»: это движение по балансу.
// Акт — на оплаченный год сайта (списание с баланса), не на пополнение.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountingClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const saved = loadAnketa();
    if (!saved.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(saved);
    setUser(accountUser(CURRENT_USER));
    setEmail(saved.billing?.actsEmail || '');
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const ops = b.ops || [];
  const started = Boolean(b.method || ops.length);
  const paidSites = accountSites(a).filter((s) => s.period && (s.kind === 'paid' || s.kind === 'off-soon'));

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
      <AccountSidebar active={MONEY_TITLE} user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-4xl">
          <MoneyHeader tab="Документы" />

          {!started ? (
            <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
              <p className="text-sm text-ink/70">Чеки, счета и акты появятся здесь после первого пополнения баланса.</p>
              <Link href="/app/billing" className={`mt-3 inline-block ${LINK}`}>
                Пополнить баланс →
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
