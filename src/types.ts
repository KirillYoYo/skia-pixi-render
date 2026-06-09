import * as PIXI from 'pixi.js-legacy'
import { Canvas } from 'canvaskit-wasm'

export type PixiObject = PIXI.Graphics | PIXI.Sprite | PIXI.Text

export type SkiaRenderable = Array<{
    pixiObject: PixiObject
    offset: [number, number]
}>

export interface PixiTransformAttributes {
    angle: number
    scale: PIXI.ObservablePoint<any>
    position: PIXI.ObservablePoint<any>
    alpha?: number
}

/** Минимальная типизация PdfDocument (libs/canvaskit с skia_enable_pdf). */
export interface PdfDocumentLike {
    beginPage(width: number, height: number): Canvas
    endPage(): void
    close(): Uint8Array
    delete(): void
}

export interface ClickableArea {
    id: string
    originalObject: PIXI.DisplayObject
    callback: (event: PIXI.FederatedPointerEvent) => void
    // Сохраняем мировую трансформацию объекта
    worldTransform: PIXI.Matrix
    // Сохраняем все геометрические данные фигуры
    shapes: Array<{
        type: number
        data: any // данные формы (rect, circle, poly и т.д.)
        fillStyle: PIXI.FillStyle
        lineStyle: PIXI.LineStyle
    }>
    // Сохраняем локальные границы для быстрого отсечения
    localBounds: PIXI.Rectangle
}