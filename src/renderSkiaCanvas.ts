import CanvasKitInit, { CanvasKit, Surface, Canvas, Image } from 'canvaskit-wasm'
import { CanvasKitRegistry } from '@/utils/canvasKitRegistry'
import * as PIXI from 'pixi.js-legacy'
import { SkiaRenderable } from '@/types'

// Глобальные переменные
let surface: Surface | null = null
let CanvasKit: CanvasKit | null = null
let skiaCanvas: HTMLCanvasElement | null = null

const skiaRegistry = new CanvasKitRegistry()

// Параметры canvas
const canvasWidth = window.innerWidth / 2 - 20
const canvasHeight = window.innerHeight / 2 - 20

// Инициализация Skia
export const initSkia = async () => {
    // Получаем контейнер
    const container = document.getElementById('skia-canvas')
    if (!container) {
        console.error('Container #skia-canvas not found')
        return false
    }

    // Создаём HTML canvas элемент если его ещё нет
    if (!skiaCanvas) {
        skiaCanvas = document.createElement('canvas')
        skiaCanvas.width = canvasWidth
        skiaCanvas.height = canvasHeight
        skiaCanvas.style.width = `${canvasWidth}px`
        skiaCanvas.style.height = `${canvasHeight}px`
        skiaCanvas.style.border = '1px solid #ccc'

        // Очищаем контейнер и добавляем canvas
        if (skiaCanvas.parentNode) {
            skiaCanvas.remove()
        }
        container.appendChild(skiaCanvas)
    }

    // Инициализируем CanvasKit если ещё не инициализирован
    if (!CanvasKit) {
        CanvasKit = await CanvasKitInit({
            locateFile: (file: string) => `/node_modules/canvaskit-wasm/bin/${file}`,
        })
        skiaRegistry.init(CanvasKit)
    }

    // Создаём Surface если ещё не создан
    if (!surface && skiaCanvas) {
        surface = CanvasKit.MakeWebGLCanvasSurface(skiaCanvas)
        if (!surface) {
            console.error('Failed to create Skia surface')
            return false
        }
    }

    return true
}

// Очистка Skia ресурсов
export const cleanupSkia = () => {
    // Очищаем все зарегистрированные объекты
    skiaRegistry.cleanupAll()

    if (surface) {
        surface.delete()
        surface = null
    }

    if (skiaCanvas && skiaCanvas.parentNode) {
        skiaCanvas.remove()
        skiaCanvas = null
    }

    // CanvasKit нельзя удалить, так как это глобальный объект
}

// Рендер контента на Skia canvas
export const renderSkiaCanvas = async () => {
    // Проверяем инициализацию
    if (!CanvasKit || !surface) {
        const initialized = await initSkia()
        if (!initialized) return
    }

    if (!surface || !CanvasKit) return

    // Получаем canvas из surface
    const canvas = surface.getCanvas()

    // Очищаем canvas (заливаем белым фоном)
    canvas.clear(CanvasKit.WHITE)

    // Отправляем изменения на экран
    surface.flush()
}

export const getGraphicsAndSpritesFlat = (container: PIXI.Container): SkiaRenderable => {
    const result: SkiaRenderable = []

    const traverse = (obj: PIXI.DisplayObject, offsetX: number, offsetY: number) => {
        if (obj instanceof PIXI.Graphics || obj instanceof PIXI.Sprite) {
            result.push({
                pixiObject: obj,
                offset: [offsetX, offsetY],
            })
        }

        if (obj instanceof PIXI.Container && obj.children) {
            const newOffsetX = offsetX + obj.x
            const newOffsetY = offsetY + obj.y

            obj.children.forEach(child => traverse(child, newOffsetX, newOffsetY))
        }
    }

    traverse(container, 0, 0)
    return result
}

// Опционально: ресайз canvas при изменении окна
export const resizeSkiaCanvas = async () => {
    if (!skiaCanvas || !surface || !CanvasKit) return

    const newWidth = window.innerWidth / 2 - 20
    const newHeight = window.innerHeight / 2 - 20

    skiaCanvas.width = newWidth
    skiaCanvas.height = newHeight
    skiaCanvas.style.width = `${newWidth}px`
    skiaCanvas.style.height = `${newHeight}px`

    // Пересоздаём surface с новым размером
    const newSurface = CanvasKit.MakeWebGLCanvasSurface(skiaCanvas)
    if (newSurface) {
        surface.delete()
        surface = newSurface

        // Перерисовываем контент
        await renderSkiaCanvas()
    }
}

// Внешняя функция для глобальной проверки
export const checkSkiaMemoryLeaks = () => {
    const stats = skiaRegistry.checkRemainingObjects()

    console.group('🔍 Skia Memory Leak Check')
    console.log('📊 Total tracked objects:', stats.total)
    console.log('🎨 Paints:', stats.paints)
    console.log('🛤️ Paths:', stats.paths)
    console.log('🔤 Fonts:', stats.fonts)
    console.log('🖼️ Images:', stats.images)
    console.log('💿 Surfaces:', stats.surfaces)
    console.log('❓ Others:', stats.others)

    if (stats.total > 0) {
        console.warn('⚠️ Potential memory leaks detected!')
        console.table(stats.details.map(d => ({ type: d.type })))
    } else {
        console.log('✅ No memory leaks detected')
    }
    console.groupEnd()

    return stats
}

