'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthMethods, BrandMark, MailCodeLogin, MaxIcon, MessengerCodeLogin, TelegramIcon } from '../../../components/app/AuthBits';
import { MailIcon } from '../../../components/app/AppIcons';
import { signIn } from '../start/_shared/anketaState';

// Вход в кабинет (живой макет, s-login). Тихий экран: сюда приходит тот, у
// кого аккаунт уже есть, — блок пользы принадлежит регистрации. Пароля в
// продукте нет: мессенджер или код из письма (модель владельца, 17.09).
// Годовая подписка, заходят раз в несколько месяцев — пароль забудут, а
// письмо придёт всё равно.
//
// Вход ничего не обнуляет: за ним тот же кабинет, что был до выхода, —
// в отличие от регистрации (FIXLOG, интент mailFlow в макете).
export default function LoginClient() {
  const router = useRouter();
  // Раскрыт один способ за раз: Telegram, MAX или почта.
  const [openVia, setOpenVia] = useState(null);

  function enter(via, email) {
    signIn(via, email);
    router.push('/app/sites');
  }

  return (
    <main className="flex min-h-screen min-h-dvh items-start justify-center bg-paper px-6 py-14 sm:items-center sm:py-12">
      <div className="w-full max-w-[430px]">
        <div className="mb-12">
          <BrandMark />
        </div>

        <h1 className="text-[28px] font-bold tracking-[-0.045em] text-ink sm:text-[36px]">Вход в кабинет</h1>
        <p className="mt-3 text-[15px] leading-6 text-ink/60">Выберите, чем удобнее войти. Пароль не нужен.</p>

        <div className="mt-8">
          {/* Код от нашего бота вводится здесь же, как код из письма (владелец
              29.09, по макету Ивана). Раскрыт один способ, остальные —
              «таблетками» под ним (AuthMethods). */}
          <AuthMethods
            openId={openVia}
            onOpen={setOpenVia}
            methods={[
              ...[['Telegram', TelegramIcon], ['MAX', MaxIcon]].map(([via, Icon]) => ({
                id: via,
                label: via,
                icon: <Icon size={20} />,
                node: (
                  <MessengerCodeLogin
                    via={via}
                    icon={<Icon />}
                    open={openVia === via}
                    onOpen={() => setOpenVia(via)}
                    onClose={() => setOpenVia(null)}
                    onDone={() => enter(via)}
                  />
                ),
              })),
              {
                id: 'почта',
                label: 'e-mail',
                icon: <MailIcon size={18} className="text-ink/60" />,
                node: (
                  <MailCodeLogin
                    open={openVia === 'почта'}
                    onOpen={() => setOpenVia('почта')}
                    onClose={() => setOpenVia(null)}
                    submitLabel="Войти →"
                    onDone={(email) => enter('почта', email)}
                  />
                ),
              },
            ]}
          />
        </div>

        <p className="mt-8 text-center text-[12px] text-ink/60">
          Нет аккаунта?{' '}
          <Link href="/app/register" className="font-semibold text-brand hover:underline">
            Создать
          </Link>
        </p>

        {/* Своих политики и оферты у продукта пока нет — ссылки в «#», как у
            галочек регистрации (открытый вопрос владельцу, HANDOFF). */}
        <p className="mt-8 border-t border-line pt-6 text-center text-[12px] text-ink/60">
          <Link href="#" className="hover:text-ink">
            Политика обработки персональных данных
          </Link>{' '}
          ·{' '}
          <Link href="#" className="hover:text-ink">
            Оферта
          </Link>
        </p>
      </div>
    </main>
  );
}
