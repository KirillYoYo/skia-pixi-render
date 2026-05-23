import { CanvasKit } from 'canvaskit-wasm'

export class CanvasKitRegistry {
    private registry: Set<any> = new Set()
    private CanvasKit: CanvasKit | null = null

    init(CK: CanvasKit) {
        this.CanvasKit = CK
    }

    createPaint(): any {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')
        const paint = new this.CanvasKit.Paint()
        this.registry.add(paint)
        return paint
    }

    createRect(x: number, y: number, width: number, height: number): any {
        if (!this.CanvasKit) throw new Error('CanvasKit not initialized')
        const rect = this.CanvasKit.XYWHRect(x, y, width, height)
        // this.registry.add(rect) не добавляем потому что rect это массив (Float32Array)
        return rect
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

            // Способ 4: для объектов Gb (ваш случай)
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
}