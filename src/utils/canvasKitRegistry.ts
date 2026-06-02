import { CanvasKit, Paint, Path, Rect } from 'canvaskit-wasm'
import * as PIXI from 'pixi.js-legacy'

export class CanvasKitRegistry implements ICanvasKitRegistry {
    private registry: Set<any> = new Set()
    private CanvasKit: CanvasKit | null = null
    private static instance: CanvasKitRegistry | null = null

    init(CK: CanvasKit) {
        this.CanvasKit = CK
    }

    createPaint(): Paint {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')
        const paint = new this.CanvasKit.Paint()
        this.registry.add(paint)
        return paint
    }

    createPathFromPoints(points: number[], CanvasKit: any): Path {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')
        if (points.length < 4) throw new Error('Need at least 2 points (4 coordinates)')

        // ✅ Используем this.CanvasKit, а не переданный!
        const pathBuilder = new this.CanvasKit.PathBuilder()
        pathBuilder.moveTo(points[0], points[1])

        for (let i = 2; i < points.length; i += 2) {
            pathBuilder.lineTo(points[i], points[i + 1])
        }

        const path = pathBuilder.detach()
        this.registry.add(path)
        return path
    }

    createImageFromSource(
        source: HTMLImageElement | HTMLVideoElement | ImageBitmap | HTMLCanvasElement
    ): any | null {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')

        const skImage = this.CanvasKit.MakeImageFromCanvasImageSource(source)

        if (skImage) {
            this.registry.add(skImage)
        }

        return skImage
    }

    createRect(x: number, y: number, width: number, height: number): Rect {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')
        const rect = this.CanvasKit.XYWHRect(x, y, width, height)
        this.registry.add(rect)
        return rect
    }

    // Создание Paint для заливки
    createFillPaint(fillStyle: PIXI.FillStyle): Paint {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')

        const paint = new this.CanvasKit.Paint()
        paint.setStyle(this.CanvasKit.PaintStyle.Fill)
        paint.setAntiAlias(true)

        // Конвертируем цвет из hex в RGB
        const color = fillStyle.color
        const r = (color >> 16) & 0xff
        const g = (color >> 8) & 0xff
        const b = color & 0xff
        const alpha = fillStyle.alpha !== undefined ? fillStyle.alpha : 1

        paint.setColor(this.CanvasKit.Color(r, g, b, alpha * 255))

        this.registry.add(paint)
        return paint
    }

    // Создание Paint для обводки
    createStrokePaint(lineStyle: PIXI.LineStyle): Paint {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')

        const paint = new this.CanvasKit.Paint()
        paint.setStyle(this.CanvasKit.PaintStyle.Stroke)
        paint.setAntiAlias(true)
        paint.setStrokeWidth(lineStyle.width)

        // Конвертируем цвет
        const color = lineStyle.color
        const r = (color >> 16) & 0xff
        const g = (color >> 8) & 0xff
        const b = color & 0xff
        const alpha = lineStyle.alpha !== undefined ? lineStyle.alpha : 1

        paint.setColor(this.CanvasKit.Color(r, g, b, alpha * 255))

        this.registry.add(paint)
        return paint
    }

    cleanupAll() {
        this.registry.forEach(obj => {
            if (obj && typeof obj.delete === 'function') {
                obj.delete()
            }
        })
        this.registry.clear()
    }

    remove(obj: any) {
        if (this.registry.has(obj)) {
            this.deleteObject(obj)
            this.registry.delete(obj)
        }
    }

    forceCleanupAll(): { deleted: number; failed: string[] } {
        const result = { deleted: 0, failed: [] as string[] }

        this.registry.forEach(obj => {
            try {
                if (obj && typeof obj.delete === 'function') {
                    obj.delete()
                    result.deleted++
                } else {
                    result.failed.push(`Object without delete method: ${obj?.constructor?.name}`)
                }
            } catch (e) {
                result.failed.push(`Error deleting ${obj?.constructor?.name}: ${e}`)
            }
        })

        this.registry.clear()
        return result
    }

