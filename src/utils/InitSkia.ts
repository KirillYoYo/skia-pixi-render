// skiaContext.ts
import type { CanvasKit, SkPicture, Surface } from 'canvaskit-wasm'
import { ClickableArea, PdfDocumentLike } from '@/types'
import { CanvasKitRegistry } from '@/utils/canvasKitRegistry'
import { getCanvasKitWasmUrl, loadCanvasKitInit } from '@/utils/loadCanvasKit'
import { globalToLocal, pointInShape } from '@/utils/skiaHelpers'
import * as PIXI from 'pixi.js-legacy'

// Глобальные переменные (как у вас, но в отдельном файле)
let surface: Surface | null = null
let CanvasKit: (CanvasKit & { PdfDocument?: new (title?: string) => PdfDocumentLike }) | null = null
let skiaCanvas: HTMLCanvasElement | null = null
let lastSkiaPicture: SkPicture | null = null

export const skiaRegistry = CanvasKitRegistry.getInstance()

// Параметры canvas
const canvasWidth = window.innerWidth / 2 - 20
const canvasHeight = window.innerHeight / 2 - 20

// Глобальный массив кликабельных областей
export const clickableAreas: ClickableArea[] = []

// Инициализация Skia
export const initSkia = async () => {
    const container = document.getElementById('skia-canvas')
    if (!container) {
        console.error('Container #skia-canvas not found')
        return false
    }

    if (!skiaCanvas) {
        skiaCanvas = document.createElement('canvas')
        skiaCanvas.width = canvasWidth
        skiaCanvas.height = canvasHeight
        skiaCanvas.style.width = `${canvasWidth}px`
        skiaCanvas.style.height = `${canvasHeight}px`
        skiaCanvas.style.border = '1px solid #ccc'

        if (skiaCanvas.parentNode) {
            skiaCanvas.remove()
        }
        container.appendChild(skiaCanvas)

        skiaCanvas.onclick = e => {
            const rect = skiaCanvas!.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            handleClick(x, y)
        }
    }

    if (!CanvasKit) {
        const CanvasKitInit = await loadCanvasKitInit()
        const wasmUrl = getCanvasKitWasmUrl()
        CanvasKit = await CanvasKitInit({
            locateFile: (file: string) => (file.endsWith('.wasm') ? wasmUrl : wasmUrl),
        })
        skiaRegistry.init(CanvasKit)
    }

    if (!surface && skiaCanvas) {
        surface = CanvasKit.MakeWebGLCanvasSurface(skiaCanvas)
        if (!surface) {
            console.error('Failed to create Skia surface')
            return false
        }
    }

    return true
}

// Обработчик кликов
const handleClick = (x: number, y: number) => {
    for (let i = clickableAreas.length - 1; i >= 0; i--) {
        const area = clickableAreas[i]

        if (area.localBounds) {
            const localPoint = globalToLocal(x, y, area.worldTransform, [0, 0])
            if (
                localPoint.x < area.localBounds.x ||
                localPoint.x > area.localBounds.x + area.localBounds.width ||
                localPoint.y < area.localBounds.y ||
                localPoint.y > area.localBounds.y + area.localBounds.height
            ) {
                continue
            }
        }

        for (const shape of area.shapes) {
            const localPoint = globalToLocal(x, y, area.worldTransform, [0, 0])
            if (pointInShape(localPoint, shape.data)) {
                // @ts-ignore need EventBoundary argument
                const event = new PIXI.FederatedPointerEvent()
                area.callback(event)
                return
            }
        }
    }
}

// Очистка
export const cleanupSkia = () => {
    skiaRegistry.cleanupAll()

    if (lastSkiaPicture) {
        lastSkiaPicture.delete()
        lastSkiaPicture = null
    }

    if (surface) {
        surface.delete()
        surface = null
    }

    if (skiaCanvas && skiaCanvas.parentNode) {
        skiaCanvas.remove()
        skiaCanvas = null
    }
}

// Геттеры для доступа (опционально, для контроля)
export const getSurface = () => surface
export const getCanvasKit = () => CanvasKit
export const getSkiaCanvas = () => skiaCanvas
export const getLastSkiaPicture = () => lastSkiaPicture
export const setLastSkiaPicture = (picture: SkPicture | null) => {
    if (lastSkiaPicture && lastSkiaPicture !== picture) {
        lastSkiaPicture.delete()
    }
    lastSkiaPicture = picture
}

// Функции для работы с clickableAreas
export const clearClickableAreas = () => {
    clickableAreas.length = 0
}

export const addClickableArea = (area: ClickableArea) => {
    clickableAreas.push(area)
}