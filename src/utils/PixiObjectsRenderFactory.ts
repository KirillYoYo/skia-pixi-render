import type { Canvas, CanvasKit, Image, Paint } from 'canvaskit-wasm'
import * as PIXI from 'pixi.js-legacy'
import { addClickableArea, skiaRegistry } from '@/utils/InitSkia'
import { getPixiAttributes } from '@/utils/skiaHelpers'
import { ClickableArea, PixiObject, PixiTransformAttributes } from '@/types'
import { Sprite } from 'pixi.js-legacy'
// Фабрика по генерации рендер функций для разных обьектов
export class PixiRendererFactory {
    private renderers = new Map<Function, Function>()

    constructor(
        private CanvasKit: CanvasKit,
        private canvas: Canvas
    ) {
        this.registerRenderers()
    }

    private registerRenderers() {
        // Регистрируем рендереры от специфичных к общим
        this.renderers.set(PIXI.Text, (obj: PixiObject, offset: [number, number]) =>
            renderPixiText(obj as PIXI.Text, this.CanvasKit, this.canvas, offset)
        )

        this.renderers.set(PIXI.Graphics, (obj: PixiObject, offset: [number, number]) => {
            const id = crypto.randomUUID()
            renderPixiGraphics(obj as PIXI.Graphics, this.CanvasKit, this.canvas, offset, id)
        })

        this.renderers.set(PIXI.Sprite, (obj: PixiObject, offset: [number, number]) =>
            renderPixiSprite(obj as Sprite, this.CanvasKit, this.canvas, offset)
        )
    }

    render(pixiObject: PixiObject, offset: [number, number]) {
        // Ищем подходящий рендерер
        for (const [Type, renderer] of this.renderers) {
            if (pixiObject instanceof Type) {
                renderer(pixiObject, offset)
                return true
            }
        }

        console.warn('Unknown PIXI object:', pixiObject.constructor.name)
        return false
    }
}

/** Только геометрия Graphics на canvas (без clickableAreas). Для SkPicture. */
export function paintPixiGraphicsOnCanvas(
    graphics: PIXI.Graphics,
    CanvasKit: CanvasKit,
    canvas: Canvas,
    offset: [number, number]
) {
    canvas.save()
    const pixiAttributes = getPixiAttributes(graphics)
    applyTransformations(pixiAttributes, canvas, offset)

    const graphicsData = graphics.geometry.graphicsData
    graphicsData.forEach(data => {
        const { shape, fillStyle, lineStyle } = data

        if (fillStyle && fillStyle.visible && fillStyle.color !== undefined) {
            const fillPaint = skiaRegistry.createFillPaint(fillStyle)
            fillPaint.setAlphaf(fillStyle.alpha)
            drawShape(shape, canvas, fillPaint, CanvasKit)
            skiaRegistry.remove(fillPaint)
        }

        if (
            lineStyle &&
            lineStyle.visible &&
            lineStyle.color !== undefined &&
            lineStyle.width > 0
        ) {
            const strokePaint = skiaRegistry.createStrokePaint(lineStyle)
            strokePaint.setAlphaf(lineStyle.alpha)
            drawShape(shape, canvas, strokePaint, CanvasKit)
            skiaRegistry.remove(strokePaint)
        }
    })

    canvas.restore()
}

// Рендеринг PIXI.Graphics
export function renderPixiGraphics(
    graphics: PIXI.Graphics,
    CanvasKit: CanvasKit,
    canvas: Canvas,
    offset: [number, number],
    id: string
) {
    paintPixiGraphicsOnCanvas(graphics, CanvasKit, canvas, offset)

    const graphicsData = graphics.geometry.graphicsData
    const shapes: ClickableArea['shapes'] = []
    const worldTransform = graphics.transform.worldTransform.clone()

    addClickableArea({
        id: id,
        originalObject: graphics,
        callback: (event: PIXI.FederatedPointerEvent) => {
            graphics.emit('pointerdown', event)
            graphics.emit('pointerup', event)
            console.log(`Clicked on graphics ${id}`)
        },
        worldTransform: worldTransform,
        shapes: shapes,
        localBounds: graphics.getLocalBounds(),
    })
    graphicsData.forEach(data => {
        shapes.push({
            type: data.shape.type,
            data: data.shape,
            fillStyle: data.fillStyle,
            lineStyle: data.lineStyle,
        })
    })
}

