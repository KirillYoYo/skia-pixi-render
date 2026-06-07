import type { CanvasKit } from 'canvaskit-wasm'
import * as PIXI from 'pixi.js-legacy'
import { SkiaRenderable } from '@/types'
import { checkSkiaMemoryLeaks } from '@/utils/skiaHelpers'

import {
    skiaRegistry,
    initSkia,
    cleanupSkia,
    getSurface,
    getCanvasKit,
    getSkiaCanvas,
    setLastSkiaPicture,
    clearClickableAreas,
    getLastSkiaPicture,
} from './utils/InitSkia'
import {
    paintPixiGraphicsOnCanvas,
    PixiRendererFactory,
    renderPixiSprite,
} from '@/utils/PixiObjectsRenderFactory'

let rendererFactoryInstance

// получаем плоский список контейнеров пикси
const getGraphicsAndSpritesFlat = (container: PIXI.Container): SkiaRenderable => {
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

// Функция для рендеринга Pixi объектов через Skia
const renderPixiObjectsToSkia = async (pixiObjects: SkiaRenderable) => {
    // очищаем Skia графику
    cleanupSkia()
    // проверяем на утечки
    checkSkiaMemoryLeaks(skiaRegistry)
    // Проверяем инициализацию
    const initialized = await initSkia()
    if (!initialized) {
        return
    }
    const surface = getSurface()
    const CanvasKit = getCanvasKit()

    if (!CanvasKit || !surface) return

    // Получаем canvas из surface
    const canvas = surface.getCanvas()

    // Очищаем canvas (заливаем белым фоном)
    canvas.clear(CanvasKit.WHITE)

    clearClickableAreas()

    const rendererFactory = rendererFactoryInstance
        ? rendererFactoryInstance
        : new PixiRendererFactory(CanvasKit, canvas)

    pixiObjects.forEach(({ pixiObject, offset }) => {
        rendererFactory.render(pixiObject, offset)
    })

    // Отправляем изменения на экран
    surface.flush()

    recordSkiaPicture(pixiObjects)
}

/** PDF из lastSkiaPicture (запись после renderPixiObjectsToSkia). */
const exportSkiaCanvasToPdf = async (filename = 'skia-export.pdf') => {
    const CanvasKit = getCanvasKit()
    const skiaCanvas = getSkiaCanvas()
    let lastSkiaPicture = getLastSkiaPicture()
    if (!CanvasKit || !skiaCanvas) {
        const ok = await initSkia()
        if (!ok || !CanvasKit || !skiaCanvas) {
            return
        }
    }

    if (!lastSkiaPicture) {
        console.warn('Нет SkPicture — сначала вызовите renderPixiObjectsToSkia')
        return
    }

    if (!CanvasKit!.PdfDocument) {
        console.error('PdfDocument нет — нужен libs/canvaskit.js с skia_enable_pdf')
        return
    }

    const w = skiaCanvas!.width
    const h = skiaCanvas!.height
    const pdf = new CanvasKit!.PdfDocument!('export')
    const pdfCanvas = pdf.beginPage(w, h)
    pdfCanvas.drawPicture(lastSkiaPicture)
    pdf.endPage()
    const bytes = pdf.close()
    pdf.delete()

    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
function recordSkiaPicture(pixiObjects: SkiaRenderable) {
    const CanvasKit = getCanvasKit()
    const skiaCanvas = getSkiaCanvas()
    if (!CanvasKit || !skiaCanvas) {
        return
    }

    const w = skiaCanvas.width
    const h = skiaCanvas.height
    const recorder = new CanvasKit.PictureRecorder()
    const recordCanvas = recorder.beginRecording(CanvasKit.XYWHRect(0, 0, w, h))

    recordCanvas.clear(CanvasKit.WHITE)

    const rendererFactory = new PixiRendererFactory(CanvasKit as CanvasKit, recordCanvas)

    pixiObjects.forEach(({ pixiObject, offset }) => {
        rendererFactory.render(pixiObject, offset)
    })

    const picture = recorder.finishRecordingAsPicture()
    recorder.delete()

    getLastSkiaPicture()?.delete()
    setLastSkiaPicture(picture)
}

/**/
export { exportSkiaCanvasToPdf, getGraphicsAndSpritesFlat, renderPixiObjectsToSkia }