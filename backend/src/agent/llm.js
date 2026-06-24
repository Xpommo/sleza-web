/**
 * LLM-слой агента. Провайдер выбирается через AGENT_LLM:
 *   - groq   (по умолчанию) — llama-3.3-70b-versatile, ключ DEFAULT_GROQ_KEY (уже есть)
 *   - claude — «на твоей основе», нужен ANTHROPIC_API_KEY
 *
 * messages: [{ role: 'user'|'assistant', content }] — короткая история диалога.
 */

const PROVIDER = (process.env.AGENT_LLM || 'groq').toLowerCase();

async function chatGroq({ system, messages }) {
  const key = process.env.DEFAULT_GROQ_KEY;
  if (!key) throw new Error('DEFAULT_GROQ_KEY не задан в .env');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: process.env.AGENT_GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 700,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Groq ${res.status}: ${j?.error?.message || JSON.stringify(j)}`);
  return j.choices?.[0]?.message?.content?.trim() || '';
}

async function chatClaude({ system, messages }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY не задан — нужен для AGENT_LLM=claude');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.AGENT_CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 700,
      system,
      messages,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Claude ${res.status}: ${j?.error?.message || JSON.stringify(j)}`);
  return j.content?.[0]?.text?.trim() || '';
}

export function llmProvider() {
  return PROVIDER;
}

export async function chat({ system, messages }) {
  if (PROVIDER === 'claude') return chatClaude({ system, messages });
  return chatGroq({ system, messages });
}
