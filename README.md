# Skia + PixiJS Renderer

Рендеринг PixiJS контейнеров через Skia с поддержкой экспорта в PDF и обработкой кликов.

## Требования

- **Node.js** >= v24.14.0 (может работать с более старой версией, не проверялось)

## Установка

```bash
npm install
```

## Запуск
```bash
npm run dev
```
или для прода
```bash
npm run build
```

В проекте можно генерировать документацию:
```bash
npm run docs
```
- после в корне проекта будет папка docs - в ней надо запустить файл index.html

В проекте уже умеются скомпилированные Skia исходники с pdf методами (/libs) (версия Skia - 33a1c4f3e06782f4c14330d22d05dbb931f5a454 2026-05-30)
[Папка libs](./libs)

Точка входа: main.ts
[main.ts](./src/main.ts)

отрисовать канвасы: (Pixi и Skia) renderCanvases
[`renderCanvases`](./src/renderPixiCanvas.ts)
Skia канвас отрисовывается строго после того как отрисовался Pixi

#
получить Pixi контент: getPixiContent или getRandomizedPixiContent
[`getPixiContent`](./src/utils/pixiContent.ts)

Кит для регистрации/удаления не удаляемых сборщиком мусора Skia обьектов графики
[`CanvasKitRegistry`](./src/utils/canvasKitRegistry.ts)

Загрузка файлов кастомной сборки Skia
[`loadCanvasKit`](./src/utils/loadCanvasKit.ts)

Класс с отрисовкой в Skia обьектов из Pixi
[`PixiRendererFactory`](./src/utils/pixiRendererFactory.ts)
#


Pixi атрибуты которые правильно "переносятся" в Skia описаны в PixiTransformAttributes интерфейсе
[`PixiTransformAttributes`](./src/types.ts)

для экспорта в PDF сначала записывается рендер recordSkiaPicture (в SkPicture),
[`recordSkiaPicture`](./src/renderSkiaCanvas.ts)
потом сохрается pdf файл через PdfDocument, записываем туда записаную картинку (drawPicture),
далее сохраняем файл как blob