// Функция для принудительной очистки и проверки
export const forceCleanupAndCheck = () => {
    console.log('🧹 Starting forced cleanup...')

    // 1. Очищаем реестр
    const cleanupResult = skiaRegistry.forceCleanupAll()
    console.log(`✅ Deleted: ${cleanupResult.deleted} objects`)
    if (cleanupResult.failed.length > 0) {
        console.warn('❌ Failed to delete:', cleanupResult.failed)
    }

    // 2. Проверяем Surface
    if (surface) {
        try {
            surface.delete()
            surface = null
            console.log('✅ Surface deleted')
        } catch (e) {
            console.error('❌ Failed to delete surface:', e)
        }
    }

    // 3. Проверяем, что осталось в реестре
    const remaining = skiaRegistry.checkRemainingObjects()

    if (remaining.total === 0) {
        console.log('✨ Cleanup complete! No objects remaining.')
    } else {
        console.warn(`⚠️ ${remaining.total} objects still remain after cleanup!`)
        console.table(remaining.details)
    }

    return remaining
}

// Функция для рендеринга Pixi объектов через Skia
export const renderPixiObjectsToSkia = async (pixiObjects: SkiaRenderable) => {
    // Проверяем инициализацию
    if (!CanvasKit || !surface) {
        const initialized = await initSkia()
        if (!initialized) return
    }

    if (!surface || !CanvasKit) return

    // Получаем canvas из surface
    const canvas = surface.getCanvas()

    // Очищаем canvas (заливаем белым фоном)
    canvas.clear(CanvasKit.WHITE)

    // Рендерим каждый объект
    pixiObjects.forEach(data => {
        const { pixiObject, offset } = data
        if (!CanvasKit) {
            return
        }

        if (pixiObject instanceof PIXI.Graphics) {
            renderPixiGraphics(pixiObject, CanvasKit, canvas, offset)
        } else if (pixiObject instanceof PIXI.Sprite) {
            renderPixiSprite(pixiObject, CanvasKit, canvas, offset)
        }
    })

    // Отправляем изменения на экран
    surface.flush()
}

// Рендеринг PIXI.Graphics
function renderPixiGraphics(
    graphics: PIXI.Graphics,
    CanvasKit: CanvasKit,
    canvas: Canvas,
    offset: [number, number]
) {
    // Сохраняем текущее состояние canvas
    canvas.save()

    // Применяем трансформации (позиция, угол, масштаб)
    // todo
    applyTransformations(graphics, canvas, offset)

    // Получаем данные рисования из Graphics
    const graphicsData = graphics.geometry.graphicsData

    graphicsData.forEach(data => {
        const { shape, fillStyle, lineStyle } = data

        // Рисуем заливку
        if (fillStyle && fillStyle.visible && fillStyle.color !== undefined) {
            const fillPaint = createFillPaint(CanvasKit, fillStyle)
            drawShape(shape, canvas, fillPaint, CanvasKit)
            fillPaint.delete()
        }

        // Рисуем обводку
        if (
            lineStyle &&
            lineStyle.visible &&
            lineStyle.color !== undefined &&
            lineStyle.width > 0
        ) {
            const strokePaint = createStrokePaint(CanvasKit, lineStyle)
            drawShape(shape, canvas, strokePaint, CanvasKit)
            strokePaint.delete()
        }
    })

    // Восстанавливаем состояние canvas
    canvas.restore()
}

