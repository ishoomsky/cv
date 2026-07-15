y# Портфолио: новые hero-изображения проектов

## Context (зачем)

Текущие изображения в портфолио (`public/projects/**`) — это реальные
маркетинговые скриншоты казино/гейминг-сайтов: кричащие золото/фиолетовый/зелёный,
перегруженные, с чужими логотипами и текстом. Они визуально дерутся с тёмным
cyan-HUD космическим стилем сайта и выглядят «убого». Плюс мелковаты (~1376×768).

Цель — заменить их на **реалистичные кинематографичные сцены домена каждого
проекта, отградуированные под палитру сайта** (тёмно-синий космос + циан),
приглушённые и «в тему». Это задача про генерацию изображений: ниже — готовые
промпты и спецификации. Сам генератор у меня в инструментах отсутствует, поэтому
картинки генерирует пользователь (или я — если подключим image-tool), а затем я
кладу файлы и проверяю в приложении.

## Технические требования к изображениям

- **Пропорции:** 16:9. Карточка на десктопе 16:9, на мобильном кроп в 4:3 (по
  центру). `object-fit: cover`, масштаб `scale(1.12)` + горизонтальный дрейф ±3%.
- **Разрешение:** 1920×1080 (минимум 1600×900). Крупнее текущих ~1376×768.
- **Формат/пути (сохранить те же, чтобы не трогать код):**
  - `public/projects/baba-entertainment/baba16-9.png` — 1 шт.
  - `public/projects/neotech/leon.webp` и `.../twin.webp` — 2 шт. (карусель)
  - `public/projects/iba/iba16-9.png` — 1 шт.
  - `public/projects/vysnova/vsnv-16-9.png` — 1 шт.
  - Итого **5 изображений**. Если менять расширение/формат — синхронно править
    массив `images` в `src/app/data/cv-data.json`.
- **Композиция (важно):** поверх картинки слева-снизу лежит матовая плашка с
  названием/описанием проекта → нижняя-левая ~40% должна быть спокойной и тёмной
  (negative space под текст). Ключевой визуальный акцент — справа/сверху.
  Важные детали держать подальше от краёв (кроп 4:3 + дрейф ±3% + scale 1.12) —
  композиция должна пережить центральный кроп в 4:3.
- **Без текста, логотипов, водяных знаков, UI-надписей** в самой картинке.

## Общий «стиль-суффикс» (добавлять в конец каждого промпта)

```
cinematic realistic photograph, dark navy background (#010a16 deep space blue),
muted desaturated palette, teal-cyan accent lighting (#00d4ff), low-key moody
studio lighting, soft volumetric glow, shallow depth of field, subtle bokeh,
calm dark negative space in the lower-left third for text overlay, main subject
weighted to the right and upper area, clean composition, high detail, sharp,
professional product photography, 8k --ar 16:9 --style raw --stylize 200
```

**Negative / чего избегать** (для Flux/SD — как negative prompt; для MJ можно
добавить через `--no`):

```
text, letters, words, captions, logos, watermark, UI labels, gaudy gold, bright
purple, magenta, rainbow neon, oversaturated, cluttered, busy, casino jackpot
kitsch, low quality, jpeg artifacts, deformed hands, extra fingers, blurry
```

## Промпты по проектам (готовы к копированию — стиль-суффикс уже развёрнут)

### 1. SOCIAL-CASINO PLATFORM — Baba Entertainment → `baba16-9.png`
Реал-тайм соц-казино, web + mobile WebView, реактивный UI.

```
Extreme close-up of a modern smartphone held in one hand in a dark room, screen glowing with an abstract tasteful real-time casino game interface (soft geometric slot reels and chips, no readable text), cool cyan and teal screen light reflecting on the fingers and dark surface, night ambience, faint particle glow, sleek premium mobile-gaming mood, cinematic realistic photograph, dark navy background deep space blue, muted desaturated palette, teal-cyan accent lighting, low-key moody studio lighting, soft volumetric glow, shallow depth of field, calm dark negative space in the lower-left third for text overlay, main subject weighted to the right and upper area, high detail, sharp, professional product photography, 8k --ar 16:9 --style raw --stylize 200
```

### 2a. WEB & MOBILE GAMING UI — Neotech → `leon.webp`
Онлайн-гейминг/беттинг интерфейсы на нескольких устройствах, Angular + Vue.