    checkRemainingObjects(): {
        total: number
        paints: number
        paths: number
        fonts: number
        images: number
        surfaces: number
        others: number
        details: any[]
    } {
        const result = {
            total: 0,
            paints: 0,
            paths: 0,
            fonts: 0,
            images: 0,
            surfaces: 0,
            others: 0,
            details: [] as any[],
        }

        this.registry.forEach(obj => {
            result.total++

            // Определяем тип объекта
            const constructorName = obj.constructor?.name || 'Unknown'
            console.log('constructorName', constructorName)
            const details = { type: constructorName, obj }

            switch (constructorName) {
                case 'Gb': // Paint в некоторых версиях CanvasKit
                case 'Paint':
                    result.paints++
                    break
                case 'Path':
                    result.paths++
                    break
                case 'Font':
                    result.fonts++
                    break
                case 'Image':
                    result.images++
                    break
                case 'Surface':
                    result.surfaces++
                    break
                default:
                    result.others++
                    // Дополнительная проверка по методам
                    if (typeof obj.delete === 'function') {
                        if (obj.setColor) result.paints++
                        else if (obj.moveTo) result.paths++
                        else result.others++
                    }
            }

            result.details.push(details)
        })

        return result
    }

    private deleteObject(obj: any): boolean {
        if (!obj) return false

        // Пробуем разные способы удаления
        try {
            // Способ 1: прямой delete (если есть)
            if (typeof obj.delete === 'function') {
                obj.delete()
                return true
            }

            // Способ 2: может быть delete внутри _delete или других свойств
            if (obj._delete && typeof obj._delete === 'function') {
                obj._delete()
                return true
            }

            // Способ 3: ищем delete в прототипе
            if (obj.__proto__ && typeof obj.__proto__.delete === 'function') {
                obj.__proto__.delete.call(obj)
                return true
            }

            // Способ 4: для объектов Gb
            // Пытаемся найти delete во внутренних свойствах (Fd, Qd и т.д.)
            for (const key in obj) {
                const prop = obj[key]
                if (prop && typeof prop === 'object' && typeof prop.delete === 'function') {
                    prop.delete()
                    return true
                }
            }

            console.warn('Cannot find delete method for object:', obj)
            return false
        } catch (e) {
            console.error('Error deleting object:', e)
            return false
        }
    }

    static getInstance(): CanvasKitRegistry {
        if (!CanvasKitRegistry.instance) {
            CanvasKitRegistry.instance = new CanvasKitRegistry()
        }
        return CanvasKitRegistry.instance
    }
}

export interface ICanvasKitRegistry {
    /**
     * Инициализация реестра с экземпляром CanvasKit
     * @param CK - экземпляр CanvasKit
     */
    init(CK: CanvasKit): void

    /**
     * Создание обычного Paint объекта
     * @returns Paint объект
     */
    createPaint(): Paint

    /**
     * Создание прямоугольника
     * @param x - координата X
     * @param y - координата Y
     * @param width - ширина
     * @param height - высота
     * @returns Rect объект (Float32Array)
     */
    createRect(x: number, y: number, width: number, height: number): Rect

    /**
     * Создание Paint для заливки
     * @param fillStyle - стиль заливки
     * @returns Paint объект
     */
    createFillPaint(fillStyle: { color: number; alpha?: number }): Paint

    /**
     * Создание Paint для обводки
     * @param lineStyle - стиль линии
     * @returns Paint объект
     */
    createStrokePaint(lineStyle: { color: number; width: number; alpha?: number }): Paint

    /**
     * Очистка всех зарегистрированных объектов
     */
    cleanupAll(): void

    /**
     * Удаление конкретного объекта из реестра
     * @param obj - объект для удаления
     */
    remove(obj: any): void

    /**
     * Принудительная очистка всех объектов с отчетом
     * @returns Статистика удаления
     */
    forceCleanupAll(): {
        deleted: number
        failed: string[]
    }

    /**
     * Проверка оставшихся объектов в реестре
     * @returns Статистика по типам объектов
     */
    checkRemainingObjects(): {
        total: number
        paints: number
        paths: number
        fonts: number
        images: number
        surfaces: number
        others: number
        details: Array<{
            type: string
            obj: any
        }>
    }

    /**
     * Принудительная очистка с подробной проверкой
     * @returns Полная статистика очистки
     */
    forceCleanupAndCheck?(): {
        deleted: number
        failed: string[]
        remaining: {
            total: number
            paints: number
            paths: number
            fonts: number
            images: number
            surfaces: number
            others: number
            details: Array<{
                type: string
                obj: any
            }>
        }
    }
}