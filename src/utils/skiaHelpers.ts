import * as PIXI from 'pixi.js-legacy'
import { Sprite } from 'pixi.js-legacy'
import { PixiTransformAttributes } from '@/types'
import { ICanvasKitRegistry } from '@/utils/canvasKitRegistry'

export const globalToLocal = (
    globalX: number,
    globalY: number,
    worldTransform: PIXI.Matrix,
    offset: [number, number]
): PIXI.Point => {
    // Создаем обратную матрицу трансформации
    const inverseTransform = worldTransform.clone().invert()

    // Преобразуем точку с учетом offset
    const point = inverseTransform.apply({
        x: globalX - offset[0],
        y: globalY - offset[1],
    })

    return new PIXI.Point(point.x, point.y)
}

// Проверка попадания точки в форму (в локальных координатах объекта)
export const pointInShape = (localPoint: PIXI.Point, shape: PIXI.IShape): boolean => {
    switch (shape.type) {
        case PIXI.SHAPES.RECT:
            return (
                localPoint.x >= shape.x &&
                localPoint.x <= shape.x + shape.width &&
                localPoint.y >= shape.y &&
                localPoint.y <= shape.y + shape.height
            )

        case PIXI.SHAPES.CIRC:
            const dx = localPoint.x - shape.x
            const dy = localPoint.y - shape.y
            return dx * dx + dy * dy <= shape.radius * shape.radius

        case PIXI.SHAPES.ELIP:
            // Для эллипса нормализуем координаты
            const nx = (localPoint.x - shape.x) / shape.width
            const ny = (localPoint.y - shape.y) / shape.height
            return nx * nx + ny * ny <= 1

        case PIXI.SHAPES.POLY:
            return pointInPolygon(localPoint, shape.points)

        case PIXI.SHAPES.RREC:
            return pointInRRect(localPoint, shape)

        default:
            return false
    }
}

// Проверка попадания в полигон (алгоритм ray casting)
export const pointInPolygon = (point: PIXI.Point, vertices: number[]): boolean => {
    let inside = false
    for (let i = 0, j = vertices.length - 2; i < vertices.length; i += 2) {
        const xi = vertices[i],
            yi = vertices[i + 1]
        const xj = vertices[j],
            yj = vertices[j + 1]

        const intersect =
            yi > point.y != yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

        if (intersect) inside = !inside
        j = i
    }
    return inside
}

export const pointInRRect = (
    point: PIXI.Point,
    rrect: any // shape.type === PIXI.SHAPES.RREC
): boolean => {
    const { x, y, width, height, radius } = rrect

    // Быстрая проверка: если точка вне bounding box
    if (point.x < x || point.x > x + width || point.y < y || point.y > y + height) {
        return false
    }

    // Проверяем углы (где есть скругления)
    const radiusX = Math.min(radius, width / 2)
    const radiusY = Math.min(radius, height / 2)

    // Левый верхний угол
    if (point.x < x + radiusX && point.y < y + radiusY) {
        const dx = point.x - (x + radiusX)
        const dy = point.y - (y + radiusY)
        return dx * dx + dy * dy <= radiusX * radiusY
    }

    // Правый верхний угол
    if (point.x > x + width - radiusX && point.y < y + radiusY) {
        const dx = point.x - (x + width - radiusX)
        const dy = point.y - (y + radiusY)
        return dx * dx + dy * dy <= radiusX * radiusY
    }

    // Левый нижний угол
    if (point.x < x + radiusX && point.y > y + height - radiusY) {
        const dx = point.x - (x + radiusX)
        const dy = point.y - (y + height - radiusY)
        return dx * dx + dy * dy <= radiusX * radiusY
    }

    // Правый нижний угол
    if (point.x > x + width - radiusX && point.y > y + height - radiusY) {
        const dx = point.x - (x + width - radiusX)
        const dy = point.y - (y + height - radiusY)
        return dx * dx + dy * dy <= radiusX * radiusY
    }

    // Если точка не в углах - она внутри
    return true
}

// Получить доступные аттрибуты
export const getPixiAttributes = (graphics: PIXI.Graphics | Sprite): PixiTransformAttributes => ({
    position: graphics.position,
    angle: graphics.angle,
    scale: graphics.scale,
})

// Внешняя функция для глобальной проверки
export const checkSkiaMemoryLeaks = (skiaRegistry: ICanvasKitRegistry) => {
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