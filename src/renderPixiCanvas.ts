import * as PIXI from 'pixi.js-legacy'
import { getGraphicsAndSpritesFlat, renderPixiObjectsToSkia } from '@/renderSkiaCanvas'

// 1) Создаём Application и указываем, чтобы canvas помещался в наш div
const app = new PIXI.Application({
    width: window.innerWidth / 2 - 20,
    height: window.innerHeight / 2 - 20,
    backgroundColor: 0xffffff,
    forceCanvas: true,
})

export const renderCanvases = async (pixiContainer: PIXI.Container) => {
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