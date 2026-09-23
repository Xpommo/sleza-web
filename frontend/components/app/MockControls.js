'use client';

import { createContext, useContext, useState } from 'react';

// Переключатели, которые существуют только в макете: роль аккаунта, наличие данных.
// Каркас навигации решили держать один — сайдбар, тумблер «шапка/сайдбар» убрали.
// Роль придёт с сервера, а пустое состояние — это просто отсутствие проектов.

const MockContext = createContext(null);

export function useMock() {
  const ctx = useContext(MockContext);
  if (!ctx) throw new Error('useMock вне MockProvider');
  return ctx;
}

export function MockProvider({ children }) {
  const [isAgency, setIsAgency] = useState(false);
  const [hasData,  setHasData]  = useState(true);
  return (
    <MockContext.Provider value={{ isAgency, setIsAgency, hasData, setHasData }}>
      {children}
    </MockContext.Provider>
  );
}

const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

function Group({ label, options, value, onChange }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}:
      {options.map(([val, text]) => (
        <button
          key={text}
          type="button"
          aria-pressed={value === val}
          onClick={() => onChange(val)}
          className={`rounded px-1.5 py-0.5 transition-colors ${RING} ${
            value === val ? 'bg-ink text-white' : 'hover:text-ink'
          }`}
        >
          {text}
        </button>
      ))}
    </span>
  );
}

export function MockBar() {
  const m = useMock();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/60">
      <span className="rounded-full border border-line-2 px-2 py-0.5">макет</span>
      <Group
        label="режим"
        options={[[false, 'клиент'], [true, 'агентство']]}
        value={m.isAgency}
        onChange={m.setIsAgency}
      />
      <Group
        label="данные"
        options={[[true, 'есть'], [false, 'пусто']]}
        value={m.hasData}
        onChange={m.setHasData}
      />
    </div>
  );
}
