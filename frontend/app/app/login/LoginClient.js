'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthButton, BrandMark, MailCodeLogin, MaxIcon, TelegramIcon } from '../../../components/app/AuthBits';
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
  const [mailOpen, setMailOpen] = useState(false);

  function enter(via, email) {
    signIn(via, email);
    router.push('/app/sites');
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-paper px-6 py-14 sm:items-center sm:py-12">
      <div className="w-full max-w-[430px]">
        <div className="mb-12">
          <BrandMark />
        </div>

        <h1 className="text-[34px] font-bold tracking-[-0.045em] text-ink sm:text-[38px]">Вход в кабинет</h1>
        <p className="mt-3 text-[15px] leading-6 text-ink/55">Выберите, чем удобнее войти — пароль не нужен.</p>

        <div className="mt-8 space-y-3">
          <AuthButton icon={<TelegramIcon />} onClick={() => enter('Telegram')}>
            Через Telegram
          </AuthButton>
          <AuthButton icon={<MaxIcon />} onClick={() => enter('MAX')}>
            Через MAX
          </AuthButton>
          <MailCodeLogin
            open={mailOpen}
            onOpen={() => setMailOpen(true)}
            onClose={() => setMailOpen(false)}
            submitLabel="Войти →"
            onDone={(email) => enter('почта', email)}
          />
        </div>

        <p className="mt-8 text-center text-[12px] text-ink/45">
          Нет аккаунта?{' '}
          <Link href="/app/register" className="font-semibold text-brand hover:underline">
            Создать
          </Link>
        </p>

        {/* Своих политики и оферты у продукта пока нет — ссылки в «#», как у
            галочек регистрации (открытый вопрос владельцу, HANDOFF). */}
        <p className="mt-8 border-t border-line pt-6 text-center text-[12px] text-ink/40">
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
