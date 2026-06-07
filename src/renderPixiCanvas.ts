import * as PIXI from 'pixi.js-legacy'
import { getGraphicsAndSpritesFlat, renderPixiObjectsToSkia } from '@/renderSkiaCanvas'

export const canvasWidth = window.innerWidth / 1.5 - 20
export const canvasHeight = window.innerHeight / 2 - 20

// 1) Создаём Application и указываем, чтобы canvas помещался в наш div
const app = new PIXI.Application({
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: 0xffffff,
    forceCanvas: true,
})

export const renderCanvases = async (pixiContainer: PIXI.Container) => {
    const loadingDom = document.querySelector('#loading') as HTMLElement | undefined
    if (loadingDom) {
        loadingDom.style.display = 'block'
    }
    app.stage.removeChildren()
    app.stage.addChild(pixiContainer)

    app.renderer.render(app.stage)
    const waitForRender = (): Promise<void> => {
        return new Promise(resolve => {
            requestAnimationFrame(() => resolve())
        })
    }
    /**
     * ждем рендер пикси чтобы получить правильные Path (PIXI.SHAPES.POLY)
     * **/
    await waitForRender()
    if (loadingDom) {
        loadingDom.style.display = 'none'
    }
    renderPixiObjectsToSkia(getGraphicsAndSpritesFlat(pixiContainer))
}

export function initPixiCanvas() {
    const container = document.getElementById('pixi-canvas')

    if (container) {
        // Очищаем контейнер перед добавлением (чтобы не было дублирования)
        if (container.contains(app.view as unknown as Node)) {
            return
        }
        // Pixi сам создаст canvas; мы его вставляем в div
        container.appendChild(app.view as unknown as Node)
    }
}