// Рендеринг PIXI.Sprite
// todo проверить на утечки
function renderPixiSprite(
    sprite: PIXI.Sprite,
    CanvasKit: CanvasKit,
    canvas: Canvas,
    offset: [number, number]
) {
    if (!sprite.texture || !sprite.texture.valid) return

    canvas.save()
    applyTransformations(sprite, canvas, offset)

    // Получаем размеры спрайта
    const width = sprite.width
    const height = sprite.height

    // Вычисляем позицию с учетом anchor
    const x = -sprite.anchor.x * width
    const y = -sprite.anchor.y * height

    // Получаем Image из текстуры PixiJS
    // @ts-ignore TS2339: Property source does not exist on type Resource // хз почему не находит source в Resource
    const imageTexture = sprite.texture.baseTexture.resource?.source

    if (!imageTexture) {
        console.warn('No image source found in texture')
        canvas.restore()
        return
    }

    // Создаем SkImage из HTML Image Element или HTMLImageElement
    let skImage: Image | null = null

    if (
        imageTexture instanceof HTMLImageElement ||
        imageTexture instanceof HTMLVideoElement ||
        imageTexture instanceof ImageBitmap
    ) {
        skImage = CanvasKit.MakeImageFromCanvasImageSource(imageTexture)
    } else if (typeof Image !== 'undefined' && imageTexture instanceof Image) {
        skImage = CanvasKit.MakeImageFromCanvasImageSource(imageTexture)
    } else {
        console.warn('Unsupported image source type')
        canvas.restore()
        return
    }

    if (!skImage) {
        console.warn('Failed to create SkImage')
        canvas.restore()
        return
    }

    // Создаем Paint
    const paint = new CanvasKit.Paint()
    paint.setStyle(CanvasKit.PaintStyle.Fill)

    // Применяем tint (умножение цвета)
    if (sprite.tint !== 0xffffff) {
        // todo проверить tintColor
        // Для tint используем цветовую матрицу или смешивание
        const tintColor = sprite.tint
        console.log('t of', typeof tintColor)
        console.log('t of', tintColor)
        const r = ((Number(tintColor) >> 16) & 0xff) / 255
        const g = ((Number(tintColor) >> 8) & 0xff) / 255
        const b = (Number(tintColor) & 0xff) / 255

        // Устанавливаем цвет для смешивания
        paint.setColor(CanvasKit.Color(r * 255, g * 255, b * 255, 255 * sprite.alpha))
        paint.setBlendMode(CanvasKit.BlendMode.Modulate) // Умножает цвет текстуры на заданный цвет
    } else {
        paint.setColor(CanvasKit.WHITE)
        paint.setAlphaf(sprite.alpha)
    }

    // Рисуем изображение
    // Способ 1: drawImage с указанием позиции и размеров
    canvas.drawImage(skImage, x, y, paint)

    // Или способ 2: с масштабированием
    // const destRect = CanvasKit.XYWHRect(x, y, width, height)
    // canvas.drawImageRect(skImage, destRect, paint)

    // Очищаем ресурсы
    paint.delete()
    skImage.delete()

    canvas.restore()
}

// Применение трансформаций
function applyTransformations(obj: PIXI.DisplayObject, canvas: Canvas, offset: [number, number]) {
    // Перенос (позиция)
    canvas.translate(obj.position.x + offset[0] || 0, obj.position.y + offset[1] || 0)

    // Вращение (угол в радианах)
    if (obj.angle !== 0) {
        canvas.rotate(obj.angle, 0, 0)
        // canvas.rotate((obj.angle * Math.PI) / 180, obj.position.x, obj.position.y)
    }

    // Масштабирование
    if (obj.scale.x !== 1 || obj.scale.y !== 1) {
        canvas.scale(obj.scale.x, obj.scale.y)
    }
}

// Создание Paint для заливки
function createFillPaint(CanvasKit: CanvasKit, fillStyle: any) {
    const paint = new CanvasKit.Paint()
    paint.setStyle(CanvasKit.PaintStyle.Fill)
    paint.setAntiAlias(true)

    // Конвертируем цвет из hex в RGB
    const color = fillStyle.color
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff
    const alpha = fillStyle.alpha !== undefined ? fillStyle.alpha : 1

    paint.setColor(CanvasKit.Color(r, g, b, alpha * 255))

    return paint
}

// Создание Paint для обводки
function createStrokePaint(CanvasKit: CanvasKit, lineStyle: any) {
    const paint = new CanvasKit.Paint()
    paint.setStyle(CanvasKit.PaintStyle.Stroke)
    paint.setAntiAlias(true)
    paint.setStrokeWidth(lineStyle.width)

    // Конвертируем цвет
    const color = lineStyle.color
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff
    const alpha = lineStyle.alpha !== undefined ? lineStyle.alpha : 1

    paint.setColor(CanvasKit.Color(r, g, b, alpha * 255))

    return paint
}

// Рисование различных форм
function drawShape(shape: any, canvas: Canvas, paint: any, CanvasKit: CanvasKit) {
    if (shape.type === PIXI.SHAPES.RECT) {
        // Прямоугольник
        const rect = CanvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height)
        canvas.drawRect(rect, paint)
    } else if (shape.type === PIXI.SHAPES.CIRC) {
        // Круг
        canvas.drawCircle(shape.x, shape.y, shape.radius, paint)
    } else if (shape.type === PIXI.SHAPES.ELIP) {
        // Эллипс
        canvas.save()
        canvas.translate(shape.x, shape.y)
        canvas.scale(1, shape.height / shape.width)
        canvas.drawCircle(0, 0, shape.width, paint)
        canvas.restore()
    } else if (shape.type === PIXI.SHAPES.POLY) {
        // Полигон/линии - используем PathBuilder
        const points = shape.points
        if (points.length >= 4) {
            const pathBuilder = new CanvasKit.PathBuilder()
            pathBuilder.moveTo(points[0], points[1])

            for (let i = 2; i < points.length; i += 2) {
                pathBuilder.lineTo(points[i], points[i + 1])
            }

            pathBuilder.close()
            const path = pathBuilder.detach()
            canvas.drawPath(path, paint)
            path.delete()
        }
    } else if (shape.type === PIXI.SHAPES.RREC) {
        // Скругленный прямоугольник
        const rrect = CanvasKit.RRectXY(
            CanvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height),
            shape.radius,
            shape.radius
        )
        canvas.drawRRect(rrect, paint)
    }
}