```
Cinematic dark desk workspace with a laptop, tablet and smartphone arranged together, each screen showing an abstract sports-gaming betting dashboard (charts, cards, live tiles, no readable text), synchronized cyan-teal screen glow lighting the dark desk, responsive multi-device design vibe, moody studio lighting, reflections on a matte surface, cinematic realistic photograph, dark navy background deep space blue, muted desaturated palette, teal-cyan accent lighting, low-key lighting, soft volumetric glow, shallow depth of field, calm dark negative space in the lower-left third for text overlay, main subject weighted to the right and upper area, high detail, sharp, professional product photography, 8k --ar 16:9 --style raw --stylize 200
```

### 2b. WEB & MOBILE GAMING UI — Neotech → `twin.webp` (второй кадр карусели)
Другой ракурс той же темы.

```
Over-the-shoulder low-angle shot of a single ultrawide monitor in a dark room displaying an abstract online-gaming interface with glowing cyan panels and live data tiles (no readable text), teal ambient light, soft bokeh of a second device out of focus on the right, sleek modern web-app atmosphere, cinematic realistic photograph, dark navy background deep space blue, muted desaturated palette, teal-cyan accent lighting, low-key moody studio lighting, soft volumetric glow, shallow depth of field, calm dark negative space in the lower-left third for text overlay, main subject weighted to the right and upper area, high detail, sharp, professional product photography, 8k --ar 16:9 --style raw --stylize 200
```

### 3. IBM ENTERPRISE PRODUCT UI — IBA Group → `iba16-9.png`
Enterprise B2B web-приложение, React/Angular, дашборды, большая команда, 2 года.

```
Modern enterprise operations center at night, an analyst desk with large curved monitors showing clean abstract B2B data dashboards (grids, graphs, KPI tiles, no readable text), corporate high-tech mood, cool blue-cyan monitor glow filling the dark room, orderly and premium, subtle reflections, cinematic depth of field, cinematic realistic photograph, dark navy background deep space blue, muted desaturated palette, teal-cyan accent lighting, low-key lighting, soft volumetric glow, calm dark negative space in the lower-left third for text overlay, main subject weighted to the right and upper area, high detail, sharp, professional product photography, 8k --ar 16:9 --style raw --stylize 200
```

### 4. CROSS-PLATFORM APPS — Vysnova Publishing House → `vsnv-16-9.png`
React Native full-stack, Node/Express/MongoDB, GCP, внутренний CRM + VoIP.

```
Dark modern developer workstation, cross-platform devices (phone and laptop running the same abstract app UI, no readable text) in the foreground, a softly-blurred backdrop of glowing network nodes and a data server topology, a headset resting on the desk hinting at a CRM VoIP call flow, cyan-teal data lines and ambient glow, cinematic tech atmosphere, cinematic realistic photograph, dark navy background deep space blue, muted desaturated palette, teal-cyan accent lighting, low-key moody studio lighting, soft volumetric glow, shallow depth of field, calm dark negative space in the lower-left third for text overlay, main subject weighted to the right and upper area, high detail, sharp, professional product photography, 8k --ar 16:9 --style raw --stylize 200
```

## Внедрение и проверка

1. Сгенерировать 5 изображений по промптам (1920×1080), выбрать кадры со
   спокойным тёмным низом-слева.
2. Положить под теми же путями/именами в `public/projects/**` (или обновить
   `images` в `cv-data.json`, если сменили формат). Оптимизировать вес
   (WebP/сжатие) — текущие png весят 1–2 МБ, желательно ≤ 400 КБ.
3. `npm start`, открыть `/portfolio`.
4. Проверить в двух вьюпортах (десктоп 16:9 и мобильный 4:3-кроп):
   - изображения не конфликтуют по цвету с cyan-HUD;
   - плашка с названием/описанием слева-снизу читается (низ достаточно тёмный);
   - ключевой акцент не срезается кропом/дрейфом.
   Снять скриншоты (Playwright, как в прошлых правках) для подтверждения.
5. При необходимости — подкрутить промпт (сдвинуть акцент правее/затемнить низ)
   и перегенерировать проблемный кадр.

## Замечания
- Правок кода не требуется, если сохранить имена/форматы файлов. Единственный
  возможный трогаемый файл — `src/app/data/cv-data.json` (только если меняется
  формат/кол-во изображений).
- У Neotech две картинки (карусель) — поэтому 5 изображений на 4 проекта.
