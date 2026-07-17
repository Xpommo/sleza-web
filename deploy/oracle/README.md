# Деплой бэкенда на Oracle Cloud Always Free (замена Railway)

Railway отвалился (`/health` → `404 Application not found`). Здесь — переезд на
Oracle Always Free ARM VM: бесплатно навсегда, 2 OCPU / 12 ГБ, чего Playwright
хватает с запасом (на free-тарифах Render/Fly дают 512 МБ и 0.1 vCPU — Chromium
туда не влезает).

Код бэкенда не меняется. `server.js` уже читает `BACKEND_URL` как фоллбэк
`RAILWAY_PUBLIC_DOMAIN`, а TG-вебхук перерегистрируется сам при старте.

---

## 1. Виртуалка в Oracle

Console → Compute → Instances → **Create instance**:

| Параметр | Значение |
|---|---|
| Image | **Ubuntu 24.04** (Canonical) |
| Shape | **VM.Standard.A1.Flex** (Ampere ARM) |
| OCPU / RAM | **2 / 12 ГБ** |
| SSH | загрузи свой публичный ключ |

> **Ubuntu 24.04, не 26.04.** Playwright не собирает Chromium под 26.04 —
> `playwright install --with-deps` падает с «does not support chromium on ubuntu26.04».

> **`Out of host capacity`** — самая частая боль Oracle с ARM. Это не ошибка
> аккаунта, в популярных регионах A1 просто разобраны. Лечится сменой
> Availability Domain или повтором позже; апгрейд на Pay-As-You-Go (карта
> привязана, но Always Free остаётся бесплатным) заметно повышает шансы.

> С 15.06.2026 Oracle тихо урезал Always Free ARM с 4 OCPU/24 ГБ до **2/12**.
> Нам хватает, но если консоль предложит 4/24 — не бери, срежут.

## 2. Открыть порты 80/443 — **два раза**

Это место, где застревают все.

1. **VCN Security List**: Networking → VCN → Subnet → Security List → Add Ingress Rule.
   Source `0.0.0.0/0`, TCP, порты `80` и `443`.
2. **iptables на самой машине** — образы Oracle Ubuntu режут всё кроме 22, и
   правило переживает reboot. Это делает `setup.sh` (см. ниже).

Пропустишь любой из шагов — Let's Encrypt не сможет пройти HTTP-01 challenge,
и Caddy будет молча висеть без сертификата.

## 3. DuckDNS

Зайти на https://www.duckdns.org (login через GitHub), создать поддомен
(например `fonarik`) → получить **token**. Итоговый адрес: `fonarik.duckdns.org`.

IP в DuckDNS проставит сам `setup.sh` и дальше будет обновлять его по cron
раз в 5 минут.

## 4. Прогнать setup.sh

```bash
ssh ubuntu@<PUBLIC_IP>
git clone https://github.com/Xpommo/sleza-web.git /tmp/sleza && cd /tmp/sleza
sudo bash deploy/oracle/setup.sh fonarik <DUCKDNS_TOKEN>
```

Скрипт идемпотентный — можно перезапускать. Он ставит Node 22, Caddy,
arm64-Chromium, systemd-юнит, cron для DuckDNS и пробивает iptables.

## 5. `.env`

Скрипт остановится и попросит создать `/opt/fonarik/backend/.env`.
Перенеси значения из Railway (Variables → Raw Editor) и **обязательно** добавь:

```bash
PORT=3001
BACKEND_URL=https://fonarik.duckdns.org      # ← вместо RAILWAY_PUBLIC_DOMAIN; TG-вебхук берёт отсюда
ALLOWED_ORIGINS=https://fonarik-web.vercel.app
FRONTEND_URL=https://fonarik-web.vercel.app

DATABASE_URL=...
DEFAULT_GROQ_KEY=...
DEFAULT_SLEZA_KEY=...
ADMIN_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_WEBHOOK_SECRET=...
RESEND_API_KEY=...
SCANNER_URL=https://fonarik-web.vercel.app
```

```bash
sudo chmod 600 /opt/fonarik/backend/.env
sudo chown ubuntu:ubuntu /opt/fonarik/backend/.env
sudo systemctl start fonarik-backend
curl https://fonarik.duckdns.org/health
```

Ждём `{"status":"ok", ..., "db":true, "tg":true}`.

## 6. Переключить фронт

Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_BACKEND_URL = https://fonarik.duckdns.org
```

Затем **Redeploy** — `NEXT_PUBLIC_*` вшивается в бандл на этапе сборки, без
редеплоя фронт продолжит стучаться на мёртвый Railway.

## 7. TG-вебхук

Отдельно ничего делать не надо: при старте `server.js` вызывает
`registerWebhook(BACKEND_URL)`. Проверить:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

`url` должен указывать на duckdns-домен, `last_error_message` — пустой.

---

## Эксплуатация

```bash
sudo systemctl status fonarik-backend
sudo journalctl -u fonarik-backend -f          # логи
sudo systemctl restart fonarik-backend

# выкатить новый код
cd /opt/fonarik && sudo -u ubuntu git pull --ff-only \
  && cd backend && sudo -u ubuntu npm ci --omit=dev \
  && sudo systemctl restart fonarik-backend
```

Автодеплоя по push, как на Railway, теперь нет — это цена бесплатного. Если
начнёт мешать, вешаем GitHub Actions с SSH-шагом на этот же однострочник.

## Чего мы этим НЕ решили

Сервер вне РФ, а мы храним лиды (ПДн росграждан) и сами же сканером штрафуем
за нарушение локализации по **152-ФЗ ст.18 ч.5**. Oracle — это разблокировка
здесь и сейчас, а не финальная архитектура. План переезда PD-контура в
Yandex Cloud РФ остаётся в силе; сделать его дешевле всего пока БД пустая.
