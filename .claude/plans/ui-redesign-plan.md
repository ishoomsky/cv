# План: UI/UX переработка space-CV

Статус: **ready** (решения приняты) · Ведём через скилл `.claude/skills/ui-ux-pro-max` (search.py).
Цель: усилить визуальный язык и UX, не ломая узнаваемую sci-fi/HUD эстетику.

---

## Фаза 0 — База доступности ✅ (сделано)

Уже в `main`:
- Focus-состояния (`:focus-visible`), Escape + управление фокусом в модалке, `aria-*`, тач-таргеты ≥44px — коммит `3aca21d`.
- `prefers-reduced-motion`: статичный фон (star-field / planet / asteroids) — коммит `3aca21d`.
- Контраст мелких подписей 3.0:1 → ~5:1 (`$cyan-dim` .45→.65) — коммит `272d029`.

Проверено в браузере: рендер, focus-кольцо, open/close досье, Escape.

---

## Ориентир от скилла

`search.py "developer portfolio sci-fi HUD dark" --design-system` даёт:
- Палитра: фон `#0F172A`, текст `#F8FAFC`, **CTA-акцент `#22C55E`**, primary/secondary slate — близко к текущей.
- Шрифты: Share Tech Mono + Fira Code (сейчас Orbitron + Share Tech Mono).
- Анти-паттерны: «плоский без глубины», «перегруз текстом».

Текущая база (cyan `#00d4ff` на тёмном) сильная — переработка = точечное усиление, не снос.

---

## Принятые решения

1. **Второй акцент — да.** Cyan `#00d4ff` остаётся структурным акцентом (рамки, лейблы, HUD-хром). Добавляем **CTA-зелёный `#22C55E`** (скилл: палитра Developer Tool/IDE, «run green»; рифмуется с online-статусом `#00ff88`). Зелёный — только для главного действия: featured-кнопка «01 CV», кнопка PDF, ключевые CTA. Не размазывать.
2. **Шрифт — максимальная читаемость.** Для длинной прозы моноширинный проигрывает. Оставляем sci-fi mono для HUD-хрома (заголовки Orbitron, лейблы/ключи/данные Share Tech Mono), а **тело досье (summary, буллеты, описания проектов) → Inter** (скилл «Spatial Clear»: optimized for readability on glass / dynamic backgrounds). Гибрид: mono-хром + sans-контент.
3. **Глубина — усилить.** Слоистое стекло (плотнее fill + inset-подсветка сверху), drop-shadow на панели/модалке, лёгкие градиентные заливки, elevation чипов/карточек на hover. Беречь перф: тяжёлый blur не наращивать на мобиле.
4. **Ре-лейаут — структурный.** Не косметика: пересобрать иерархию досье (см. Фаза 3).

---

## Фаза 1 — Дизайн-токены + шрифты + иконки

- Вынести токены в общий `src/app/_design-tokens.scss`: cyan-семейство, **новый `$cta: #22C55E`** (+ hover/glow варианты), текст, spacing-шкала, z-index (10/20/30/50), радиусы, тени/elevation.
- Подключить **Inter** в `index.html` (Google Fonts, уже есть preconnect); Orbitron/Share Tech Mono оставить. Задать `--font-display / --font-mono / --font-body`.
- **Иконочная система (SVG, Simple Icons):** добавить в `public/icons/` официальные `linkedin.svg`, `github.svg`, `email/mail.svg`. Единый viewBox 24×24, `currentColor`. По просьбе — прежде всего **LinkedIn**.
- Проверить контраст `$cta` как текста/бордера (≥4.5:1 на тёмном).
- Файлы: `_design-tokens.scss`, `index.html`, `public/icons/*`, `content-container.component.scss`.

## Фаза 2 — HUD-панель

- Перевести CTA-акцент featured-кнопки «01 CV» на зелёный `$cta` (рамка/стрелка/hover-glow); остальные nav — cyan как сейчас.
- Иконки в nav/контакты: **LinkedIn** (и GitHub/email) SVG вместо/рядом с текстом.
- Усилить глубину панели: плотнее стекло, inset top-highlight, drop-shadow, лёгкий градиент fill.
- Состояния hover/active/focus кнопок под новую палитру; landscape-мобила (риск обрезки панели по центру).
- Файлы: `content-container.component.{html,scss}`.

## Фаза 3 — Досье / модалка (структурный ре-лейаут)

- Пересобрать иерархию: **левый rail «at a glance»** (identity, контакты с иконками, skills, languages, education) + **основная колонка-нарратив** (summary → experience → projects). Уточнить пропорции под ширину 1040px.
- Тело прозы (summary, буллеты, project-описания) → **Inter**; заголовки/лейблы/чипы остаются mono.
- Sticky sub-header (имя/роль/действия) при скролле body.
- Глубина: карточки проектов и таймлайн-узлы как приподнятые слои, hover-elevation; чипы скиллов с объёмом.
- Контакты: **LinkedIn/GitHub/email иконки** в hero вместо голого текста.
- (Опц.) focus-trap + Tab-цикл внутри модалки.
- Файлы: `content-container.component.{html,scss,ts}`.

## Фаза 4 — Космический фон

- Тюнинг палитры/плотности nebula/stars под двойной акцент (cyan + точечный зелёный).
- Рассмотреть **LinkedIn** в наборе floating-плиток `asteroids` (сейчас TS/Angular/Node/Anthropic) — если решим показывать соц-иконку и в фоне.
- Бюджет перфа на мобиле (dpr ≤2 уже есть).
- Файлы: `nebula/`, `star-field/`, `asteroids/`, `planet/`, `public/icons/`.

## Фаза 5 — Верификация

- `npm run build` зелёный; браузер-прогон (focus, Escape, reduced-motion, 375/768/1024/1440px).
- Регресс доступности по чеклисту скилла (SKILL.md → Pre-Delivery Checklist).
- Контраст пересчитать для любых новых цветов (≥4.5:1 мелкий текст).

---

## Рабочие принципы

- Данные — только `cv-data.json`, копию в шаблоны не хардкодим.
- Каждая фаза = отдельный коммит, сборка зелёная перед коммитом.
- Не регрессить уже достигнутую доступность.