// Рендеринг PIXI.Sprite
// todo проверить на утечки
export function renderPixiSprite(
    sprite: PIXI.Sprite,
    CanvasKit: CanvasKit,
    canvas: Canvas,
    offset: [number, number]
) {
    if (!sprite.texture || !sprite.texture.valid) return

    canvas.save()
    const pixiAttributes = getPixiAttributes(sprite)
    applyTransformations(pixiAttributes, canvas, offset)

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
        skImage = skiaRegistry.createImageFromSource(imageTexture)
    } else if (typeof Image !== 'undefined' && imageTexture instanceof Image) {
        skImage = skiaRegistry.createImageFromSource(imageTexture)
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
    const paint = skiaRegistry.createPaint()
    paint.setStyle(CanvasKit.PaintStyle.Fill)

    // Применяем tint (умножение цвета)
    if (sprite.tint !== 0xffffff) {
        // todo проверить tintColor
        // Для tint используем цветовую матрицу или смешивание
        const tintColor = sprite.tint
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

    // Очищаем ресурсы
    skiaRegistry.remove(paint)
    skiaRegistry.remove(skImage)

    canvas.restore()
}

// Применение трансформаций
export function applyTransformations(
    obj: PixiTransformAttributes,
    canvas: Canvas,
    offset: [number, number]
) {
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

// Рисование различных форм
export function drawShape(shape: PIXI.IShape, canvas: Canvas, paint: Paint, CanvasKit: CanvasKit) {
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
            const path = skiaRegistry.createPathFromPoints(points, CanvasKit)

            canvas.drawPath(path, paint)
            skiaRegistry.remove(path)
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

// Обычный текст
export function renderPixiText(
    textObj: PIXI.Text,
    CanvasKit: CanvasKit,
    canvas: Canvas,
    offset: [number, number]
) {
    canvas.save()

    // Используем прямые координаты
    const x = textObj.x + offset[0]
    const y = textObj.y + offset[1]

    // Создаем canvas для текста
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')!

    const style = textObj.style
    const fontSize = style.fontSize || 24
    const fontFamily = style.fontFamily || 'Arial'
    const text = textObj.text || ''

    ctx.font = `${fontSize}px ${fontFamily}`

    let r = 0,
        g = 0,
        b = 0

    if (typeof style.fill === 'number') {
        // Число (0xff1010)
        r = (style.fill >> 16) & 0xff
        g = (style.fill >> 8) & 0xff
        b = style.fill & 0xff
    } else if (typeof style.fill === 'string') {
        // Строка '#ff1010'
        const hex = style.fill.startsWith('#') ? style.fill.slice(1) : style.fill
        r = parseInt(hex.substring(0, 2), 16)
        g = parseInt(hex.substring(2, 4), 16)
        b = parseInt(hex.substring(4, 6), 16)
    } else if (typeof style.fill === 'object' && style.fill !== null) {
        // Объект { r, g, b }
        // @ts-ignore
        r = Math.round((style.fill.r || 0) * 255)
        // @ts-ignore
        g = Math.round((style.fill.g || 0) * 255)
        // @ts-ignore
        b = Math.round((style.fill.b || 0) * 255)
    }

    // Измеряем текст
    const metrics = ctx.measureText(text)
    const textWidth = Math.ceil(metrics.width) || 100
    const textHeight = Number(fontSize)

    tempCanvas.width = textWidth
    tempCanvas.height = textHeight

    // Рисуем текст
    const newCtx = tempCanvas.getContext('2d')!
    newCtx.font = `${fontSize}px ${fontFamily}`
    newCtx.fillStyle = `rgb(${r}, ${g}, ${b})`
    newCtx.fillText(text, 0, Number(fontSize))

    // Создаем SkImage
    const skImage = skiaRegistry.createImageFromSource(tempCanvas)

    if (skImage) {
        const paint = skiaRegistry.createPaint()
        paint.setStyle(CanvasKit.PaintStyle.Fill)

        canvas.drawImage(skImage, x, y - 2, paint)

        skiaRegistry.remove(paint)
        skiaRegistry.remove(skImage)
    }

    canvas.restore()
}