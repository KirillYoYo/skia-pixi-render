import CanvasKitInit, { CanvasKit, Surface, Canvas } from 'canvaskit-wasm'
import { CanvasKitRegistry } from '@/utils/canvasKitRegistry'

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

    // Рисуем простые объекты
    drawSimpleObjects(CanvasKit, canvas)

    // Отправляем изменения на экран
    surface.flush()
}

// Функция для рисования простых объектов
function drawSimpleObjects(CanvasKit: CanvasKit, canvas: Canvas) {
    // 1. Рисуем красный квадрат
    const redPaint = skiaRegistry.createPaint()
    redPaint.setColor(CanvasKit.RED)
    redPaint.setAntiAlias(true)
    redPaint.setStyle(CanvasKit.PaintStyle.Fill)

    // Квадрат: x=50, y=50, width=150, height=150
    const rect = skiaRegistry.createRect(50, 50, 150, 150)
    canvas.drawRect(rect, redPaint)

    // 2. Рисуем синий круг
    const bluePaint = skiaRegistry.createPaint()
    bluePaint.setColor(CanvasKit.BLUE)
    bluePaint.setAntiAlias(true)
    bluePaint.setStyle(CanvasKit.PaintStyle.Fill)

    // Круг: центр (300, 125), радиус 75
    canvas.drawCircle(300, 125, 75, bluePaint)

    // 3. Рисуем жёлтую рамку вокруг квадрата (обводка)
    const yellowPaint = skiaRegistry.createPaint()
    yellowPaint.setColor(CanvasKit.Color(255, 255, 0, 255)) // Жёлтый
    yellowPaint.setAntiAlias(true)
    yellowPaint.setStyle(CanvasKit.PaintStyle.Stroke)
    yellowPaint.setStrokeWidth(5)

    canvas.drawRect(rect, yellowPaint)

    // Удаляем созданные объекты из реестра
    skiaRegistry.remove(redPaint)
    skiaRegistry.remove(bluePaint)
    skiaRegistry.remove(yellowPaint)
    skiaRegistry.remove(rect)
    checkSkiaMemoryLeaks()
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